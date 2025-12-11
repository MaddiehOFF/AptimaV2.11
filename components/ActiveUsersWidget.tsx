
import React from 'react';
import { User, Employee } from '../types';

interface ActiveUsersWidgetProps {
    users: User[];
    employees: Employee[];
    currentUserEmail?: string; // To highlight or exclude self
}

export const ActiveUsersWidget: React.FC<ActiveUsersWidgetProps> = ({ users, employees, currentUserEmail }) => {
    // Threshold: 5 minutes
    const THRESHOLD_MS = 5 * 60 * 1000;
    const now = new Date().getTime();

    const activeAdmins = users.filter(u => {
        if (!u.lastActive) return false;
        return (now - new Date(u.lastActive).getTime()) < THRESHOLD_MS;
    });

    const activeEmployees = employees.filter(e => {
        if (!e.lastActive) return false;
        return (now - new Date(e.lastActive).getTime()) < THRESHOLD_MS;
    });

    const allActive = [
        ...activeAdmins.map(u => ({ id: u.id, name: u.name, photo: u.photoUrl, role: 'ADMIN', status: u.status })),
        ...activeEmployees.map(e => ({ id: e.id, name: e.name, photo: e.photoUrl, role: 'MEMBER', status: e.status }))
    ];

    if (allActive.length === 0) return null;

    return (
        <div className="flex items-center -space-x-2 overflow-hidden bg-white dark:bg-black/20 p-1 rounded-full border border-gray-200 dark:border-white/5 shadow-sm">
            {allActive.slice(0, 5).map((user, idx) => (
                <div
                    key={`${user.role}-${user.id}`}
                    className="relative w-8 h-8 rounded-full border-2 border-white dark:border-sushi-dark overflow-hidden group cursor-help transition-transform hover:z-10 hover:scale-110"
                    title={`${user.name} (${user.role === 'ADMIN' ? 'Admin' : 'Personal'}${user.status === 'break' ? ' - En Descanso' : ''})`}
                >
                    {user.photo ? (
                        <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold text-white ${user.role === 'ADMIN' ? 'bg-sushi-black' : 'bg-sushi-gold'}`}>
                            {user.name.charAt(0)}
                        </div>
                    )}
                    <span className={`absolute bottom-0 right-0 w-2 h-2 border border-white dark:border-sushi-dark rounded-full ${user.status === 'break' ? 'bg-orange-500' : 'bg-green-500'}`}></span>
                </div>
            ))}
            {allActive.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-sushi-muted border-2 border-white dark:border-sushi-dark z-0">
                    +{allActive.length - 5}
                </div>
            )}
        </div>
    );
};
