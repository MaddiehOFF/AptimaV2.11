
import React from 'react';
import { HardHat, Hammer, Sparkles } from 'lucide-react';

interface ConstructionViewProps {
  title: string;
  description: string;
}

export const ConstructionView: React.FC<ConstructionViewProps> = ({ title, description }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-fade-in relative overflow-hidden rounded-3xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-black/20">
       
       {/* Background Pattern */}
       <div className="absolute inset-0 opacity-10 dark:opacity-5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sushi-gold via-transparent to-transparent"></div>
       
       <div className="relative z-10 flex flex-col items-center max-w-lg">
           <div className="w-24 h-24 bg-sushi-gold/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
               <Hammer className="w-12 h-12 text-sushi-gold" />
           </div>
           
           <h2 className="text-4xl font-serif font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
           <p className="text-lg text-gray-600 dark:text-sushi-muted mb-8 leading-relaxed">
               {description}
           </p>
           
           <div className="flex gap-4">
               <div className="bg-white dark:bg-sushi-dark px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 flex items-center gap-2 shadow-sm">
                   <HardHat className="w-5 h-5 text-yellow-500" />
                   <span className="text-sm font-bold text-gray-700 dark:text-gray-300">En Desarrollo</span>
               </div>
               <div className="bg-white dark:bg-sushi-dark px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 flex items-center gap-2 shadow-sm">
                   <Sparkles className="w-5 h-5 text-purple-500" />
                   <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Próximamente</span>
               </div>
           </div>
       </div>
    </div>
  );
};
