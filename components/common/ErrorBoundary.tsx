
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
    componentName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Uncaught error in ${this.props.componentName || 'Component'}:`, error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl flex flex-col items-center text-center gap-4 animate-fade-in">
                    <div className="p-3 bg-red-100 dark:bg-red-800/20 text-red-600 dark:text-red-400 rounded-full">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Algo salió mal</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                            {this.props.componentName ? `El componente ${this.props.componentName} ha fallado.` : 'Ha ocurrido un error inesperado.'}
                        </p>
                        {this.state.error && (
                            <p className="text-xs font-mono bg-black/5 dark:bg-black/30 p-2 rounded mt-2 text-red-500 break-all">
                                {this.state.error.message}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-bold"
                    >
                        <RefreshCcw className="w-4 h-4" /> Intentar Recargar
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
