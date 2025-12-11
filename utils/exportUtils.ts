import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hoja1');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportToPDF = (title: string, columns: string[], rows: any[][], fileName: string) => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(title, 14, 22);

    // Date & Info
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Reporte generado el: ${new Date().toLocaleString('es-AR')}`, 14, 30);
    doc.text('Sushiblack Manager System', 14, 35);

    // Table
    autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 40,
        theme: 'grid',
        styles: {
            fontSize: 9,
            cellPadding: 3,
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [20, 20, 20], // Dark styling
            textColor: [212, 175, 55], // Gold text
            fontStyle: 'bold'
        }
    });

    doc.save(`${fileName}.pdf`);
};

export const exportCredentialsPDF = (employee: any) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Background - Dark Premium Theme
    doc.setFillColor(20, 20, 20); // #141414
    doc.rect(0, 0, 210, 297, 'F');

    // Decorative Borders - Gold
    doc.setDrawColor(212, 175, 55); // #D4AF37
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277); // Outer Border
    doc.setLineWidth(0.5);
    doc.rect(12, 12, 186, 273); // Inner Border

    // Header / Logo Placeholder
    doc.setFont("helvetica", "bold");
    doc.setFontSize(30);
    doc.setTextColor(212, 175, 55); // Gold
    doc.text("SUSHIBLACK", 105, 40, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255); // White
    doc.text("MANAGER SYSTEM", 105, 47, { align: "center" });

    // Welcome Message
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("CARTA DE BIENVENIDA", 105, 80, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`Hola, ${employee.name}`, 105, 100, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200); // Light Gray
    const welcomeText = "Nos complace darte la bienvenida al equipo. A continuación encontrarás tus credenciales personales para acceder al Sistema de Gestión. Por favor, mantén esta información segura y no la compartas.";
    const splitWelcome = doc.splitTextToSize(welcomeText, 140);
    doc.text(splitWelcome, 105, 115, { align: "center" });

    // Credentials Box
    doc.setFillColor(30, 30, 30);
    doc.setDrawColor(212, 175, 55);
    doc.roundedRect(45, 140, 120, 60, 3, 3, 'FD');

    // Inside Box
    doc.setFontSize(12);
    doc.setTextColor(212, 175, 55); // Gold Title
    doc.text("TUS CREDENCIALES DE ACCESO", 105, 155, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("USUARIO (DNI):", 105, 170, { align: "center" });
    doc.setFont("courier", "bold");
    doc.setFontSize(16);
    doc.text(employee.dni || "PENDIENTE", 105, 178, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text("CONTRASEÑA:", 105, 190, { align: "center" });
    doc.setFont("courier", "bold");
    doc.setFontSize(16);
    doc.text(employee.password || "****", 105, 198, { align: "center" });

    // Instructions
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("INSTRUCCIONES:", 45, 220);

    doc.setTextColor(200, 200, 200);
    doc.text("1. Solicita el enlace de acceso a tu supervisor.", 45, 227);
    doc.text("2. Ingresa a la sección 'MIEMBRO DEL EQUIPO'.", 45, 234);
    doc.text("3. Introduce tu DNI y Contraseña tal como aparecen arriba.", 45, 241);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Documento generado el ${new Date().toLocaleDateString('es-AR')}`, 105, 270, { align: "center" });
    doc.text("Sushiblack Management System © 2024", 105, 275, { align: "center" });

    doc.save(`Bienvenida_${employee.name.replace(/\s+/g, '_')}.pdf`);
};

