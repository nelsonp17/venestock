import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, ArrowUpRight, ArrowDownLeft, Calendar } from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { Movimiento, Producto } from "../types";

export function MovementsView() {
    const [movements, setMovements] = useState<Movimiento[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const m = await invoke("get_movements") as Movimiento[];
            const p = await invoke("get_productos") as Producto[];
            setMovements(m);
            setProductos(p);
        } catch (error) {
            console.error("Error fetching movements:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getProductName = (id: number) => {
        const p = productos.find(prod => prod.id === id);
        return p ? p.nombre : "Producto desconocido";
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold">Movimientos</h2>
                    <p className="text-muted-foreground mt-1">Historial detallado de entradas y salidas de stock.</p>
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground hover:opacity-90 rounded-2xl transition-all font-semibold shadow-lg shadow-primary/20 active:scale-95"
                >
                    <Plus size={20} />
                    <span>Registrar Movimiento</span>
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-secondary/5 text-xs uppercase tracking-wider text-muted-foreground">
                                <th className="px-6 py-4 font-semibold">Fecha</th>
                                <th className="px-6 py-4 font-semibold">Tipo</th>
                                <th className="px-6 py-4 font-semibold">Producto</th>
                                <th className="px-6 py-4 font-semibold text-center">Cantidad</th>
                                <th className="px-6 py-4 font-semibold text-right">Tasa ($)</th>
                                <th className="px-6 py-4 font-semibold text-right">Total ($)</th>
                                <th className="px-6 py-4 font-semibold text-right">Total (Bs)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground text-sm">Cargando historial...</td>
                                </tr>
                            ) : movements.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground text-sm">No hay movimientos registrados.</td>
                                </tr>
                            ) : movements.map((m) => (
                                <tr key={m.id} className="hover:bg-secondary/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-2 text-xs">
                                            <Calendar size={14} className="text-muted-foreground" />
                                            <span>{m.fecha ? new Date(m.fecha).toLocaleString() : "---"}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                                            m.tipo === "ENTRADA"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-orange-100 text-orange-700"
                                        )}>
                                            {m.tipo === "ENTRADA" ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                            <span>{m.tipo}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-sm text-foreground truncate max-w-[200px]">
                                            {getProductName(m.producto_id)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold">{m.cantidad}</td>
                                    <td className="px-6 py-4 text-right text-muted-foreground text-xs">
                                        {formatCurrency(m.tasa_momento, "BS")}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-sm text-primary">
                                        {formatCurrency(m.total_usd, "USD")}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-sm">
                                        {formatCurrency(m.total_bs, "BS")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <MovementModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={fetchData}
                productos={productos}
            />
        </div>
    );
}

function MovementModal({ isOpen, onClose, onSave, productos }: {
    isOpen: boolean,
    onClose: () => void,
    onSave: () => void,
    productos: Producto[]
}) {
    const [formData, setFormData] = useState<Partial<Movimiento>>({
        producto_id: undefined,
        tipo: "ENTRADA",
        cantidad: 1,
        tasa_momento: 0,
        total_usd: 0,
        total_bs: 0
    });

    useEffect(() => {
        const fetchTasa = async () => {
            try {
                const tasaObj: any = await invoke("get_tasa_actual");
                setFormData(prev => ({ ...prev, tasa_momento: tasaObj.valor }));
            } catch (e) {
                console.error(e);
            }
        };
        if (isOpen) fetchTasa();
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.producto_id) return alert("Selecciona un producto");

        const selectedProduct = productos.find(p => p.id === formData.producto_id);
        if (!selectedProduct) return;

        const total_usd = (selectedProduct.precio_ref_usd * (formData.cantidad || 0));
        const total_bs = total_usd * (formData.tasa_momento || 0);

        try {
            await invoke("record_movement", {
                mov: {
                    ...formData,
                    total_usd,
                    total_bs
                }
            });
            onSave();
            onClose();
        } catch (error) {
            alert("Error: " + error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-border">
                    <h3 className="text-xl font-bold">Registrar Movimiento</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-semibold">Producto</label>
                        <select
                            required
                            className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary/20"
                            value={formData.producto_id}
                            onChange={e => setFormData({ ...formData, producto_id: parseInt(e.target.value) })}
                        >
                            <option value="">Seleccione un producto...</option>
                            {productos.map(p => (
                                <option key={p.id} value={p.id!}>{p.nombre} ({p.codigo})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold">Tipo</label>
                            <select
                                className="w-full px-4 py-2 border border-border rounded-xl"
                                value={formData.tipo}
                                onChange={e => setFormData({ ...formData, tipo: e.target.value as any })}
                            >
                                <option value="ENTRADA">Entrada</option>
                                <option value="SALIDA">Salida</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold">Cantidad</label>
                            <input
                                type="number" min="1" required
                                className="w-full px-4 py-2 border border-border rounded-xl"
                                value={formData.cantidad}
                                onChange={e => setFormData({ ...formData, cantidad: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-secondary/10 rounded-xl space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tasa actual:</span>
                            <span className="font-bold">{formData.tasa_momento} Bs/$</span>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-muted-foreground hover:bg-secondary rounded-xl transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition-all shadow-md">
                            Confirmar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
