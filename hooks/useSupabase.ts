import { useState, useEffect, useRef } from 'react';
import { SupabaseService, BaseEntity } from '../services/supabaseService';
import { supabase } from '../supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Custom hook to synchronize a local state array with a Supabase table.
 * @param tableName The name of the table in Supabase (must be created with schema.sql structure).
 * @param initialData Fallback data to use if DB is empty or while loading (optional).
 * @param options Configuration options.
 */
export function useSupabaseCollection<T extends BaseEntity>(
    tableName: string,
    initialData: T[] = [],
    options: { enableAutoSync?: boolean } = { enableAutoSync: true }
) {
    const [data, setData] = useState<T[]>(initialData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SAVED' | 'ERROR'>('IDLE');

    // Use a ref to access the latest state inside the subscription callback without re-binding
    const dataRef = useRef(data);

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    useEffect(() => {
        let channel: RealtimeChannel | null = null;
        let isMounted = true;

        const fetchData = async () => {
            setLoading(true);
            const result = await SupabaseService.getAll<T>(tableName);

            if (result.error) {
                if (isMounted) setError(result.error);
                // PGRST204 code means table schema is probably wrong (missing 'data' column)
                if (result.error.code === 'PGRST204' || result.error.message?.includes('data')) {
                    console.error('CRITICAL SCHEMA ERROR: Table', tableName, 'does not have "data" column.');
                }
            } else {
                if (isMounted) {
                    if (result.data && result.data.length > 0) {
                        setData(result.data);
                    }
                }
            }
            if (isMounted) setLoading(false);

            // Setup Subscription
            channel = SupabaseService.subscribe<T>(
                tableName,
                (newData) => {
                    if (isMounted) setData(newData);
                },
                () => dataRef.current // callback to get current state
            );
        };

        fetchData();

        return () => {
            isMounted = false;
            if (channel) supabase.removeChannel(channel);
        };
    }, [tableName]);

    const addItem = async (item: T) => {
        setSyncStatus('SYNCING');
        // Optimistic UI
        setData(prev => [...prev, item]);

        if (options.enableAutoSync === false) {
            setSyncStatus('IDLE');
            return;
        }

        const { error } = await SupabaseService.upsert(tableName, item);
        if (error) {
            setError(error);
            setSyncStatus('ERROR');
        } else {
            setSyncStatus('SAVED');
            setTimeout(() => setSyncStatus('IDLE'), 2000);
        }
    };

    const updateItem = async (item: T) => {
        setSyncStatus('SYNCING');
        // Optimistic UI
        setData(prev => prev.map(i => i.id === item.id ? item : i));

        if (options.enableAutoSync === false) {
            setSyncStatus('IDLE');
            return;
        }

        const { error } = await SupabaseService.upsert(tableName, item);
        if (error) {
            setError(error);
            setSyncStatus('ERROR');
        } else {
            setSyncStatus('SAVED');
            setTimeout(() => setSyncStatus('IDLE'), 2000);
        }
    };

    const deleteItem = async (id: string) => {
        setSyncStatus('SYNCING');
        // Optimistic UI
        setData(prev => prev.filter(i => i.id !== id));

        if (options.enableAutoSync === false) {
            setSyncStatus('IDLE');
            return;
        }

        const { error } = await SupabaseService.delete(tableName, id);
        if (error) {
            setError(error);
            setSyncStatus('ERROR');
        } else {
            setSyncStatus('SAVED');
            setTimeout(() => setSyncStatus('IDLE'), 2000);
        }
    };

    // "Smart" setter that detects changes and syncs to Supabase.
    // This maintains compatibility with existing code that uses setEmployees([...etc]).
    const setWithSync = async (newValOrFn: T[] | ((prev: T[]) => T[])) => {
        // 1. Calculate new state
        let newData: T[];
        if (typeof newValOrFn === 'function') {
            newData = (newValOrFn as Function)(dataRef.current) as T[];
        } else {
            newData = newValOrFn;
        }

        // 2. Update local state immediately (Optimistic)
        setData(newData);

        // IF SYNC IS DISABLED, STOP HERE
        if (options.enableAutoSync === false) {
            return;
        }

        setSyncStatus('SYNCING');

        // 3. Diff and Sync
        // We need to compare existing DB state (dataRef.current) vs New State (newData)
        const oldIds = new Set(dataRef.current.map(d => d.id));
        const newIds = new Set(newData.map(d => d.id));

        // 3.1 Identify deletions (In Old but NOT in New)
        const toDelete = dataRef.current.filter(d => !newIds.has(d.id));

        // 3.2 Identify upserts (New OR Updated)
        // Optimization: Only upsert items that have actually changed to reduce payload size.
        // This is critical because some entities (Employees) have Base64 images.
        const toUpsert = newData.filter(newItem => {
            const oldItem = dataRef.current.find(d => d.id === newItem.id);
            // If New (not in old), upsert it.
            if (!oldItem) return true;
            // If Updated (content different), upsert it.
            return JSON.stringify(newItem) !== JSON.stringify(oldItem);
        });

        // Execute Sync
        let hasError = false;

        if (toDelete.length > 0) {
            const idsToDelete = toDelete.map(d => d.id);
            // Supabase delete strictly matches id column
            const { error } = await supabase.from(tableName).delete().in('id', idsToDelete);
            if (error) {
                console.error(`Error deleting from ${tableName}:`, error);
                setError(error);
                hasError = true;
            }
        }

        if (toUpsert.length > 0) {
            // Note: We use raw supabase here to perform bulk update which Service doesn't support yet
            const dbRows = toUpsert.map(item => {
                const { id, ...rest } = item;
                // For 'generic' collections, we likely rely on 'data' column.
                // But for flat tables, this fails. 
                // Since this section is only reachable if enableAutoSync is true,
                // we assume generic behavior is desired for those.
                return {
                    id: id,
                    data: rest,
                    updated_at: new Date().toISOString()
                };
            });

            const { error } = await supabase.from(tableName).upsert(dbRows);
            if (error) {
                console.error(`Error syncing (upsert) to ${tableName}:`, error);
                setError(error);
                hasError = true;
            }
        }

        if (toDelete.length === 0 && toUpsert.length === 0) {
            // Nothing changed
            setSyncStatus('IDLE');
        } else {
            setSyncStatus(hasError ? 'ERROR' : 'SAVED');
            if (hasError) {
                alert(`Error al guardar en ${tableName}. Ver consola para detalles.`);
            }
            setTimeout(() => setSyncStatus('IDLE'), 2000);
        }
    };

    return {
        data,
        loading,
        error,
        syncStatus,
        add: addItem,
        update: updateItem,
        remove: deleteItem,
        set: setWithSync // Expose as 'set' for direct replacement of useState setter
    };
}
