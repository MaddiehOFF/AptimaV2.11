
import { GoogleGenAI } from "@google/genai";
import { Employee, InventoryItem, InventorySession, OvertimeRecord, SanctionRecord, WalletTransaction, FixedExpense, BudgetAnalysis } from "../types";

// Note: Process.env.API_KEY is expected to be present.
// Note: Process.env.API_KEY is expected to be present.
// @ts-ignore
const apiKey = import.meta.env.VITE_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
} else {
    console.warn("API KEY MISSING. Please set VITE_API_KEY or GEMINI_API_KEY in .env");
}


export const generateOvertimeAnalysis = async (
    employees: Employee[],
    records: OvertimeRecord[],
    sanctions?: SanctionRecord[]
): Promise<string> => {

    if (records.length === 0 && (!sanctions || sanctions.length === 0)) {
        return "No hay suficientes datos (horas extras o sanciones) para generar un análisis. Por favor registre actividad primero.";
    }

    // Prepare data summary for the prompt
    const employeeSummary = employees.map(e => ({
        name: e.name,
        position: e.position,
        schedule: `${e.scheduleStart}-${e.scheduleEnd}`,
        monthlySalaryARS: e.monthlySalary
    }));

    const recordSummary = records.map(r => ({
        employeeName: employees.find(e => e.id === r.employeeId)?.name || 'Unknown',
        date: r.date,
        overtimeHours: r.overtimeHours,
        costARS: r.overtimeAmount,
        paid: r.paid,
        reason: r.reason
    }));

    const sanctionSummary = sanctions?.map(s => ({
        employeeName: employees.find(e => e.id === s.employeeId)?.name || 'Unknown',
        date: s.date,
        type: s.type,
        description: s.description,
        amount: s.amount
    })) || [];

    const prompt = `
    Actúa como un Gerente de Operaciones Senior y CFO para "Sushiblack", un restaurante exclusivo.
    
    Analiza los siguientes datos operativos:
    
    PERFIL DE EMPLEADOS: ${JSON.stringify(employeeSummary)}
    REGISTRO DE HORAS EXTRAS: ${JSON.stringify(recordSummary)}
    LIBRO DE NOVEDADES (SANCIONES/STRIKES): ${JSON.stringify(sanctionSummary)}
    
    Proporciona un informe estratégico en español (formato Markdown) que incluya:
    
    1. **Análisis Financiero de Horas Extras**: Impacto en el presupuesto (ARS). Menciona cuánto se ha pagado ya y cuánto falta pagar (deuda pendiente).
    2. **Desempeño y Disciplina**: Cruza los datos de horas extras con las sanciones. ¿Hay empleados problemáticos? (Ej. muchas horas extras pero también llegadas tarde o strikes).
    3. **Cumplimiento de Horarios**: Identifica patrones de entrada/salida irregular.
    4. **Recomendaciones**: Sugiere acciones concretas (despidos, bonos, cambios de turno).
    
    Mantén un tono profesional, directo y elegante.
  `;

    if (!ai) {
        return "Servicio de IA no disponible. Configure la VITE_API_KEY en su archivo .env.";
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text || "No se pudo generar el análisis.";
    } catch (error) {
        console.error("Error generating analysis:", error);
        return "Hubo un error al conectar con el asistente de IA. Por favor verifique su conexión o intente más tarde.";
    }
};

export const generateInventoryEmail = async (
    session: InventorySession,
    items: InventoryItem[]
): Promise<string> => {
    const consumptionData = session.data.map(d => {
        const item = items.find(i => i.id === d.itemId);
        return {
            item: item?.name || 'Unknown',
            unit: item?.unit || '',
            initial: d.initial,
            final: d.final,
            consumption: d.consumption
        }
    });

    const prompt = `
        Actúa como el Jefe de Cocina de "Sushiblack". Escribe un informe de inventario por correo electrónico para los dueños.
        
        DATOS DEL TURNO:
        Fecha: ${session.date}
        Apertura: ${session.openedBy} (${session.startTime})
        Cierre: ${session.closedBy} (${session.endTime})
        
        CONSUMOS:
        ${JSON.stringify(consumptionData)}
        
        Estructura del Email:
        1. Asunto formal.
        2. Resumen ejecutivo del turno.
        3. Lista detallada de consumos (Items clave como Salmón, Arroz, Langostinos).
        4. Alerta si algún consumo parece excesivo o si hay stock crítico (cercano a 0 en final).
        5. Cierre formal.
        
        Solo devuelve el cuerpo del texto y el asunto. No uses markdown complejo, solo texto plano o formato simple.
    `;

    if (!ai) return "Servicio IA no configurado.";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "No se pudo generar el email.";
    } catch (error) {
        return "Error al generar informe.";
    }
};

