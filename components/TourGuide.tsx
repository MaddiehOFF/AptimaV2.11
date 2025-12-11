
import React, { useState, useEffect } from 'react';
import { ChevronRight, X, ChevronLeft, Flag } from 'lucide-react';

interface Step {
  targetId: string;
  title: string;
  content: string;
  position: 'right' | 'left' | 'top' | 'bottom' | 'center';
}

interface TourGuideProps {
  onComplete: () => void;
  isOpen: boolean;
  mode: 'ADMIN' | 'MEMBER';
}

const ADMIN_STEPS: Step[] = [
  {
    targetId: 'center-screen',
    title: 'Bienvenido a Sushiblack Manager',
    content: 'Tu centro de comando integral. Aquí gestionarás personal, finanzas y operaciones con precisión ejecutiva.',
    position: 'center'
  },
  {
    targetId: 'nav-dashboard',
    title: 'Panel General',
    content: 'Tu vista de águila. Monitorea costos en tiempo real, estado de la caja y alertas operativas urgentes.',
    position: 'right'
  },
  {
    targetId: 'nav-employees',
    title: 'Gestión de Talento',
    content: 'Registra contratos, asigna roles jerárquicos (Estrellas) y gestiona la seguridad de acceso de tu equipo.',
    position: 'right'
  },
  {
    targetId: 'nav-hub',
    title: 'Central Administrativa',
    content: 'El cerebro del equipo. Coordina tareas con otros socios/gerentes, asigna prioridades y verifica el cumplimiento con doble confirmación.',
    position: 'right'
  },
  {
    targetId: 'nav-overtime',
    title: 'Libro de Actas',
    content: 'Registro legal de turnos. El sistema calcula automáticamente horas extras y detecta feriados (pago doble).',
    position: 'right'
  },
  {
    targetId: 'help-button',
    title: 'Soporte Continuo',
    content: '¿Dudas sobre cálculos o funciones? Este botón te brinda acceso rápido a la guía y FAQs actualizadas.',
    position: 'left'
  }
];

const MEMBER_STEPS: Step[] = [
  {
    targetId: 'center-screen',
    title: 'Tu Portal Personal',
    content: 'Bienvenido a tu espacio de trabajo. Aquí podrás ver tus tareas, consultar tu sueldo y comunicarte con el equipo.',
    position: 'center'
  },
  {
    targetId: 'mem-tasks',
    title: 'Check-List Diario',
    content: 'Tu prioridad #1. Marca tus tareas completadas en tiempo real. Si lo haces tarde, puedes ajustar la hora manualmente.',
    position: 'right'
  },
  {
    targetId: 'privacy-toggle', // We need to add this ID to MemberView
    title: 'Modo Privacidad',
    content: '¿Estás en un lugar público? Activa esto para ocultar montos de dinero y datos sensibles de la pantalla.',
    position: 'bottom'
  },
  {
    targetId: 'mem-forum',
    title: 'Muro Social',
    content: 'Mantente al día. Revisa los anuncios importantes de la gerencia y reacciona a las novedades.',
    position: 'right'
  },
  {
    targetId: 'mem-calendar',
    title: 'Tu Historial',
    content: 'Visualiza tus días trabajados. Verde = Pagado, Dorado = Pendiente de cobro. ¡Controla tus ingresos!',
    position: 'right'
  }
];

export const TourGuide: React.FC<TourGuideProps> = ({ onComplete, isOpen, mode }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps = mode === 'ADMIN' ? ADMIN_STEPS : MEMBER_STEPS;

  useEffect(() => {
    if (!isOpen) return;
    
    const updatePosition = () => {
      const step = steps[currentStep];
      if (!step) return;

      if (step.position === 'center') {
        setTargetRect(null);
        return;
      }

      const element = document.getElementById(step.targetId);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      } else {
        // Fallback if element not found (e.g. permission hidden), skip step or center
        console.warn(`Tour target ${step.targetId} not found, centering fallback.`);
        setTargetRect(null); 
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    const timer = setTimeout(updatePosition, 300); // Increased timeout for DOM readiness

    return () => {
        window.removeEventListener('resize', updatePosition);
        clearTimeout(timer);
    };
  }, [currentStep, isOpen, steps]);

  if (!isOpen) return null;

  const step = steps[currentStep];
  if (!step) return null;

  const isLast = currentStep === steps.length - 1;

  const getTooltipStyle = () => {
    if (step.position === 'center' || !targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed'
      };
    }

    const gap = 15;
    let top = 0;
    let left = 0;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 20;
    const tooltipWidth = 320; 
    const tooltipHeight = 250;

    switch (step.position) {
      case 'right':
        top = targetRect.top + (targetRect.height / 2) - 100;
        left = targetRect.right + gap;
        break;
      case 'left':
        top = targetRect.top + (targetRect.height / 2) - 100;
        left = targetRect.left - gap - tooltipWidth;
        break;
      case 'bottom':
        top = targetRect.bottom + gap;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
      case 'top':
        top = targetRect.top - gap - tooltipHeight;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
    }

    // Clamping
    if (left < padding) left = padding;
    if (left + tooltipWidth > viewportWidth - padding) left = viewportWidth - tooltipWidth - padding;
    if (top < padding) top = padding;
    if (top + tooltipHeight > viewportHeight - padding) top = viewportHeight - tooltipHeight - padding;

    return { top, left, position: 'absolute' };
  };

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-auto">
      <div className="absolute inset-0 bg-black/60 transition-colors duration-500 backdrop-blur-[2px]"></div>

      {targetRect && (
        <div 
            className="absolute transition-all duration-300 ease-out border-2 border-sushi-gold rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] box-content"
            style={{
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
            }}
        />
      )}

      <div 
        className="w-80 bg-white dark:bg-sushi-dark rounded-xl shadow-2xl border-l-4 border-l-sushi-gold p-6 flex flex-col gap-4 animate-slide-up transition-all duration-300"
        style={getTooltipStyle() as React.CSSProperties}
      >
        <div className="flex justify-between items-start border-b border-gray-100 dark:border-white/5 pb-2">
            <div>
                <span className="text-[10px] font-bold text-sushi-gold uppercase tracking-wider">Paso {currentStep + 1} de {steps.length}</span>
                <h4 className="font-serif font-bold text-lg text-gray-900 dark:text-white mt-1 leading-tight">{step.title}</h4>
            </div>
            <button onClick={onComplete} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-sushi-muted leading-relaxed">
            {step.content}
        </p>

        <div className="flex justify-between items-center mt-2 pt-2">
            <div className="flex gap-1.5">
                {steps.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-sushi-gold' : 'w-1.5 bg-gray-300 dark:bg-white/10'}`} />
                ))}
            </div>
            <div className="flex gap-2">
                {currentStep > 0 && (
                    <button 
                        onClick={() => setCurrentStep(currentStep - 1)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-white transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                )}
                <button 
                    onClick={() => {
                        if (isLast) onComplete();
                        else setCurrentStep(currentStep + 1);
                    }}
                    className="px-4 py-2 bg-sushi-gold text-sushi-black font-bold rounded-lg text-xs hover:bg-sushi-goldhover transition-colors flex items-center gap-1 shadow-lg shadow-sushi-gold/20"
                >
                    {isLast ? 'Comenzar' : 'Siguiente'}
                    {!isLast && <ChevronRight className="w-3 h-3" />}
                    {isLast && <Flag className="w-3 h-3" />}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
