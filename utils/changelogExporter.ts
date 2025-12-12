import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ChangelogEntry } from '../components/changelogData';

export const exportChangelogPDF = (data: ChangelogEntry[]) => {
    const doc = new jsPDF();

    // Background - Dark
    doc.setFillColor(18, 18, 18);
    doc.rect(0, 0, 210, 297, 'F');

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(212, 175, 55); // Sushi Gold
    doc.text("SUSHIBLACK", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("HISTORIAL DE ACTUALIZACIONES", 14, 26);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, 196, 20, { align: 'right' });

    // Prepare table data
    const rows = data.map(entry => [
        `v${entry.version}`,
        entry.date,
        entry.changes.map(c => `• ${c}`).join('\n')
    ]);

    autoTable(doc, {
        head: [['VERSIÓN', 'FECHA', 'CAMBIOS REALIZADOS']],
        body: rows,
        startY: 35,
        theme: 'grid',
        styles: {
            fillColor: [30, 30, 30],
            textColor: [220, 220, 220],
            lineColor: [60, 60, 60],
            valign: 'top',
            cellPadding: 5,
            fontSize: 9
        },
        headStyles: {
            fillColor: [20, 20, 20],
            textColor: [212, 175, 55],
            fontStyle: 'bold',
            lineWidth: 0.1,
            lineColor: [212, 175, 55] // Gold border for header
        },
        columnStyles: {
            0: { cellWidth: 25, fontStyle: 'bold', textColor: [255, 255, 255] },
            1: { cellWidth: 30, textColor: [150, 150, 150] },
            2: { cellWidth: 'auto' }
        },
        alternateRowStyles: {
            fillColor: [35, 35, 35]
        }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text("Sistema de Gestión Integral Aptima V2", 105, 290, { align: "center" });
        doc.text(`Página ${i} de ${pageCount}`, 196, 290, { align: "right" });
    }

    doc.save(`Changelog_Sushiblack_${new Date().toISOString().split('T')[0]}.pdf`);
};
