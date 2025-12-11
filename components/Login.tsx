
import React, { useState } from 'react';
import { User, Employee } from '../types';
import { Lock, User as UserIcon, Shield, CreditCard, ArrowRight, Key } from 'lucide-react';
import { playSound } from '../utils/soundUtils';

interface LoginProps {
    users: User[];
    employees?: Employee[]; // Pass employees for member login
    onLogin: (user: User) => void;
    onMemberLogin?: (employee: Employee) => void;
}

type LoginMode = 'ADMIN' | 'MEMBER';

export const Login: React.FC<LoginProps> = ({ users, employees = [], onLogin, onMemberLogin }) => {
    const [mode, setMode] = useState<LoginMode>('ADMIN');

    // Admin State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // Member State
    const [dni, setDni] = useState('');
    const [memberPassword, setMemberPassword] = useState('');

    const [error, setError] = useState('');

    const handleAdminSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            playSound('LOGIN');
            onLogin(user);
        } else {
            playSound('ERROR');
            setError('Credenciales de administrador inválidas');
        }
    };

    const handleMemberSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!onMemberLogin) return;

        // Remove dots/dashes for comparison
        const cleanDni = dni.replace(/\D/g, '');

        const member = employees.find(emp => {
            const empDni = (emp.dni || '').replace(/\D/g, '');
            return empDni === cleanDni && emp.active;
        });

        if (member) {
            if (member.password === memberPassword) {
                playSound('LOGIN');
                onMemberLogin(member);
            } else {
                playSound('ERROR');
                setError('Contraseña incorrecta.');
            }
        } else {
            playSound('ERROR');
            setError('DNI no encontrado o empleado inactivo. Contacte a un administrador.');
        }
    };

    return (
        <div className="w-full min-h-screen bg-gray-100 dark:bg-sushi-black flex items-center justify-center p-4 transition-colors duration-300">
            <div className="w-full max-w-md bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col animate-slide-up">

                {/* Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-sushi-gold/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="text-center pt-8 pb-4 relative z-10 px-8">
                    <div className="inline-flex p-3 border-2 border-sushi-gold rounded-lg mb-4 animate-fade-in">
                        <span className="font-serif text-3xl font-bold text-sushi-gold">SB</span>
                    </div>
                    <h1 className="font-serif text-3xl font-bold text-gray-900 dark:text-white tracking-wide">Sushiblack</h1>
                    <p className="text-gray-500 dark:text-sushi-muted text-sm uppercase tracking-widest mt-1">
                        {mode === 'ADMIN' ? 'Acceso Gerencial' : 'Portal del Colaborador'}
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-white/10 px-8">
                    <button
                        onClick={() => { setMode('ADMIN'); setError(''); playSound('CLICK'); }}
                        className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${mode === 'ADMIN' ? 'border-sushi-gold text-sushi-gold' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-white'}`}
                    >
                        <Shield className="w-4 h-4" /> Admin
                    </button>
                    <button
                        onClick={() => { setMode('MEMBER'); setError(''); playSound('CLICK'); }}
                        className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${mode === 'MEMBER' ? 'border-sushi-gold text-sushi-gold' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-white'}`}
                    >
                        <UserIcon className="w-4 h-4" /> Miembro
                    </button>
                </div>

                <div className="p-8 relative z-10">
                    {mode === 'ADMIN' ? (
                        <form onSubmit={handleAdminSubmit} className="space-y-6">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Usuario</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400 dark:text-sushi-muted" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg py-3 pl-10 pr-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors"
                                        placeholder="admin"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400 dark:text-sushi-muted" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg py-3 pl-10 pr-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors"
                                        placeholder="••••••"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-500 dark:text-red-400 text-sm text-center bg-red-100 dark:bg-red-400/10 py-2 rounded animate-shake">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-sushi-gold text-sushi-black font-bold py-3 rounded-lg hover:bg-sushi-goldhover transition-colors shadow-lg shadow-sushi-gold/10 transform active:scale-95 duration-100"
                            >
                                Ingresar al Panel
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleMemberSubmit} className="space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-300 mb-4">
                                Bienvenido al portal de empleados. Ingresa con tu DNI y la contraseña provista por administración.
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Número de Documento (DNI)</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-3 w-5 h-5 text-gray-400 dark:text-sushi-muted" />
                                    <input
                                        type="text"
                                        value={dni}
                                        onChange={e => setDni(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg py-3 pl-10 pr-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors"
                                        placeholder="Ej. 35123456"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Contraseña</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-3 w-5 h-5 text-gray-400 dark:text-sushi-muted" />
                                    <input
                                        type="password"
                                        value={memberPassword}
                                        onChange={e => setMemberPassword(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg py-3 pl-10 pr-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors"
                                        placeholder="••••••"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-500 dark:text-red-400 text-sm text-center bg-red-100 dark:bg-red-400/10 py-2 rounded animate-shake">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 text-gray-900 dark:text-white font-bold py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/20 transition-colors flex items-center justify-center gap-2 transform active:scale-95 duration-100"
                            >
                                Ingresar <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
