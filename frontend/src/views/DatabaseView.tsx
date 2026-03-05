import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Download, Upload, Trash2, AlertTriangle, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

export function DatabaseView({ active }: { active: boolean }) {
    const [loading, setLoading] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleExport = async () => {
        setLoading(true);
        try {
            const data: any = await invoke("export_data");

            // Helper to convert array of objects to CSV
            const toCSV = (arr: any[]) => {
                if (arr.length === 0) return "";
                const headers = Object.keys(arr[0]).join(",");
                const rows = arr.map(obj =>
                    Object.values(obj).map(val =>
                        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
                    ).join(",")
                ).join("\n");
                return `${headers}\n${rows}`;
            };

            const productosCSV = toCSV(data.productos);
            const movimientosCSV = toCSV(data.movimientos);

            // Create a downloadable blob
            const fullContent = `--- PRODUCTOS ---\n${productosCSV}\n\n--- MOVIMIENTOS ---\n${movimientosCSV}`;
            const blob = new Blob([fullContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `venestock_backup_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();

            setStatus({ type: 'success', message: 'Datos exportados correctamente' });
        } catch (e) {
            setStatus({ type: 'error', message: `Error al exportar: ${e}` });
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;

                const parseSection = (section: string) => {
                    const lines = section.trim().split('\n').filter(line => line.trim() !== "");
                    if (lines.length < 2) return [];

                    const headers = lines[0].split(',').map(h => h.trim());
                    const numericalFields = ['id', 'producto_id', 'cantidad', 'tasa_momento', 'total_usd', 'total_bs', 'price_per_dolar', 'precio_ref_usd', 'precio_bs', 'stock'];

                    return lines.slice(1).map(line => {
                        const values = line.split(',');
                        const obj: any = {};
                        headers.forEach((h, i) => {
                            if (!h) return;
                            let val: any = values[i];
                            if (val === undefined) val = null;
                            if (typeof val === 'string') {
                                if (val.startsWith('"') && val.endsWith('"')) {
                                    val = val.slice(1, -1).replace(/""/g, '"');
                                }
                                if (val === "null" || val === "") val = null;
                                else if (numericalFields.includes(h) && !isNaN(val as any) && val.trim() !== "") {
                                    val = Number(val);
                                }
                            }
                            obj[h] = val;
                        });
                        return obj;
                    });
                };

                // Split by the explicit section headers
                const productosPart = text.split('--- PRODUCTOS ---')[1]?.split('---')[0] || "";
                const movimientosPart = text.split('--- MOVIMIENTOS ---')[1]?.split('---')[0] || "";

                const productos = parseSection(productosPart);
                const movimientos = parseSection(movimientosPart);

                console.log("Importing:", { productos, movimientos });

                if (productos.length === 0 && movimientos.length === 0) {
                    throw new Error("No se encontraron datos válidos en el archivo.");
                }

                await invoke("import_data", { productos, movimientos });
                setStatus({ type: 'success', message: `Importación exitosa: ${productos.length} productos y ${movimientos.length} movimientos.` });
            } catch (err) {
                console.error("Import error:", err);
                setStatus({ type: 'error', message: `Error al importar: ${err}` });
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const handleClear = async () => {
        setLoading(true);
        try {
            await invoke("clear_database");
            setStatus({ type: 'success', message: 'Base de datos limpiada por completo' });
            setShowClearModal(false);
        } catch (e) {
            setStatus({ type: 'error', message: `Error al limpiar: ${e}` });
        } finally {
            setLoading(false);
        }
    };

    if (!active) return null;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold">Gestión de Base de Datos</h2>
                <p className="text-muted-foreground mt-1">Mantenimiento, respaldos y control total de la información.</p>
            </div>

            {status && (
                <div className={cn(
                    "mb-6 p-4 rounded-xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2",
                    status.type === 'success' ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                )}>
                    {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                    <p className="font-medium text-sm">{status.message}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Export Card */}
                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                    <div>
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                            <Download size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Exportar CSV</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Descarga una copia de seguridad completa de tus productos y movimientos en formato CSV compatible con Excel.
                        </p>
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={loading}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center space-x-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        <FileSpreadsheet size={18} />
                        <span>Generar Respaldo</span>
                    </button>
                </div>

                {/* Import Card */}
                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                    <div>
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                            <Upload size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Importar CSV</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Restaura una copia de seguridad o carga datos masivos. El sistema intentará fusionar los registros existentes.
                        </p>
                    </div>
                    <label className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-secondary/80 cursor-pointer active:scale-[0.98] transition-all text-center">
                        <Upload size={18} />
                        <span>Seleccionar Archivo</span>
                        <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={loading} />
                    </label>
                </div>

                {/* Clear Card */}
                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                    <div>
                        <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center text-destructive mb-4 group-hover:scale-110 transition-transform">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-destructive">Limpiar Sistema</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Elimina por completo todos los productos, movimientos y registros. <span className="font-bold">Esta acción no se puede deshacer.</span>
                        </p>
                    </div>
                    <button
                        onClick={() => setShowClearModal(true)}
                        disabled={loading}
                        className="w-full py-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl font-bold hover:bg-destructive hover:text-destructive-foreground transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        <span>Reiniciar Base de Datos</span>
                    </button>
                </div>
            </div>

            {/* Clear Confirmation Modal */}
            {showClearModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 bg-destructive/5 flex items-center space-x-3 border-b border-destructive/10">
                            <AlertTriangle className="text-destructive" size={24} />
                            <h3 className="text-xl font-bold text-destructive">¿Estás absolutamente seguro?</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-muted-foreground mb-6 leading-relaxed">
                                Esta acción borrará permanentemente todos los <span className="font-bold text-foreground">productos</span>,
                                <span className="font-bold text-foreground"> movimientos</span> e <span className="font-bold text-foreground">historial de tasas</span> del sistema.
                                No existe forma de recuperar esta información a menos que tengas un respaldo previo.
                            </p>
                            <div className="flex flex-col space-y-3">
                                <button
                                    onClick={handleClear}
                                    disabled={loading}
                                    className="w-full py-3 bg-destructive text-destructive-foreground rounded-xl font-bold shadow-lg shadow-destructive/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    Sí, borrar todo el sistema
                                </button>
                                <button
                                    onClick={() => setShowClearModal(false)}
                                    className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-all"
                                >
                                    Cancelar y volver
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