export const exportUserCredentialsPDF = (user: any) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Background - Dark Premium Theme
    doc.setFillColor(20, 20, 20); // #141414
    doc.rect(0, 0, 210, 297, 'F');

    // Decorative Borders - Gold
    doc.setDrawColor(212, 175, 55); // #D4AF37
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277); // Outer Border
    doc.setLineWidth(0.5);
    doc.rect(12, 12, 186, 273); // Inner Border

    // Header / Logo Placeholder
    doc.setFont("helvetica", "bold");
    doc.setFontSize(30);
    doc.setTextColor(212, 175, 55); // Gold
    doc.text("SUSHIBLACK", 105, 40, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255); // White
    doc.text("ADMINISTRATION TEAM", 105, 47, { align: "center" });

    // Welcome Message
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("BIENVENIDA AL EQUIPO", 105, 80, { align: "center" });
    doc.text("ADMINISTRATIVO", 105, 90, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`Hola, ${user.displayName || user.username}`, 105, 110, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200); // Light Gray
    const welcomeText = "Te damos la bienvenida al panel de administración de Sushiblack. A continuación encontrarás tus credenciales de acceso privilegiado. Esta información es confidencial.";
    const splitWelcome = doc.splitTextToSize(welcomeText, 140);
    doc.text(splitWelcome, 105, 125, { align: "center" });

    // Credentials Box
    doc.setFillColor(30, 30, 30);
    doc.setDrawColor(212, 175, 55);
    doc.roundedRect(45, 150, 120, 60, 3, 3, 'FD');

    // Inside Box
    doc.setFontSize(12);
    doc.setTextColor(212, 175, 55); // Gold Title
    doc.text("CREDENCIALES DE ACCESO", 105, 165, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("USUARIO:", 105, 180, { align: "center" });
    doc.setFont("courier", "bold");
    doc.setFontSize(16);
    doc.text(user.username, 105, 188, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text("CONTRASEÑA TEMPORAL:", 105, 200, { align: "center" });
    doc.setFont("courier", "bold");
    doc.setFontSize(16);
    // If we don't have the password (e.g. existing user), showing placeholders or handled by UI to only allow on creation
    doc.text(user.password || "****", 105, 208, { align: "center" });

    // Instructions
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("INSTRUCCIONES:", 45, 230);

    doc.setTextColor(200, 200, 200);
    doc.text("1. Accede al sistema desde la pantalla de Login Principal.", 45, 237);
    doc.text("2. Ingresa tus credenciales tal como aparecen arriba.", 45, 244);
    doc.text("3. Se recomienda cambiar tu contraseña periódicamente.", 45, 251);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Documento generado el ${new Date().toLocaleDateString('es-AR')}`, 105, 275, { align: "center" });
    doc.text("Sushiblack Management System © 2024", 105, 280, { align: "center" });

    doc.save(`Credenciales_Admin_${user.username}.pdf`);
};

export const exportFinancialReportPDF = (data: {
    totalBalance: number,
    auditTotal: number,
    difference: number,
    auditItems: { name: string, amount: number }[],
    income: number,
    expenses: number,
    transactions: any[]
}) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Background - Dark Theme
    doc.setFillColor(18, 18, 18);
    doc.rect(0, 0, 210, 297, 'F');

    // Header / Branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(212, 175, 55); // Gold
    doc.text("SUSHIBLACK", 15, 20);

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("REPORTE FINANCIERO", 15, 25);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, 200, 20, { align: 'right' });

    // Financial Overview Box
    doc.setFillColor(30, 30, 30);
    doc.setDrawColor(50, 50, 50);
    doc.roundedRect(15, 35, 180, 45, 3, 3, 'FD');

    // Box Title
    doc.setFontSize(12);
    doc.setTextColor(212, 175, 55);
    doc.text("RESUMEN DE FONDOS", 20, 45);

    // Box Content
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);

    // Column 1
    doc.text("SALDO SISTEMA (TEÓRICO):", 20, 55);
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(data.totalBalance), 20, 62);

    // Column 2
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text("TOTAL ARQUEADO (REAL):", 80, 55);
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(data.auditTotal), 80, 62);

    // Column 3 (Difference)
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text("DIFERENCIA:", 140, 55);
    doc.setFontSize(14);
    const diffColor = data.difference === 0 ? [212, 175, 55] : data.difference > 0 ? [74, 222, 128] : [239, 68, 68];
    doc.setTextColor(diffColor[0], diffColor[1], diffColor[2]);
    doc.text(new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(data.difference), 140, 62);

    // Status Text
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const statusText = data.difference === 0 ? "BALANCE PERFECTO" : data.difference > 0 ? "SOBRANTE DE DINERO" : "FALTANTE DE DINERO";
    doc.text(statusText, 140, 68);

    // Audit Details Section
    doc.setFontSize(12);
    doc.setTextColor(212, 175, 55);
    doc.text("DETALLE DE UBICACIONES", 15, 95);

    const auditRows = data.auditItems.map(item => [
        item.name,
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(item.amount)
    ]);

    autoTable(doc, {
        head: [['UBICACIÓN', 'MONTO ENCONTRADO']],
        body: auditRows,
        startY: 100,
        theme: 'grid',
        styles: {
            fillColor: [30, 30, 30],
            textColor: [255, 255, 255],
            lineColor: [50, 50, 50]
        },
        headStyles: {
            fillColor: [20, 20, 20],
            textColor: [212, 175, 55],
            fontStyle: 'bold'
        },
        columnStyles: {
            1: { halign: 'right', fontStyle: 'bold' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Footer info
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Este documento es un reporte generado automáticamente y no reemplaza a los estados contables oficiales.", 105, 280, { align: 'center' });

    doc.save(`Reporte_Financiero_${new Date().toISOString().split('T')[0]}.pdf`);
};
export const exportPayrollReceiptPDF = (receiptData: {
    employeeName: string;
    dni: string;
    period: string;
    baseSalary: number;
    daysWorked: number;
    accruedAmount: number;
    discounts: number;
    netPay: number;
    paymentDate: string;
    previousBalance: number;
    details: { label: string; amount: number; type: 'INCOME' | 'DEDUCTION' | 'NEUTRAL' }[];
}) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
    });

    const pageWidth = doc.internal.pageSize.width;
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    // --- Header ---
    // Clean White Background is default

    // Brand (Left)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text("SUSHIBLACK", margin, 15);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("LIQUIDACIÓN DE HABERES", margin, 20);

    // Period & Date Info (Right)
    doc.setFontSize(8);
    const rightColX = pageWidth - margin;

    doc.setTextColor(100, 100, 100);
    doc.text(`PERIODO:`, rightColX - 35, 15);
    doc.setTextColor(30, 30, 30);
    doc.text(receiptData.period, rightColX, 15, { align: 'right' });

    doc.setTextColor(100, 100, 100);
    doc.text(`FECHA PAGO:`, rightColX - 35, 20);
    doc.setTextColor(30, 30, 30);
    doc.text(receiptData.paymentDate, rightColX, 20, { align: 'right' });

    // Divider
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(margin, 25, pageWidth - margin, 25);

    // --- Employee Info Block ---
    const infoStartY = 35;

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("EMPLEADO", margin, infoStartY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(receiptData.employeeName.toUpperCase(), margin, infoStartY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("D.N.I.", margin, infoStartY + 10);
    doc.setTextColor(30, 30, 30);
    doc.text(receiptData.dni || '-', margin + 12, infoStartY + 10);

    // Salary info right aligned in this block
    doc.setTextColor(100, 100, 100);
    doc.text("SUELDO BASE", rightColX, infoStartY, { align: 'right' });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(`$ ${receiptData.baseSalary.toLocaleString('es-AR')}`, rightColX, infoStartY + 5, { align: 'right' });

    // --- Details Table ---
    const rows = receiptData.details.map(d => {
        const isDeduction = d.type === 'DEDUCTION';
        const amountStr = `$ ${d.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        return [
            d.label,
            isDeduction ? `(${amountStr})` : amountStr
        ];
    });

    autoTable(doc, {
        head: [['CONCEPTO', 'IMPORTE']],
        body: rows,
        startY: 55,
        theme: 'plain',
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: 50,
            lineColor: [240, 240, 240],
            lineWidth: { bottom: 0.1 }
        },
        headStyles: {
            fillColor: [250, 250, 250],
            textColor: 100,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: 3
        },
        columnStyles: {
            0: { cellWidth: 'auto', halign: 'left' },
            1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
                const text = data.cell.raw as string;
                if (text.includes('(')) {
                    data.cell.styles.textColor = [220, 50, 50]; // Red
                } else {
                    data.cell.styles.textColor = [40, 160, 80]; // Green
                }
            }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 5;

    // --- Total Section (Right Aligned Box) ---
    doc.setFillColor(245, 250, 245);
    doc.rect(pageWidth - margin - 60, finalY, 60, 15, 'F');

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("TOTAL NETO A PERCIBIR", pageWidth - margin - 5, finalY + 5, { align: 'right' });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 160, 80);
    doc.text(`$ ${receiptData.netPay.toLocaleString('es-AR')}`, pageWidth - margin - 5, finalY + 11, { align: 'right' });

    // --- Signatures ---
    const bottomY = 180;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);

    // Employer
    doc.line(margin + 10, bottomY, margin + 60, bottomY);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text("FIRMA EMPLEADOR", margin + 35, bottomY + 5, { align: 'center' });

    // Employee
    doc.line(pageWidth - margin - 60, bottomY, pageWidth - margin - 10, bottomY);
    doc.text("FIRMA EMPLEADO", pageWidth - margin - 35, bottomY + 5, { align: 'center' });
    doc.text("RECIBÍ CONFORME", pageWidth - margin - 35, bottomY + 8, { align: 'center' });

    // Footer Legal
    doc.setFontSize(5);
    doc.setTextColor(200, 200, 200);
    doc.text("Documento generado electrónicamente por Sushiblack Management System.", pageWidth / 2, 200, { align: 'center' });

    const safeName = receiptData.employeeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const safePeriod = receiptData.period.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`recibo_${safeName}_${safePeriod}.pdf`);
};
