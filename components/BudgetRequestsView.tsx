import React from 'react';
import { User, Employee, BudgetRequest, WalletTransaction, CashShift } from '../types';
import { Hammer, Construction, Cone, HardHat } from 'lucide-react';

interface BudgetRequestsViewProps {
    currentUser: User | Employee;
    users: User[];
    requests?: BudgetRequest[];
    walletTransactions?: WalletTransaction[];
    cashShifts?: CashShift[];
}

export const BudgetRequestsView: React.FC<BudgetRequestsViewProps> = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[50vh] p-8 text-center animate-fade-in">
            <div className="relative mb-8 group">
                <div className="absolute inset-0 bg-sushi-gold/20 blur-xl rounded-full opacity-50 group-hover:opacity-80 transition-opacity"></div>
                <div className="relative bg-yellow-50 dark:bg-yellow-900/10 p-8 rounded-full border-2 border-yellow-100 dark:border-yellow-500/20 shadow-xl">
                    <Construction className="w-20 h-20 text-yellow-600 dark:text-yellow-500" />
                </div>
                <div className="absolute -top-2 -right-2 bg-white dark:bg-sushi-dark p-2 rounded-full border border-gray-100 dark:border-white/10 shadow-lg animate-bounce">
                    <Cone className="w-8 h-8 text-orange-500" />
                </div>
            </div>

            <h2 className="text-4xl font-serif font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                Estamos Construyendo<br />
                <span className="text-sushi-gold">Algo Mejor</span>
            </h2>

            <p className="max-w-lg text-lg text-gray-500 dark:text-sushi-muted mb-12 leading-relaxed">
                El módulo de <strong className="text-gray-700 dark:text-gray-300">Solicitudes de Dinero</strong> está recibiendo una actualización mayor para mejorar el control financiero.
            </p>

            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
                <HardHat className="w-5 h-5 text-gray-400" />
                <span className="text-xs uppercase tracking-widest text-gray-400 font-bold">Próximamente v2.9</span>
            </div>
        </div>
    );
};
