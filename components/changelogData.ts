export interface ChangelogEntry {
    version: string;
    date: string;
    changes: string[];
    type: 'major' | 'minor' | 'patch';
}

export const changelogData: ChangelogEntry[] = [
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
