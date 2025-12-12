import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Box, Plus, Calendar, Save, History, Search, ArrowRight, CheckCircle2, AlertTriangle, FileText, ChevronDown, ChevronUp, ChevronRight, Clock, Filter, X, Camera, ScanLine, Loader2, Trash2, Lock } from 'lucide-react';
import { InventorySession, SupplierProduct } from '../types';
import { playSound } from '../utils/soundUtils';
import { exportToPDF } from '../utils/exportUtils';
import { SecurityConfirmationModal } from './SecurityConfirmationModal';

interface InventoryManagerProps {
    items: SupplierProduct[];
    sessions: InventorySession[];
    setSessions: React.Dispatch<React.SetStateAction<InventorySession[]>>;
    userName: string;
    onUpdateProduct: (item: SupplierProduct) => Promise<void>;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ items, sessions, setSessions, userName, onUpdateProduct }) => {
    // Session State
    const [activeSession, setActiveSession] = useState<InventorySession | null>(() => {
        return sessions.find(s => s.status === 'OPEN') || null;
    });

    // View Session State for History Details
    const [viewSession, setViewSession] = useState<InventorySession | null>(null);

    // Form State for Active Session
    const [counts, setCounts] = useState<Record<string, { initial: number; final?: number; consumption?: number }>>({});

    // View State
    const [viewMode, setViewMode] = useState<'ACTIVE' | 'HISTORY' | 'DEPOSIT'>('ACTIVE');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');

    // Scanning State
    const [showScanner, setShowScanner] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [scanMatches, setScanMatches] = useState<SupplierProduct[]>([]);
    const [showScanResult, setShowScanResult] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Security Modal State
    const [securityModalOpen, setSecurityModalOpen] = useState(false);
    const [securityAction, setSecurityAction] = useState<{ type: 'START' | 'CLOSE' | 'VOID' | 'RESTORE', sessionId?: string } | null>(null);

    // Get unique categories from items
    const categories = useMemo(() => {
        const cats = new Set(items.map(i => i.category || 'VARIOS'));
        return ['TODOS', ...Array.from(cats)];
    }, [items]);

    // Initialize counts when active session loads
    useEffect(() => {
        if (activeSession) {
            const initialCounts: Record<string, any> = {};
            activeSession.data.forEach(d => {
                initialCounts[d.itemId] = {
                    initial: d.initial,
                    final: d.final,
                    consumption: d.consumption
                };
            });
            setCounts(initialCounts);
        }
    }, [activeSession]);

    // Camera Handlers
    const startCamera = async () => {
        setShowScanner(true);
        setCapturedImage(null);
        setShowScanResult(false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera Error:", err);
            alert("No se pudo acceder a la cámara.");
            setShowScanner(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
        }
        setShowScanner(false);
    };

    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                setCapturedImage(dataUrl);
                analyzeImage(dataUrl);
            }
        }
    };

    const analyzeImage = (imageUrl: string) => {
        setIsAnalyzing(true);
        // MOCK AI DETECTION
        setTimeout(() => {
            setIsAnalyzing(false);
            setShowScanResult(true);
            const potentialMatches = items.filter(i => Math.random() > 0.8).slice(0, 3);
            setScanMatches(potentialMatches);
            playSound('SUCCESS');
        }, 2000);
    };

    const handleMatchSelect = (item: SupplierProduct) => {
        setSearchTerm(item.name);
        stopCamera();
    };

    // --- SECURITY HANDLERS ---
    const requestAction = (type: 'START' | 'CLOSE' | 'VOID' | 'RESTORE', sessionId?: string) => {
        setSecurityAction({ type, sessionId });
        setSecurityModalOpen(true);
    };

    const executeSecurityAction = () => {
        if (!securityAction) return;

        switch (securityAction.type) {
            case 'START':
                executeStartSession();
                break;
            case 'CLOSE':
                executeCloseSession();
                break;
            case 'VOID':
                if (securityAction.sessionId) executeVoidSession(securityAction.sessionId);
                break;
            case 'RESTORE':
                if (securityAction.sessionId) executeRestoreSession(securityAction.sessionId);
                break;
        }
        setSecurityModalOpen(false);
        setSecurityAction(null);
    };

    const executeStartSession = () => {
        if (activeSession) return;

        const newSession: InventorySession = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            status: 'OPEN',
            openedBy: userName,
            startTime: new Date().toLocaleTimeString(),
            data: items.map(item => ({
                itemId: item.id,
                initial: 0
            }))
        };

        setSessions([newSession, ...sessions]);
        setActiveSession(newSession);

        const initialCounts: Record<string, any> = {};
        newSession.data.forEach(d => {
            initialCounts[d.itemId] = { initial: 0 };
        });
        setCounts(initialCounts);
        playSound('SUCCESS');
    };

    const handleUpdateCount = (itemId: string, field: 'initial' | 'final', value: string) => {
        const numValue = parseFloat(value) || 0;
        setCounts(prev => {
            const current = prev[itemId] || { initial: 0 };
            const updated = { ...current, [field]: numValue };

            if (updated.initial !== undefined && updated.final !== undefined) {
                updated.consumption = Math.max(0, updated.initial - updated.final);
            }

            return { ...prev, [itemId]: updated };
        });
    };

    const executeCloseSession = () => {
        if (!activeSession) return;
        // Window confirm removed, handled by modal

        const closedSession: InventorySession = {
            ...activeSession,
            status: 'CLOSED',
            closedBy: userName,
            endTime: new Date().toLocaleTimeString(),
            data: Object.entries(counts).map(([itemId, data]) => ({
                itemId,
                initial: data.initial || 0,
                final: data.final || 0,
                consumption: (data.initial || 0) - (data.final || 0)
            }))
        };

        setSessions(sessions.map(s => s.id === activeSession.id ? closedSession : s));
        setActiveSession(null);
        setCounts({});
        playSound('SUCCESS');
    };

    const handleSaveProgress = () => {
        if (!activeSession) return;

        const updatedSession: InventorySession = {
            ...activeSession,
            data: Object.entries(counts).map(([itemId, data]) => ({
                itemId,
                initial: data.initial || 0,
                final: data.final,
                consumption: data.consumption
            }))
        };

        setSessions(sessions.map(s => s.id === activeSession.id ? updatedSession : s));
        playSound('CLICK');
    };

    const executeVoidSession = (sessionId: string) => {
        // Window confirm removed

        const voidedSession = sessions.find(s => s.id === sessionId);
        if (!voidedSession) return;

        const updated: InventorySession = {
            ...voidedSession,
            status: 'VOID',
            voidedBy: userName,
            voidedAt: new Date().toISOString()
        };

        setSessions(sessions.map(s => s.id === sessionId ? updated : s));
        playSound('SUCCESS');
    };

    const executeRestoreSession = (sessionId: string) => {
        // Window confirm removed

        const restoredSession = sessions.find(s => s.id === sessionId);
        if (!restoredSession) return;

        const updated: InventorySession = {
            ...restoredSession,
            status: 'CLOSED',
            voidedBy: undefined,
            voidedAt: undefined
        };

        setSessions(sessions.map(s => s.id === sessionId ? updated : s));
        playSound('SUCCESS');
    };

    const handleExportPDF = (session: InventorySession) => {
        const columns = ['Insumo', 'Unidad', 'Stock Inicial', 'Stock Final', 'Consumo'];
        const rows = session.data.map(d => {
            const item = items.find(i => i.id === d.itemId);
            return [
                item?.name || 'Desconocido',
                item?.unit || '-',
                d.initial,
                d.final !== undefined ? d.final : '-',
                d.consumption !== undefined ? (d.consumption > 0 ? `-${d.consumption}` : '-') : '-'
            ];
        });

        exportToPDF(
            `Reporte de Inventario ${new Date(session.date).toLocaleDateString()} ${session.status === 'VOID' ? '(ANULADO)' : ''}`,
            columns,
            rows,
            `Inventario_${new Date(session.date).toISOString().split('T')[0]}`
        );
        playSound('CLICK');
    };

    const handleExportDepositPDF = () => {
        const columns = ['Insumo', 'Unidad', 'Stock Actual', 'Última Act.'];
        const rows = activeItems.map(i => [
            i.name,
            i.unit,
            i.currentStock?.toString() || '0',
            new Date(i.updatedAt).toLocaleDateString()
        ]);

        exportToPDF(
            'Reporte de Stock en Depósito',
            columns,
            rows,
            `Stock_Deposito_${new Date().toISOString().split('T')[0]}`
        );
        playSound('CLICK');
    };

    const activeItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'TODOS' || (item.category || 'VARIOS') === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6 animate-fade-in pb-20 relative">
            {/* SCANNER MODAL */}
            {showScanner && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
                    <button onClick={stopCamera} className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"><X className="w-8 h-8" /></button>

                    <div className="w-full max-w-lg bg-black rounded-3xl overflow-hidden relative shadow-2xl border border-white/10">
                        {!capturedImage ? (
                            <div className="relative aspect-[3/4] bg-black">
                                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                <div className="absolute inset-0 border-2 border-sushi-gold/50 m-8 rounded-xl flex items-center justify-center">
                                    <ScanLine className="w-12 h-12 text-sushi-gold animate-pulse" />
                                </div>
                                <button onClick={captureImage} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-300 shadow-lg active:scale-95 transition-transform" />
                            </div>
                        ) : (
                            <div className="relative aspect-[3/4] bg-black flex flex-col">
                                <img src={capturedImage} className="w-full h-2/3 object-cover opacity-50" />
                                <div className="flex-1 bg-white dark:bg-gray-900 p-6 rounded-t-3xl -mt-6 relative z-10">
                                    {isAnalyzing ? (
                                        <div className="h-full flex flex-col items-center justify-center text-sushi-gold">
                                            <Loader2 className="w-12 h-12 animate-spin mb-4" />
                                            <p className="font-bold animate-pulse">Analizando producto...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertTriangle className="text-yellow-500" />
                                                <h3 className="font-bold text-lg dark:text-white">Posibles Coincidencias</h3>
                                            </div>
                                            {scanMatches.length > 0 ? (
                                                <div className="space-y-2">
                                                    {scanMatches.map(match => (
                                                        <button key={match.id} onClick={() => handleMatchSelect(match)} className="w-full p-3 bg-gray-50 dark:bg-white/5 rounded-lg flex items-center justify-between hover:bg-sushi-gold/10 hover:border-sushi-gold border border-transparent transition-all">
                                                            <div>
                                                                <p className="font-bold text-sm text-left dark:text-white">{match.name}</p>
                                                                <p className="text-xs text-left text-gray-500">{match.category}</p>
                                                            </div>
                                                            <ArrowRight className="w-4 h-4 text-gray-400" />
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-4">
                                                    <p className="text-gray-500">No se encontraron coincidencias.</p>
                                                    <button onClick={stopCamera} className="mt-4 text-sushi-gold font-bold text-sm">Intentar de nuevo</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}

            {/* DETAIL MODAL FOR HISTORY */}
            {viewSession && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-sushi-dark w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col animate-scale-in">
                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    {viewSession.status === 'VOID' ? (
                                        <AlertTriangle className="text-red-500 w-6 h-6" />
                                    ) : (
                                        <CheckCircle2 className="text-green-500 w-6 h-6" />
                                    )}
                                    Detalle de Inventario {viewSession.status === 'VOID' && '(ANULADO)'}
                                </h3>
                                <div className="text-gray-500 text-sm mt-1">
                                    <p>Realizado el {new Date(viewSession.date).toLocaleDateString()} por {viewSession.closedBy || viewSession.openedBy}</p>
                                    {viewSession.status === 'VOID' && viewSession.voidedBy && (
                                        <p className="text-red-500 font-medium">Anulado por {viewSession.voidedBy} el {viewSession.voidedAt ? new Date(viewSession.voidedAt).toLocaleDateString() : ''}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setViewSession(null)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase text-gray-500 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-white/5 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">Insumo</th>
                                        <th className="px-4 py-3 text-center">Unidad</th>
                                        <th className="px-4 py-3 text-center">Inicial</th>
                                        <th className="px-4 py-3 text-center">Final</th>
                                        <th className="px-4 py-3 text-center">Consumo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {viewSession.data.map((d, idx) => {
                                        const item = items.find(i => i.id === d.itemId);
                                        return (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                    {item?.name || 'Item eliminado'}
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-500">
                                                    {item?.unit || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-900 dark:text-white">
                                                    {d.initial}
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-900 dark:text-white">
                                                    {d.final !== undefined ? d.final : '-'}
                                                </td>
                                                <td className={`px-4 py-3 text-center font-bold ${d.consumption && d.consumption > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                                                    {d.consumption && d.consumption > 0 ? `-${d.consumption}` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 rounded-b-2xl flex justify-end gap-3">
                            <button
                                onClick={() => setViewSession(null)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => handleExportPDF(viewSession)}
                                className="px-4 py-2 bg-sushi-gold text-sushi-black font-bold rounded-lg hover:bg-yellow-500 shadow-lg shadow-sushi-gold/20 transition-all flex items-center gap-2"
                            >
                                <FileText className="w-5 h-5" />
                                Exportar PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white dark:bg-sushi-dark p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Box className="text-sushi-gold" />
                        Control de Stock (Insumos)
                    </h2>
                    <p className="text-gray-500 dark:text-sushi-muted text-sm mt-1">
                        Gestiona el inventario físico basado en Insumos.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('ACTIVE')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'ACTIVE'
                                ? 'bg-white dark:bg-sushi-dark text-sushi-gold shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                        >
                            Conteo Actual
                        </button>
                        <button
                            onClick={() => setViewMode('DEPOSIT')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'DEPOSIT'
                                ? 'bg-white dark:bg-sushi-dark text-sushi-gold shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                        >
                            Depósito
                        </button>
                        <button
                            onClick={() => setViewMode('HISTORY')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'HISTORY'
                                ? 'bg-white dark:bg-sushi-dark text-sushi-gold shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                        >
                            Historial
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'ACTIVE' && (
                <>
                    {/* Status Bar */}
                    <div className={`p-4 rounded-xl border flex items-center justify-between ${activeSession
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30'
                        : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'
                        }`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activeSession
                                ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
                                : 'bg-gray-200 dark:bg-white/10 text-gray-500'
                                }`}>
                                {activeSession ? <Clock className="w-6 h-6 animate-pulse" /> : <Box className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">
                                    {activeSession ? 'Sesión de Inventario Activa' : 'Sin sesión activa'}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {activeSession
                                        ? `Iniciado por ${activeSession.openedBy} a las ${activeSession.startTime}`
                                        : 'Inicia una nueva sesión para registrar movimientos'}
                                </p>
                            </div>
                        </div>

                        {activeSession ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={startCamera}
                                    className="p-2 bg-sushi-black text-sushi-gold rounded-lg hover:scale-105 transition-transform tooltip border border-sushi-gold/20"
                                    title="Escanear Producto (Cámara)"
                                >
                                    <Camera className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleSaveProgress}
                                    className="p-2 text-gray-600 dark:text-gray-300 hover:bg-white/50 rounded-lg transition-colors tooltip"
                                    title="Guardar progreso"
                                >
                                    <Save className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => requestAction('CLOSE')}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Finalizar Conteo
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => requestAction('START')}
                                className="px-6 py-3 bg-sushi-gold hover:bg-yellow-500 text-sushi-black rounded-lg font-bold shadow-lg shadow-sushi-gold/20 transition-all flex items-center gap-2 transform hover:scale-105"
                            >
                                <Plus className="w-5 h-5" />
                                Iniciar Conteo
                            </button>
                        )}
                    </div>

                    {/* Active Controls */}
                    {activeSession && (
                        <div className="space-y-4">
                            {/* Search and Filter */}
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Buscar insumo..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-sushi-gold"
                                    />
                                </div>
                                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedCategory === cat
                                                ? 'bg-sushi-gold text-sushi-black'
                                                : 'bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Inventory List */}
                            <div className="bg-white dark:bg-sushi-dark rounded-xl shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase text-gray-500 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-white/5">
                                            <tr>
                                                <th className="px-4 py-3">Insumo</th>
                                                <th className="px-4 py-3 text-center">Unidad</th>
                                                <th className="px-4 py-3 text-center w-32">Stock Inicial</th>
                                                <th className="px-4 py-3 text-center w-32">Stock Final</th>
                                                <th className="px-4 py-3 text-center w-32">Consumo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {activeItems.map((item) => {
                                                const data = counts[item.id] || { initial: 0, final: 0, consumption: 0 };
                                                return (
                                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                                                            {item.brand && <div className="text-[10px] text-gray-500">{item.brand}</div>}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="px-2 py-1 bg-gray-100 dark:bg-white/10 rounded text-xs font-mono">
                                                                {item.unit}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                value={data.initial || ''}
                                                                onChange={(e) => handleUpdateCount(item.id, 'initial', e.target.value)}
                                                                className="w-full px-2 py-1 bg-gray-5 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded text-center focus:outline-none focus:border-sushi-gold dark:text-white"
                                                                placeholder="0"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                value={data.final || ''}
                                                                onChange={(e) => handleUpdateCount(item.id, 'final', e.target.value)}
                                                                className="w-full px-2 py-1 bg-gray-5 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded text-center focus:outline-none focus:border-sushi-gold dark:text-white"
                                                                placeholder="-"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">
                                                            {data.consumption > 0 ? (
                                                                <span className="text-red-500">-{data.consumption}</span>
                                                            ) : (
                                                                <span className="text-gray-300">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {activeItems.length === 0 && (
                                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        No se encontraron insumos.
                                    </div>
                                )}
                            </div>

                            <div className="text-center">
                                <p className="text-xs text-gray-400 italic">
                                    * Para agregar nuevos insumos, utiliza el módulo de "Insumos".
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {viewMode === 'DEPOSIT' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white dark:bg-sushi-dark p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
                                <Box className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Control de Depósito</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Administra el stock físico actual.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleExportDepositPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold text-sm transition-all"
                        >
                            <FileText className="w-4 h-4 text-green-600" />
                            Exportar Informe PDF
                        </button>
                    </div>

                    {activeSession ? (
                        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-4 animate-shake">
                            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-red-700 dark:text-red-400 uppercase tracking-wide text-xs mb-1">Modo Lectura Activado</h3>
                                <p className="font-bold text-red-800 dark:text-red-300">
                                    ¡Edición Bloqueada! Hay un conteo en curso.
                                </p>
                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                    Para modificar el stock del depósito, primero debes finalizar o anular la sesión de inventario activa ("Conteo Actual").
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-r-xl flex items-start gap-4">
                            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-green-700 dark:text-green-400 uppercase tracking-wide text-xs mb-1">Edición Habilitada</h3>
                                <p className="text-sm text-green-800 dark:text-green-300">
                                    Puedes corregir manualmente el stock si detectas diferencias. Los cambios se guardarán automáticamente.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Inventory List for Deposit */}
                    <div className="bg-white dark:bg-sushi-dark rounded-xl shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase text-gray-500 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-white/5">
                                    <tr>
                                        <th className="px-4 py-3">Insumo</th>
                                        <th className="px-4 py-3 text-center">Unidad</th>
                                        <th className="px-4 py-3 text-center w-48">Stock en Depósito</th>
                                        <th className="px-4 py-3 w-32">Última Act.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {activeItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                                                {item.brand && <div className="text-[10px] text-gray-500">{item.brand}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-3 py-1 bg-sushi-gold text-black rounded-md text-xs font-bold font-mono shadow-sm border border-yellow-500/50">
                                                    {item.unit}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        disabled={!!activeSession}
                                                        value={item.currentStock ?? ''}
                                                        onChange={(e) => onUpdateProduct({ ...item, currentStock: parseFloat(e.target.value) || 0 })}
                                                        className={`w-full px-2 py-2 border rounded text-center font-bold outline-none transition-colors ${activeSession
                                                            ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 text-gray-500 cursor-not-allowed pl-8'
                                                            : 'bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 focus:border-sushi-gold dark:text-white'
                                                            }`}
                                                        placeholder="0"
                                                    />
                                                    {!!activeSession && (
                                                        <Lock className="w-3 h-3 text-red-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                {new Date(item.updatedAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {activeItems.length === 0 && (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                No se encontraron insumos.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {viewMode === 'HISTORY' && (
                <div className="space-y-4">
                    {sessions.filter(s => s.status === 'CLOSED' || s.status === 'VOID').length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-sushi-dark rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                            <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-gray-900 dark:text-white font-medium">Sin historial</h3>
                            <p className="text-sm text-gray-500">No hay sesiones de inventario cerradas aún.</p>
                        </div>
                    ) : (
                        sessions.filter(s => s.status === 'CLOSED' || s.status === 'VOID').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(session => (
                            <div
                                key={session.id}
                                onClick={() => setViewSession(session)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer group relative hover:shadow-lg ${session.status === 'VOID'
                                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
                                    : 'bg-white dark:bg-sushi-dark border-gray-200 dark:border-white/5 hover:border-sushi-gold/30'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${session.status === 'VOID'
                                            ? 'bg-red-100 text-red-600'
                                            : 'bg-green-50 dark:bg-green-900/20 text-green-600'
                                            }`}>
                                            {session.status === 'VOID' ? <Trash2 className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold ${session.status === 'VOID' ? 'text-red-700 line-through' : 'text-gray-900 dark:text-white'}`}>
                                                Inventario {new Date(session.date).toLocaleDateString()}
                                                {session.status === 'VOID' && ' (ANULADO)'}
                                            </h4>
                                            <p className="text-xs text-gray-500">
                                                {session.status === 'VOID'
                                                    ? `Anulado por ${session.voidedBy}`
                                                    : `Cerrado por ${session.closedBy} a las ${session.endTime}`
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {session.status === 'VOID' ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); requestAction('RESTORE', session.id); }}
                                                className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors z-10 font-bold flex items-center gap-1"
                                                title="Restaurar Inventario"
                                            >
                                                <History className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); requestAction('VOID', session.id); }}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors z-10"
                                                title="Anular Inventario"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        <ChevronRight className="text-gray-400 group-hover:text-sushi-gold" />
                                    </div>
                                </div>
                                <div className="pl-12">
                                    <div className="text-xs text-gray-500 space-y-1">
                                        <p>Items controlados: {session.data.length}</p>
                                        <p>Movimientos registrados: {session.data.filter(d => (d.consumption || 0) > 0).length}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
            {/* Security Confirmation Modal */}
            <SecurityConfirmationModal
                isOpen={securityModalOpen}
                onClose={() => setSecurityModalOpen(false)}
                onConfirm={executeSecurityAction}
                title={securityAction?.type === 'START' ? '¿Iniciar Conteo?' : securityAction?.type === 'CLOSE' ? '¿Finalizar Conteo?' : securityAction?.type === 'VOID' ? '¿Anular Inventario?' : '¿Restaurar Inventario?'}
                description={
                    securityAction?.type === 'START' ? '⚠️ ATENCIÓN: Al iniciar un conteo, se registrará el inicio del turno en la cocina. Asegúrate de que el personal esté listo.' :
                        securityAction?.type === 'CLOSE' ? 'Se guardarán los conteos finales y se calculará el consumo. Esta acción finaliza el turno.' :
                            securityAction?.type === 'VOID' ? 'ATENCIÓN: Se anulará este registro de inventario. Esta acción quedará auditada.' :
                                'El inventario volverá al estado "Cerrado" y será válido nuevamente.'
                }
                actionType={securityAction?.type === 'VOID' ? 'danger' : 'warning'}
                confirmText={securityAction?.type === 'START' ? 'Iniciar' : securityAction?.type === 'CLOSE' ? 'Finalizar Turno' : securityAction?.type === 'VOID' ? 'Confirmar Anulación' : 'Restaurar'}
            />
        </div>
    );
};
