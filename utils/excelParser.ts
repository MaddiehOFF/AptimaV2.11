import { read, utils } from 'xlsx';
import { Product } from '../types';

export const parseProductsExcel = async (file: File): Promise<Product[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0]; // Assume first sheet
                const worksheet = workbook.Sheets[sheetName];

                // Convert to JSON
                // We assume header is on row 2 (index 1) based on user image showing title on row 1?
                // Actually, let's look at the image again.
                // Row 1: "Tabla_2" (Table name?)
                // Row 2: Headers (Producto, Mano de obra, etc.)
                // So data starts at Row 3.
                // But xlsx utils.sheet_to_json can handle headers.
                // Let's try to detect headers or just dump it and find the row with "Producto".

                const rawData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                // Find header row index
                const headerRowIndex = rawData.findIndex(row =>
                    row.some((cell: any) =>
                        typeof cell === 'string' && cell.toLowerCase().includes('producto')
                    )
                );

                if (headerRowIndex === -1) {
                    reject(new Error("No se encontró la columna 'Producto'"));
                    return;
                }

                const headers = rawData[headerRowIndex].map((h: any) => h?.toString().trim().toLowerCase());
                const rows = rawData.slice(headerRowIndex + 1);

                const products: Product[] = [];

                rows.forEach(row => {
                    if (!row || row.length === 0) return;

                    // Map columns based on headers
                    // "Producto" -> name
                    // "Mano de obra" -> laborCost
                    // "Materia prima" -> materialCost
                    // "Ganancia" -> royalties (SWAPPED)
                    // "Regalias" -> profit (SWAPPED)

                    const getVal = (search: string) => {
                        const index = headers.findIndex(h => h.includes(search));
                        return index !== -1 ? row[index] : undefined;
                    };

                    const name = getVal('producto');
                    if (!name) return; // Skip empty names

                    // Helper to parse currency strings like "$ 2,200.00" or raw numbers
                    const parseCurrency = (val: any): number => {
                        if (typeof val === 'number') return val;
                        if (!val) return 0;
                        if (typeof val === 'string') {
                            // Remove $ and commas, ensure decimal point
                            // Format: "$ 2,200.00" -> 2200.00
                            let clean = val.replace(/[$\s]/g, ''); // Remove $ and spaces
                            // If it has comma as decimal separator? Or dot?
                            // Common excel export might use comma for thousands.
                            // Let's assume standard format matches user locale or simple clean.
                            clean = clean.replace(/,/g, ''); // Remove commas (thousands)
                            return parseFloat(clean) || 0;
                        }
                        return 0;
                    };

                    const p: Product = {
                        id: crypto.randomUUID(),
                        name: String(name),
                        laborCost: parseCurrency(getVal('mano de obra')),
                        materialCost: parseCurrency(getVal('materia prima')),
                        royalties: parseCurrency(getVal('ganancia')), // MAPPED TO ROYALITIES due to swap
                        profit: parseCurrency(getVal('regalias'))     // MAPPED TO PROFIT due to swap
                    };

                    products.push(p);
                });

                resolve(products);

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
};

export interface ParsedItem {
    name: string;
    qty: number;
}

export const parseSalesExcel = async (file: File): Promise<ParsedItem[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = read(data, { type: 'binary' });

                // Find "Productos" sheet (case insensitive)
                const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('productos')); // As user requested "pestaña productos"
                // Fallback: If no "products" sheet, try first one or error? 
                // Let's being strict as per request.
                if (!sheetName) {
                    reject(new Error("No se encontró la pestaña 'Productos' en el Excel."));
                    return;
                }

                const worksheet = workbook.Sheets[sheetName];
                const rawData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                // Find header row (Look for "Nombre" and "Cantidad")
                const headerRowIndex = rawData.findIndex(row =>
                    row.some((cell: any) => typeof cell === 'string' && cell.toLowerCase().includes('nombre')) &&
                    row.some((cell: any) => typeof cell === 'string' && cell.toLowerCase().includes('cantidad'))
                );

                if (headerRowIndex === -1) {
                    reject(new Error("No se encontraron las columnas 'Nombre' y 'Cantidad'"));
                    return;
                }

                const headers = rawData[headerRowIndex].map((h: any) => h?.toString().trim().toLowerCase());
                const rows = rawData.slice(headerRowIndex + 1);

                const parsedItems: ParsedItem[] = [];

                rows.forEach(row => {
                    const getVal = (search: string) => {
                        const index = headers.findIndex(h => h.includes(search));
                        return index !== -1 ? row[index] : undefined;
                    };

                    let name = getVal('nombre');
                    const qtyVal = getVal('cantidad');

                    if (!name || !qtyVal) return;

                    name = String(name).trim();
                    const qty = parseInt(String(qtyVal)) || 0;

                    if (qty <= 0) return;

                    // Normalization Logic provided by user
                    // "Variedad xxx" -> "Ensalada xxx"
                    // Case insensitive replacement of "Variedad" with "Ensalada"
                    if (name.toLowerCase().includes('variedad')) {
                        name = name.replace(/variedad/i, 'Ensalada').trim();
                    }

                    parsedItems.push({ name, qty });
                });

                resolve(parsedItems);

            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
};
