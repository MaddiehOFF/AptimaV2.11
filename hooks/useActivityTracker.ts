import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { View } from '../types';

export const useActivityTracker = (currentView: View, userId?: string) => {
    const startTimeRef = useRef<number>(Date.now());
    const currentViewRef = useRef<View>(currentView);

    useEffect(() => {
        // When view changes, log the PREVIOUS view duration
        const endTime = Date.now();
        const durationSeconds = (endTime - startTimeRef.current) / 1000;

        if (userId && durationSeconds > 5) { // Only log if stayed > 5 seconds
            logActivity(userId, currentViewRef.current, durationSeconds);
        }

        // Reset timer and view
        startTimeRef.current = Date.now();
        currentViewRef.current = currentView;

        // Cleanup on unmount (e.g. closing app)
        return () => {
            // We can't reliably async log on unmount, but we can try basic beacon or just skip.
            // For now, tracking view switches is sufficient.
            // If we want to capture the very last session, it's tricky.
        };
    }, [currentView, userId]);
};

const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const logActivity = async (userId: string, moduleName: string, duration: number) => {
    try {
        await supabase.from('user_activity_logs').insert([{
            id: generateUUID(),
            data: {
                userId,
                module: moduleName,
                duration: Math.round(duration),
                timestamp: new Date().toISOString()
            }
        }]);
    } catch (err) {
        console.error("Failed to log activity", err);
    }
};
