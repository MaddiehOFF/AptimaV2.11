
import React, { useState } from 'react';
import { HelpCircle, X, BookOpen, MessageCircleQuestion, ChevronDown, ChevronUp } from 'lucide-react';

export const HelpAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'GUIDE' | 'FAQ'>('GUIDE');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "¿Qué significan los íconos de rango en mi nombre?",
      a: "Representan tu jerarquía en Sushiblack. Desde la Corona (Empresa) y Escudo (Gerencia), hasta Medallas (Coordinadores) y Sombreros (Cocina). ¡Destácate para subir de rango!"
    },
    {
      q: "¿Cómo uso el Modo Privacidad?",
      a: "En tu panel personal, haz clic en el ícono del Ojo (👁️) arriba a la derecha. Esto ocultará todos los montos de dinero con asteriscos (****), útil si estás abriendo la app frente a clientes o proveedores."
    },
    {
      q: "¿Cómo registro el Inventario correctamente?",
      a: "Debes realizar dos cargas: 'Apertura' al iniciar el servicio (stock con el que recibes) y 'Cierre' al finalizar. El sistema calculará el consumo automáticamente. Si olvidaste hacerlo a tiempo, usa la opción 'Hora Manual'."
    },
    {
      q: "¿Qué hago si completé una tarea hace horas?",
      a: "Al marcar el check-list, selecciona 'Indicar Hora' en lugar de 'Ahora Mismo'. Es vital para que los administradores vean el flujo de trabajo real."
    },
    {
      q: "¿Cómo funcionan los Feriados?",
      a: "Si trabajas en un día marcado por administración como 'Feriado Oficial', el sistema calculará automáticamente tu valor hora al doble (2x) en el registro de asistencia."
    },
    {
      q: "¿Quién puede ver lo que publico en el Foro?",
      a: "El Foro es visible para todos los miembros y administradores de la empresa. Las reacciones son públicas. Úsalo para mantenerte informado sobre las novedades."
    }
  ];

  const guides = [
    { title: 'Central Admin', text: 'Coordina tareas con otros gerentes. Usa la doble verificación para asegurar que los trabajos importantes estén 100% listos.' },
    { title: 'Caja y Movimientos', text: 'Registra cada ingreso o gasto. Recuerda diferenciar siempre entre Efectivo Físico y Transferencias para que el balance cuadre.' },
    { title: 'Inventario Inteligente', text: 'Genera reportes de consumo con un clic. Puedes pedirle a la IA que redacte un email formal con el resumen del turno.' },
    { title: 'Expedientes', text: 'La ficha completa de tu personal. Aquí puedes ver sus strikes, asignarles días laborales y configurar sus datos bancarios.' },
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-sushi-gold text-sushi-black rounded-full shadow-2xl flex items-center justify-center hover:bg-sushi-goldhover hover:scale-110 transition-all z-50 group"
        title="Asistencia Sushiblack"
      >
        <HelpCircle className="w-8 h-8 group-hover:rotate-12 transition-transform" />
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-sushi-dark w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-gray-200 dark:border-white/10">
            
            {/* Header */}
            <div className="p-6 bg-sushi-gold flex justify-between items-center text-sushi-black">
              <div>
                <h3 className="font-serif text-2xl font-bold">Centro de Ayuda</h3>
                <p className="text-sm font-medium opacity-80">Tutoriales y Preguntas Frecuentes</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-white/10">
              <button 
                onClick={() => setActiveTab('GUIDE')}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'GUIDE' ? 'text-sushi-gold border-b-2 border-sushi-gold bg-gray-50 dark:bg-white/5' : 'text-gray-500 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white'}`}
              >
                <BookOpen className="w-4 h-4" /> Funciones Clave
              </button>
              <button 
                onClick={() => setActiveTab('FAQ')}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'FAQ' ? 'text-sushi-gold border-b-2 border-sushi-gold bg-gray-50 dark:bg-white/5' : 'text-gray-500 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white'}`}
              >
                <MessageCircleQuestion className="w-4 h-4" /> Preguntas
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto bg-gray-50 dark:bg-black/20 flex-1">
              
              {activeTab === 'GUIDE' && (
                <div className="space-y-4">
                  {guides.map((g, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-sushi-gold/20 text-sushi-gold/900 dark:text-sushi-gold flex items-center justify-center font-bold text-sm shrink-0 border border-sushi-gold/30">
                        {i + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{g.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-sushi-muted leading-relaxed">{g.text}</p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-6 p-4 bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg">
                    <p className="text-xs text-purple-800 dark:text-purple-300 text-center font-medium">
                      🚀 Tip Pro: Usa el Modo Privacidad (👁️) si estás trabajando en la barra o mostrador.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'FAQ' && (
                <div className="space-y-3">
                  {faqs.map((item, i) => (
                    <div key={i} className="border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 overflow-hidden transition-all">
                      <button 
                        onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                        className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <span className="font-medium text-gray-900 dark:text-white text-sm pr-4">{item.q}</span>
                        {openFaqIndex === i ? <ChevronUp className="w-4 h-4 text-sushi-gold" /> : <ChevronDown className="w-4 h-4 text-sushi-muted" />}
                      </button>
                      {openFaqIndex === i && (
                        <div className="p-4 pt-0 text-sm text-gray-600 dark:text-sushi-muted border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/20 leading-relaxed">
                          {item.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
};
