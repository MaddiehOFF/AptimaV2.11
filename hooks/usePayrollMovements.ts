import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { PayrollMovement, PayrollMovementType } from '../types';

export const usePayrollMovements = (
    movements: PayrollMovement[],
    setMovements: React.Dispatch<React.SetStateAction<PayrollMovement[]>>
) => {

    const addMovement = async (newMovement: PayrollMovement) => {
        try {
            // Optimistic update
            setMovements(prev => [newMovement, ...prev]);

            // Database insert
            // Interface now matches DB columns (snake_case)
            const { error } = await supabase
                .from('payroll_movements')
                .insert([newMovement]);

            if (error) {
                console.error('Error adding payroll movement:', error);
                alert(`DEBUG: Error saving payroll movement: ${error.message} (${error.details})`);
            }
        } catch (err) {
            console.error('Unexpected error in addMovement:', err);
            alert(`DEBUG: Unexpected error saving payroll: ${err}`);
        }
    };

    const updateMovementByAttendanceId = async (attendanceId: string, updates: Partial<PayrollMovement>) => {
        try {
            // Optimistic Update
            setMovements(prev => prev.map(m => {
                if (m.attendance_id === attendanceId) {
                    return { ...m, ...updates };
                }
                return m;
            }));

            // Database Update
            const dbUpdates: any = {};
            if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.status !== undefined) dbUpdates.status = updates.status;

            if (Object.keys(dbUpdates).length === 0) return;

            const { error } = await supabase
                .from('payroll_movements')
                .update(dbUpdates)
                .eq('attendance_id', attendanceId);

            if (error) console.error('Error updating payroll movement:', error);

        } catch (err) {
            console.error('Unexpected error in updateMovement:', err);
        }
    };
    const deleteMovementByAttendanceId = async (attendanceId: string) => {
        try {
            // Optimistic Update (Remove or Mark Anulado)
            // We soft delete in DB, so let's mark ANULADO locally or remove depending on view preference.
            // User requested "Eliminarlo (o marcarlo como anulado)". 
            // We'll mark as ANULADO to keep history unless hard delete is preferred.
            // Actually, if attendance is deleted, the movement should probably be gone or voided.

            const { error } = await supabase
                .from('payroll_movements')
                .update({ status: 'ANULADO', description: 'Asistencia borrada desde Calendario' })
                .eq('attendance_id', attendanceId);

            if (error) {
                console.error('Error deleting payroll movement:', error);
                return;
            }

            // Update local state
            setMovements(prev => prev.map(m =>
                m.attendance_id === attendanceId
                    ? { ...m, status: 'ANULADO', description: 'Asistencia borrada desde Calendario' }
                    : m
            ));

        } catch (err) {
            console.error('Unexpected error in deleteMovement:', err);
        }
    };

    return {
        addMovement,
        updateMovementByAttendanceId,
        deleteMovementByAttendanceId
    };
};
