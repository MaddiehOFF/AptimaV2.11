export interface ChangelogEntry {
    version: string;
    date: string;
    changes: string[];
    type: 'major' | 'minor' | 'patch';
}

export const changelogData: ChangelogEntry[] = [
    {
        version: '2.11.3',
        date: '2025-12-12',
        changes: [
            '[NUEVO] Inventario - Depósito: Nueva pestaña para visualización de stock total en tiempo real.',
            '[MEJORA] Gastos Fijos: Interfaz renovada con ordenamiento inteligente y corrección de fechas.',
            '[LÓGICA] Seguridad de Inventario: Edición manual en Depósito protegida durante conteos activos.',
            '[FIX] UI Insumos: Solución a superposición de botones en carga de imágenes.',
            '[UX] Terminología: Unificación de términos "Iniciar Conteo" para mayor claridad.'
        ],
        type: 'minor'
    },
    {
        version: '2.11.2',
        date: '2025-12-12',
        changes: [
            '[NUEVO] IA "Fran": Integración completa de Asistente Financiero Inteligente con personalidad propia.',
            '[IA] Conexión Total: La IA ahora lee Saldos, Deudas, Regalías, Socios y "Conteo" físico en tiempo real.',
            '[UX] Chat IA Renovado: Vista pantalla completa, controles de reinicio y mejor experiencia de usuario.',
            '[SEGURIDAD] Modales de Confirmación: Protección crítica en pagos, ajustes de stock y cierres de caja.',
            '[FIX] Actividad de Usuarios: Solución al registro incorrecto de tiempo y módulos más visitados.',
            '[FIX] Privacidad Calendario: Eventos privados ahora son realmente invisibles para otros usuarios.',
            '[MEJORA] Roles y Permisos: Refactorización del sistema para asignación granular de accesos.',
            '[CORRECCIÓN] Nómina y PDF: Ajustes en la exportación y visualización de saldos de empleados.'
        ],
        type: 'minor'
    },
    {
        version: '2.11.1',
        date: '2025-12-12',
        changes: [
            '[BETA FIX] Corregido error en la Copia de Seguridad: Ahora incluye Historial de Regalías y Configuración de Roles/Permisos.',
            '[FEATURE] Añadido Historial de Actualizaciones (Changelog) en Ajustes para usuarios ADMIN.',
            '[MEJORA] Validación de integridad de datos en el proceso de Importación/Exportación.'
        ],
        type: 'patch'
    },
    {
        version: '2.11.0',
        date: '2025-12-11',
        changes: [
            '[FEATURE] Optimización Móvil: Mejora en Dashboard y Sidebar para dispositivos móviles.',
            '[FEATURE] Lanzamiento de versión Beta 2.11.'
        ],
        type: 'minor'
    },
    {
        version: '2.10.8',
        date: '2025-12-08',
        changes: [
            '[FEATURE] Nueva Oficina Administrativa: Gestión de documentos, notas y calendario interactivo.',
            '[MEJORA] Refinamiento de Nómina: Ajustes en listados, PDF y cálculos de saldo.',
            '[FIX] Corrección de privacidad en eventos de Calendario.'
        ],
        type: 'minor'
    }
];