export const generateFinancialReport = async (
    transactions: WalletTransaction[],
    totalBalance: number,
    pendingDebt: number
): Promise<string> => {
    // Summarize last 5 transactions
    const recent = transactions.slice(0, 5).map(t => `${t.type === 'INCOME' ? '+' : '-'}${t.amount} (${t.category})`);

    const prompt = `
        Actúa como Asesor Financiero de Sushiblack. Genera un reporte "Situación Actual" MUY BREVE (máximo 3 párrafos).
        
        DATOS:
        Balance Billetera Global: $${totalBalance}
        Deuda Pendiente (Nómina/Regalías): $${pendingDebt}
        Movimientos Recientes: ${recent.join(', ')}
        
        Analiza la liquidez actual frente a las deudas. Da un consejo rápido sobre si se pueden realizar inversiones o si hay que cuidar el flujo de caja.
        Formato Markdown simple.
    `;

    if (!ai) return "Servicio IA no configurado.";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "Error al analizar finanzas.";
    } catch (error) {
        return "Servicio IA no disponible.";
    }
};

export const generateBudgetAnalysis = async (
    totalBalance: number,
    fixedExpenses: FixedExpense[],
    employees: Employee[],
    transactions: WalletTransaction[] = [] // Added history
): Promise<BudgetAnalysis | null> => {
    // Calculate payroll sum
    const payroll = employees.filter(e => e.active).reduce((acc, e) => acc + e.monthlySalary, 0);
    // Calculate pending fixed expenses (taking into account partial payments)
    const pendingFixed = fixedExpenses
        .filter(e => !e.isPaid)
        .reduce((acc, e) => acc + (e.amount - (e.paidAmount || 0)), 0);

    // Get last 20 transactions for trend analysis
    const history = transactions.slice(0, 20).map(t => ({
        date: t.date,
        type: t.type,
        amount: t.amount,
        category: t.category
    }));

    const prompt = `
        Actúa como el CFO de "Sushiblack". Analiza la situación financiera y responde ÚNICAMENTE en formato JSON.
        
        DATOS DE ESTADO:
        - Saldo Actual (Caja): $${totalBalance}
        - Nómina Mensual (Empleados): $${payroll}
        - Gastos Fijos Pendientes Reales: $${pendingFixed}
        - Total Obligaciones Inmediatas: $${payroll + pendingFixed}

        HISTORIAL RECIENTE (Para detectar tendencias de gasto):
        ${JSON.stringify(history)}

        INSTRUCCIONES JSON:
        1. Calcula "healthScore" (0-100).
        2. "healthStatus": "CRITICAL" (si score < 40), "WARNING" (40-70), "HEALTHY" (>70).
        3. "realAvailableMoney": Saldo - Obligaciones. (Puede ser negativo).
        4. "allocations": Array de objetos sugiriendo distribución del excedente. Si hay déficit, priorizar pagos críticos. Categories: "Materia Prima", "Infraestructura", "Reserva", "Ganancia".
           Cada objeto: { name: string, percentage: number, amount: number, color: string (hex), description: string }.
        5. "actionableTips": Array de strings con 3 consejos estratégicos basados en el HISTORIAL (ej. "Gastos en proveedores subieron un 20%, revisar precios" o "Buen flujo de caja, ideal para stock").

        Output must be valid JSON without Markdown blocks.
    `;

    if (!ai) return null;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const jsonText = response.text;
        if (!jsonText) return null;
        return JSON.parse(jsonText) as BudgetAnalysis;
    } catch (error) {
        console.error(error);
        return null;
    }
};

