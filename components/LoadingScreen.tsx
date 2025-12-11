import React from 'react';

export const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[100] bg-[#0c0c14] flex flex-col items-center justify-center animate-fade-in">
            <div className="relative flex items-center justify-center mb-8">
                {/* Outer Ring */}
                <div className="absolute inset-0 border-4 border-sushi-gold/20 rounded-full animate-ping opacity-20 w-32 h-32"></div>

                {/* Main Logo Container */}
                <div className="w-24 h-24 border-2 border-sushi-gold rounded-2xl flex items-center justify-center bg-black/50 backdrop-blur-sm shadow-[0_0_30px_rgba(212,175,55,0.15)] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-sushi-gold/10 to-transparent opacity-50"></div>
                    <span className="font-serif font-bold text-4xl text-sushi-gold animate-pulse tracking-tighter">SB</span>
                </div>
            </div>

            <div className="flex flex-col items-center gap-2">
                <h2 className="font-serif text-white text-xl tracking-widest uppercase font-bold">Sushiblack</h2>
                <p className="text-gray-500 text-xs tracking-[0.3em] animate-pulse">CARGANDO SISTEMA</p>
            </div>

            {/* Progress/Loader Line */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-48 h-0.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-sushi-gold/50 w-full origin-left animate-[shimmer_2s_infinite]"></div>
            </div>
        </div>
    );
};
