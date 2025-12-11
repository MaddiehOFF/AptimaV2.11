import React, { useState } from 'react';
import { Employee, OvertimeRecord, AIAnalysisState, SanctionRecord } from '../types';
import { generateOvertimeAnalysis } from '../services/geminiService';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';

interface AIReportProps {
  employees: Employee[];
  records: OvertimeRecord[];
  sanctions: SanctionRecord[];
}

export const AIReport: React.FC<AIReportProps> = ({ employees, records, sanctions }) => {
  const [analysis, setAnalysis] = useState<AIAnalysisState>({
    loading: false,
    result: null,
    error: null
  });

  const handleGenerateReport = async () => {
    setAnalysis({ loading: true, result: null, error: null });
    try {
      const result = await generateOvertimeAnalysis(employees, records, sanctions);
      setAnalysis({ loading: false, result, error: null });
    } catch (e) {
      setAnalysis({ loading: false, result: null, error: 'Error al generar el reporte.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-sushi-gold/10 rounded-full mb-2">
          <Sparkles className="w-8 h-8 text-yellow-600 dark:text-sushi-gold" />
        </div>
        <h2 className="text-3xl font-serif text-gray-900 dark:text-white">Consultor IA Sushiblack</h2>
        <p className="text-gray-500 dark:text-sushi-muted max-w-2xl mx-auto">
          Utiliza inteligencia artificial avanzada para analizar los patrones de horas extras, 
          detectar ineficiencias, revisar sanciones y optimizar los costos operativos.
        </p>
      </div>

      <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 p-8 rounded-2xl relative overflow-hidden min-h-[300px] flex flex-col items-center justify-center shadow-xl">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-sushi-gold/5 rounded-full blur-3xl pointer-events-none"></div>

        {!analysis.loading && !analysis.result && (
          <div className="z-10 text-center">
            <button 
              onClick={handleGenerateReport}
              className="bg-sushi-gold text-sushi-black font-bold text-lg px-8 py-4 rounded-full hover:bg-sushi-goldhover hover:shadow-lg hover:shadow-sushi-gold/20 transition-all flex items-center gap-3"
            >
              <Sparkles className="w-5 h-5" />
              Generar Análisis Estratégico
            </button>
            <p className="mt-4 text-sm text-gray-400 dark:text-sushi-muted">Analizando {records.length} registros, {sanctions.length} sanciones y {employees.length} empleados.</p>
          </div>
        )}

        {analysis.loading && (
          <div className="z-10 flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-sushi-gold animate-spin mb-4" />
            <p className="text-gray-900 dark:text-white font-medium">Procesando datos del restaurante...</p>
            <p className="text-gray-500 dark:text-sushi-muted text-sm mt-2">Nuestros algoritmos están revisando la eficiencia operativa.</p>
          </div>
        )}

        {analysis.result && (
          <div className="w-full z-10 text-left animate-fade-in">
             <div className="flex justify-between items-start mb-6 border-b border-gray-200 dark:border-white/10 pb-4">
                <h3 className="text-xl font-serif text-yellow-700 dark:text-sushi-gold">Reporte de Eficiencia</h3>
                <button 
                  onClick={handleGenerateReport} 
                  className="text-gray-400 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white transition-colors p-2"
                  title="Regenerar"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
             </div>
             
             <div className="prose prose-invert prose-p:text-gray-700 dark:prose-p:text-sushi-text prose-headings:text-gray-900 dark:prose-headings:text-white prose-strong:text-yellow-700 dark:prose-strong:text-sushi-gold max-w-none">
                {/* Simple rendering for the generated text which contains markdown */}
                <div className="whitespace-pre-wrap leading-relaxed">
                   {analysis.result.split('\n').map((line, i) => {
                     // Basic formatting for bold headers from markdown
                     if (line.startsWith('**') || line.startsWith('##') || line.startsWith('#')) {
                       return <h4 key={i} className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2">{line.replace(/[#*]/g, '')}</h4>
                     }
                     if (line.startsWith('- ')) {
                        return <li key={i} className="ml-4 list-disc text-gray-700 dark:text-sushi-text">{line.replace('- ', '')}</li>
                     }
                     return <p key={i} className="mb-2 text-gray-700 dark:text-sushi-text">{line}</p>
                   })}
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};