export const analyzeProductImage = async (base64Image: string): Promise<{ name: string; brand: string; unit: string; price: number; category: string }[] | null> => {
    // 1. Validate API Key Availability
    if (!ai) {
        console.error("Gemini Service Error: AI instance is null. Check VITE_API_KEY.");
        throw new Error("La clave de API de IA no está configurada o es inválida.");
    }

    // 2. Extract Mime Type and Data
    // format: data:image/png;base64,....
    const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
    let mimeType = "image/jpeg"; // Default
    let base64Data = base64Image;

    if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
    } else {
        // If no header, assume raw base64 but warn
        // check if it has comma
        if (base64Image.includes(',')) {
            const parts = base64Image.split(',');
            base64Data = parts[1];
        }
    }

    const prompt = `
        Analiza esta imagen (puede ser una factura, lista de precios o etiqueta).
        Identifica TODOS los productos listados o visibles.
        
        IMPORTANTE: Si hay "combos" o "packs" (ej. "2x Coca Cola"), debes separarlos si son identificables, o listarlos como un solo ítem.
        Si la imagen es una lista larga, NO TE DETENGAS hasta leer todos.
        
        Para CADA producto extrae:
        - Nombre genérico del producto (ej. "Queso Tybo", "Salmón", "Arroz").
        - Marca (si es visible).
        - Unidad probable (un, kg, lt, caja, paq).
        - Precio (si es visible). Busca el precio unitario si es posible.
        - Categoría (Materia Prima, Bebidas, Packaging, Limpieza).

        FORMATO DE RESPUESTA OBLIGATORIO:
        Debes responder SIEMPRE con un JSON Array, incluso si solo hay un producto.
        Ejemplo:
        [
            {
                "name": "Coca Cola 1.5L",
                "brand": "Coca Cola",
                "unit": "un",
                "price": 1500,
                "category": "Bebidas"
            }
        ]
        
        NO incluyas markdown, solo el JSON puro.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: [
                {
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: mimeType, data: base64Data } }
                    ]
                }
            ],
            config: {
                responseMimeType: 'application/json'
            }
        });

        const jsonText = response.text;
        if (!jsonText) return null;

        const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        let parsed;
        try {
            parsed = JSON.parse(cleanJson);
        } catch (e) {
            console.error("Failed to parse AI JSON:", cleanJson);
            return null;
        }

        // Robustness: Always return an array
        if (Array.isArray(parsed)) {
            return parsed as any;
        } else if (typeof parsed === 'object' && parsed !== null) {
            return [parsed] as any; // Wrap single object
        } else {
            return null;
        }
    } catch (error: unknown) {
        console.error("AI Image Scan Error Full:", error);

        // Enhance error message for user
        let msg = "Error al analizar la imagen.";
        const err = error as Error;

        if (err.message?.includes("API key")) msg = "Clave de API inválida o expirada.";
        if (err.message?.includes("quota")) msg = "Límite de cuota de IA excedido.";
        if (err.message) msg += ` Detalle: ${err.message}`;

        throw new Error(msg);
    }
};

export const generateDocumentStructure = async (
    userIntent: string,
    docType: string = 'Documento General'
): Promise<string> => {
    // Basic Intent Analysis
    // "Quiero un informe de faltas" -> Title: Informe de Ausentismo, Sections: ...

    const prompt = `
        Actúa como un Asistente de Redacción Profesional para una empresa.
        
        OBJETIVO: Ayudar al usuario a estructurar un documento nuevo.
        INTENCIÓN DEL USUARIO: "${userIntent}"
        TIPO DE DOCUMENTO SUGERIDO: ${docType}
        
        Tu tarea es generar un ESQUEMA (Outline) para este documento.
        
        Formato de Respuesta (ESTRICTO):
        Título Sugerido
        
        ## Introducción
        [Breve descripción de qué poner aquí]
        
        ## Sección 1: [Nombre dependiente del tema]
        - [Punto clave 1]
        - [Punto clave 2]
        
        ## Sección 2: [Nombre dependiente del tema]
        
        ## Conclusión/Cierre
        
        NO escribas el contenido completo, solo la estructura y guías breves entre corchetes.
        Sé profesional y conciso.
    `;

    if (!ai) return "Servicio IA no configurado.";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "No se pudo generar la estructura.";
    } catch (error) {
        console.error("AI Coach Error:", error);
        return "Error al conectar con el Asistente de Escritura.";
    }
};

export const chatWithFinancialAdvisor = async (
    userMessage: string,
    history: { role: 'user' | 'assistant', content: string }[],
    context: {
        balance: number;
        expenses: FixedExpense[];
        transactions: WalletTransaction[];
        pendingDebt: number;
        userName: string;
        partners: any[]; // Avoid circular strict typing for now or import Partner
        royaltyPool: number;
        royaltyHistory: any[];
        auditData: any[]; // Conteo data
    }
): Promise<string> => {

    // 1. Summarize Context for System Prompt
    const recentTrans = context.transactions
        .slice(0, 5)
        .map(t => `${t.date.split('T')[0]}: ${t.type} $${t.amount} (${t.category}) - ${t.description}`)
        .join('\n');

    const nextExpenses = context.expenses
        .filter(e => !e.isPaid)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 3)
        .map(e => `${e.dueDate}: $${e.amount} (${e.name})`)
        .join('\n');

    // Royalties Context
    const partnersInfo = context.partners.map(p => `${p.name}: ${p.sharePercentage}%`).join(', ');
    const poolInfo = `$${context.royaltyPool}`;
    const recentRoyaltyPayments = context.royaltyHistory
        .filter(h => h.type === 'PAYMENT')
        .slice(0, 3)
        .map(h => `${h.date}: Pagado $${h.amount} a ${h.user}`)
        .join('\n');

    // Conteo (Audit) Context
    const auditInfo = context.auditData && context.auditData.length > 0
        ? context.auditData.map(a => `- ${a.name}: $${a.amount}`).join('\n')
        : "No hay información de conteo físico (Conteo) disponible.";


    const systemPrompt = `
    Eres "Fran", un experto financiero amigable y profesional para la empresa.
    
    CONTEXTO FINANCIERO ACTUAL:
    - Saldo en Caja Global: $${context.balance}
    - Deuda Pendiente (Pasivo Corriente): $${context.pendingDebt}
    - Próximos Gastos a Pagar: 
    ${nextExpenses || "Ninguno próximo"}
    - Últimos 5 Movimientos:
    ${recentTrans || "Sin movimientos recientes"}
    - Usuario: ${context.userName}

    DISTRIBUCIÓN FÍSICA DE DINERO (CONTEO):
    ${auditInfo}

    CONTEXTO DE SOCIOS Y REGALÍAS:
    - Socios y Porcentajes: ${partnersInfo || "No disponible"}
    - Pozo de Regalías Acumulado: ${poolInfo}
    - Pagos de Regalías Recientes:
    ${recentRoyaltyPayments || "Sin pagos recientes"}

    TUS OBJETIVOS:
    1. Saluda al usuario por su nombre (${context.userName}) si es el inicio de la conversación.
    2. Responder preguntas sobre el estado financiero con precisión.
    3. Dar consejos breves y accionables para mejorar el flujo de caja.
    4. Analizar tendencias si se te pide.
    5. Tener MEMORIA de la conversación previa (historial adjunto).
    6. RESPONDER SIEMPRE EN ESPAÑOL.
    
    ESTILO:
    - Conciso, directo, pero amable.
    - Usa emojis ocasionalmente (📈, 💰, ✅) para ser visual.
    - NO des respuestas largas a menos que sea un análisis profundo solicitado.
    - Si detectas un gasto peligroso o saldo bajo, avisa con tacto.

    IMPORTANTE:
    - Si te preguntan algo que no está en el contexto, di que no tienes esa información pero puedes dar un consejo general.
    `;

    // 2. Build Chat History

    if (!ai) return "Error: No se detectó API KEY. Configura VITE_API_KEY en tu .env";

    try {
        const contents = [
            {
                role: "user",
                parts: [{ text: systemPrompt + "\n\n(Sistema: Configuración inicial del asistente. Espera la primera pregunta del usuario.)" }]
            },
            {
                role: "model",
                parts: [{ text: "Entendido. Soy Fran, listo para ayudar con las finanzas. ¿En qué puedo asistirte hoy?" }]
            },
            ...history.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            })),
            {
                role: "user",
                parts: [{ text: userMessage }]
            }
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents as any,
        });

        return response.text || "Lo siento, no pude generar una respuesta.";

    } catch (error) {
        console.error("Chat Error:", error);
        return "Lo siento, tuve un problema de conexión. ¿Podrías intentar de nuevo?";
    }
};
