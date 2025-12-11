import jsPDF from 'jspdf';

export const generateUserManual = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Helpers
    const addTitle = (text: string) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(text, margin, yPos);
        yPos += 15;
    };

    const addSection = (title: string) => {
        if (yPos > 260) { doc.addPage(); yPos = 20; }
        yPos += 10;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, yPos);
        yPos += 10;
    };

    const addText = (text: string) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(text, contentWidth);
        if (yPos + (splitText.length * 6) > 280) { doc.addPage(); yPos = 20; }
        doc.text(splitText, margin, yPos);
        yPos += (splitText.length * 6) + 4;
    };

    const addBullet = (text: string) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(`• ${text}`, contentWidth);
        if (yPos + (splitText.length * 6) > 280) { doc.addPage(); yPos = 20; }
        doc.text(splitText, margin, yPos);
        yPos += (splitText.length * 6) + 2;
    };

    // --- CONTENT ---

    // Title Page
    doc.setFontSize(30);
    doc.text("MANUAL DE USUARIO", pageWidth / 2, 100, { align: 'center' });
    doc.setFontSize(14);
    doc.text("Sistema de Gestión - Sushi Black", pageWidth / 2, 115, { align: 'center' });
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, pageWidth / 2, 125, { align: 'center' });
    doc.addPage();
    yPos = 20;

    addTitle("Introducción");
    addText("Bienvenido al Sistema de Gestión de Sushi Black. Esta aplicación está diseñada para centralizar todas las operaciones del negocio, desde recursos humanos hasta finanzas y control de stock.");

    addSection("1. Acceso y Roles");
    addText("El sistema cuenta con diferentes niveles de acceso según el rol del usuario:");
    addBullet("Admin: Acceso total a todas las funciones y configuraciones.");
    addBullet("Coordinador: Gestión operativa diaria, control de asistencia y stock.");
    addBullet("Staff (Cocina/Mostrador): Visualización de sus propios registros, tareas y noticias.");
    addText("Para ingresar, utilice su usuario y contraseña asignados. Si olvida su clave, contacte a un administrador.");

    addSection("2. Dashboard Principal");
    addText("Al iniciar sesión, verá el panel principal con un resumen del estado actual del local:");
    addBullet("Estados de Cuenta: Saldo actual en Caja, MercadoPago y Efectivo.");
    addBullet("Alertas: Notificaciones sobre stock bajo, sanciones pendientes o feriados cercanos.");
    addBullet("Accesos Rápidos: Botones para ir directamente a Inventario, Libro de Actas, etc.");

    addSection("3. Recursos Humanos (Sueldos y Personal)");
    addText("En esta sección se administra todo lo relacionado al personal:");
    addBullet("Altas/Bajas: Agregue o desactive empleados.");
    addBullet("Legajos: Subida de documentos (DNI, Contratos) en formato imagen.");
    addBullet("Sanciones: Sistema de apercibimientos y suspensiones. Requieren aprobación.");

    addSection("4. Libro de Actas (Asistencias y Extras)");
    addText("Fundamental para el cálculo de nómina. Aquí se registran:");
    addBullet("Asistencias: Horarios de entrada y salida reales.");
    addBullet("Horas Extras: Cálculo automático basado en el horario pactado.");
    addBullet("Faltas: Registro de ausencias y sus motivos.");
    addBullet("Recordatorios: Eventos importantes en el calendario (ej: Cumpleaños, Mantenimiento).");
    addText("Consejo: Utilice la vista de Calendario para ver rápidamente quién faltó o hizo extras en el mes.");

    addSection("5. Finanzas y Caja");
    addText("Control estricto del dinero que entra y sale:");
    addBullet("Cierre de Caja: Los cajeros deben registrar el cierre de cada turno.");
    addBullet("Billetera Virtual: Registro de movimientos de MercadoPago/Transferencias.");
    addBullet("Gastos Fijos: Control de alquiler, luz, internet, etc.");
    addText("El sistema calcula automáticamente la rentabilidad basándose en estos ingresos menos los costos registrados.");

    addSection("6. Inventario");
    addBullet("Sesiones de Conteo: Se debe realizar un conteo periódico de insumos clave (Salmón, Queso, etc.).");
    addBullet("Diferencias: El sistema compara el stock contado con el esperado y resalta pérdidas.");

    addSection("Soporte");
    addText("Ante cualquier falla del sistema (pantalla blanca, errores de carga), intente recargar la página (F5). Si el problema persiste, contacte al desarrollador.");

    // Save
    doc.save('Manual_Capacitacion_SushiBlack.pdf');
};
