import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, ArrowUpRight, ArrowDownLeft, Calendar, Search } from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { Movimiento, Producto } from "../types";

export function MovementsView({ active }: { active?: boolean }) {
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
        if (active !== false) {
            fetchData();
        }
    }, [active]);

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
                                <th className="px-6 py-4 font-semibold text-right">Tasa Ref.</th>
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
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-sm">{(m.price_per_dolar || m.tasa_momento).toFixed(2)}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">Bs/$</span>
                                        </div>
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
        price_per_dolar: 0,
        total_usd: 0,
        total_bs: 0,
        fecha: new Date().toISOString().slice(0, 16)
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [showResults, setShowResults] = useState(false);

    const filteredProducts = productos.filter(p =>
        p.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedProduct = productos.find(p => p.id === formData.producto_id);

    useEffect(() => {
        const fetchTasa = async () => {
            try {
                const tasaObj: any = await invoke("get_tasa_actual");
                setFormData({
                    producto_id: undefined,
                    tipo: "ENTRADA",
                    cantidad: 1,
                    tasa_momento: tasaObj.valor,
                    price_per_dolar: tasaObj.valor,
                    total_usd: 0,
                    total_bs: 0,
                    fecha: new Date().toISOString().slice(0, 16)
                });
                setSearchQuery("");
                setShowResults(false);
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

        const rate = parseFloat(formData.price_per_dolar as any) || 0;
        const total_usd = (selectedProduct.precio_ref_usd * (formData.cantidad || 0));
        const total_bs = total_usd * rate;

        // Stock validation
        if (formData.tipo === "SALIDA" && (formData.cantidad || 0) > selectedProduct.stock) {
            return alert(`Error: No hay suficiente stock. Disponible: ${selectedProduct.stock}`);
        }

        try {
            // Rust NaiveDateTime expects format with seconds, e.g. YYYY-MM-DDTHH:mm:ss
            let formattedFecha = formData.fecha || new Date().toISOString().slice(0, 16);
            if (formattedFecha.length === 16) {
                formattedFecha += ":00";
            }

            await invoke("record_movement", {
                mov: {
                    ...formData,
                    price_per_dolar: rate,
                    total_usd,
                    total_bs,
                    fecha: formattedFecha
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
                    <div className="space-y-1 relative">
                        <label className="text-sm font-semibold">Buscar Producto</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input
                                type="text"
                                placeholder="Escribe el código o nombre..."
                                className="w-full pl-10 pr-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary/20"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowResults(true);
                                }}
                                onFocus={() => setShowResults(true)}
                            />
                        </div>

                        {showResults && searchQuery && (
                            <div className="absolute z-[70] left-0 right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                {filteredProducts.length === 0 ? (
                                    <div className="p-4 text-center text-muted-foreground text-sm">No se encontraron productos</div>
                                ) : (
                                    filteredProducts.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            className="w-full text-left px-4 py-2 hover:bg-secondary/10 flex flex-col border-b border-border last:border-none"
                                            onClick={() => {
                                                setFormData({ ...formData, producto_id: p.id! });
                                                setSearchQuery(`${p.nombre} (${p.codigo})`);
                                                setShowResults(false);
                                            }}
                                        >
                                            <span className="font-bold text-sm text-foreground">{p.nombre}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">{p.codigo}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        {selectedProduct && !showResults && (
                            <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-xl flex justify-between items-center animate-in fade-in slide-in-from-top-1">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-primary uppercase">Seleccionado:</span>
                                    <span className="text-sm font-medium">{selectedProduct.nombre}</span>
                                    <div className="flex items-center space-x-2 mt-0.5">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Stock actual:</span>
                                        <span className={cn(
                                            "text-[10px] font-bold px-1.5 rounded",
                                            selectedProduct.stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                        )}>
                                            {selectedProduct.stock} unidades
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-mono font-bold">
                                    {selectedProduct.codigo}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold">Tipo</label>
                            <select
                                className="w-full px-4 py-2 border border-border rounded-xl"
                                value={formData.tipo}
                                onChange={e => setFormData({ ...formData, tipo: e.target.value as any })}
                            >
                                <option value="ENTRADA">Entrada / Compra</option>
                                <option value="SALIDA">Salida / Venta</option>
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

                    <div className="p-4 bg-secondary/10 rounded-xl grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Tasa de Cambio</label>
                            <div className="relative">
                                <input
                                    type="number" step="any" required
                                    className="w-full px-3 py-1.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 font-bold"
                                    value={formData.price_per_dolar}
                                    onChange={e => setFormData({ ...formData, price_per_dolar: e.target.value as any })}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">Bs/$</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Fecha y Hora</label>
                            <input
                                type="datetime-local" required
                                className="w-full px-3 py-1.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 text-xs"
                                value={formData.fecha || ""}
                                onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center px-4 py-2 bg-primary/5 rounded-lg border border-primary/10">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Ref. BCV</span>
                        <span className="font-bold text-primary text-sm">{formData.tasa_momento} Bs/$</span>
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
