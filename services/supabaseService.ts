import { supabase } from '../supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface BaseEntity {
    id: string;
    [key: string]: any;
}

export type DbResult<T> = {
    data: T[] | null;
    error: any;
};

// Generic Service for Key-Value JSON Store Pattern
export class SupabaseService {
    /**
     * Fetch all records from a table.
     * Since we use a JSONB 'data' column, we need to map the result back to the original type.
     */
    static async getAll<T extends BaseEntity>(tableName: string): Promise<DbResult<T>> {
        const { data, error } = await supabase
            .from(tableName)
            .select('*');

        if (error) {
            console.error(`Error fetching ${tableName}:`, error);
            return { data: null, error };
        }

        // Map: Postgres Row -> Entity
        // Supports Hybrid matching: Old Columns + New JSONB 'data'
        const mappedData = data?.map((row: any) => {
            const { data: jsonData, ...rest } = row;
            return {
                ...rest,
                ...(jsonData || {})
            };
        }) as T[];

        return { data: mappedData, error: null };
    }

    /**
     * Upsert a record (Insert or Update).
     * Stores the entity 'id' in the primary key column, and the rest in the 'data' JSONB column.
     */
    static async upsert<T extends BaseEntity>(tableName: string, item: T): Promise<any> {
        const { id, ...rest } = item;

        const { data, error } = await supabase
            .from(tableName)
            .upsert({
                id: id,
                data: rest,
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) {
            console.error(`Error upserting into ${tableName}:`, error);
        }
        return { data, error };
    }

    /**
     * Delete a record by ID.
     */
    static async delete(tableName: string, id: string): Promise<any> {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`Error deleting from ${tableName}:`, error);
        }
        return { error };
    }

    /**
     * Subscribe to Realtime changes for a specific table.
     * Returns the channel so it can be unsubscribed.
     */
    static subscribe<T extends BaseEntity>(
        tableName: string,
        onDataChange: (data: T[]) => void,
        getCurrentData: () => T[]
    ): RealtimeChannel {
        return supabase
            .channel(`${tableName}-changes`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: tableName },
                (payload) => {
                    const current = getCurrentData();
                    let updated = [...current];

                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const newRow = payload.new as any;
                        const newItem = { id: newRow.id, ...newRow.data } as T;

                        // Remove existing if present (update case)
                        updated = updated.filter(item => item.id !== newItem.id);
                        // Add new (or updated)
                        updated.push(newItem);

                    } else if (payload.eventType === 'DELETE') {
                        const oldRow = payload.old as any;
                        updated = updated.filter(item => item.id !== oldRow.id);
                    }

                    onDataChange(updated);
                }
            )
            .subscribe();
    }
}
