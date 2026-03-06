import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, ArrowUpRight, ArrowDownLeft, Calendar, Search, FileText, Pencil, Trash2, X, FilePlus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { Movimiento, Producto, Factura } from "../types";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "../components/ConfirmModal";
import { SearchableSelect } from "../components/SearchableSelect";

export function MovementsView({ active, onNavigateToFacturas }: { active?: boolean, onNavigateToFacturas?: () => void }) {
    const [movements, setMovements] = useState<Movimiento[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [movementToDelete, setMovementToDelete] = useState<number | null>(null);

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchData = async () => {
        setLoading(true);
        try {
            const m = await invoke("get_movements") as Movimiento[];
            const p = await invoke("get_productos") as Producto[];
            const f = await invoke("get_facturas") as Factura[];
            setMovements(m);
            setProductos(p);
            setFacturas(f);
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

    const handleDeleteMovement = async () => {
        if (!movementToDelete) return;
        try {
            await invoke("delete_movement", { id: movementToDelete });
            toast.success("Movimiento eliminado");
            fetchData();
        } catch (error) {
            toast.error("Error al eliminar movimiento: " + error);
        } finally {
            setMovementToDelete(null);
        }
    };

    const getProductName = (id: number) => {
        const p = productos.find(prod => prod.id === id);
        return p ? p.nombre : "Producto desconocido";
    };

    const getFacturaInfo = (id: number | null) => {
        if (!id) return null;
        const f = facturas.find(fac => fac.id === id);
        return f || null;
    };

    // Lógica de paginación
    const totalPages = Math.ceil(movements.length / itemsPerPage);
    const paginatedMovements = movements.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold">Movimientos</h2>
                    <p className="text-muted-foreground mt-1">Historial detallado de entradas y salidas de stock.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={onNavigateToFacturas}
                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-primary text-primary hover:bg-gray-200 rounded-xl transition-colors font-medium active:scale-95"
                    >
                        <FileText size={20} />
                        <span>Facturas</span>
                    </button>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground hover:opacity-90 rounded-2xl transition-all font-semibold shadow-lg shadow-primary/20 active:scale-95"
                    >
                        <Plus size={20} />
                        <span>Registrar Movimiento</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-secondary/5 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                                <th className="px-6 py-4 font-semibold text-center w-10">#</th>
                                <th className="px-6 py-4 font-semibold">Fecha</th>
                                <th className="px-6 py-4 font-semibold">Tipo</th>
                                <th className="px-6 py-4 font-semibold">Producto</th>
                                <th className="px-6 py-4 font-semibold text-center">Cantidad</th>
                                <th className="px-6 py-4 font-semibold text-right">Tasa</th>
                                <th className="px-6 py-4 font-semibold text-right">Total ($)</th>
                                <th className="px-6 py-4 font-semibold">Factura</th>
                                <th className="px-6 py-4 font-semibold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground text-sm italic">Cargando historial...</td>
                                </tr>
                            ) : paginatedMovements.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground text-sm italic">No hay movimientos registrados.</td>
                                </tr>
                            ) : paginatedMovements.map((m, idx) => {
                                const factura = getFacturaInfo(m.factura_id);
                                return (
                                    <tr key={m.id} className="hover:bg-secondary/5 transition-colors group">
                                        <td className="px-6 py-4 text-xs text-muted-foreground font-mono text-center">
                                            {(currentPage - 1) * itemsPerPage + idx + 1}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col text-xs">
                                                <span className="font-bold text-foreground">
                                                    {m.fecha ? new Date(m.fecha).toLocaleDateString() : "---"}
                                                </span>
                                                <span className="text-muted-foreground opacity-70">
                                                    {m.fecha ? new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight",
                                                m.tipo === "ENTRADA"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-orange-100 text-orange-700"
                                            )}>
                                                {m.tipo === "ENTRADA" ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                                                <span>{m.tipo}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-sm text-foreground truncate max-w-[180px]" title={getProductName(m.producto_id)}>
                                                {getProductName(m.producto_id)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-sm">{m.cantidad}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono text-xs text-muted-foreground">{(m.price_per_dolar || m.tasa_momento).toFixed(2)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-sm text-primary">{formatCurrency(m.total_usd, "USD")}</span>
                                                <span className="text-[10px] text-muted-foreground">{formatCurrency(m.total_bs, "BS")}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {factura ? (
                                                <div className="flex items-center space-x-1 text-[10px] bg-primary/5 text-primary px-2 py-1 rounded-lg border border-primary/10 w-fit">
                                                    <FileText size={10} />
                                                    <span className="font-mono font-bold">{factura.numero}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground italic">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setMovementToDelete(m.id!)}
                                                    className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Eliminar movimiento"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer con Paginación */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-border bg-secondary/5 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            Mostrando <span className="font-bold text-foreground">{paginatedMovements.length}</span> de <span className="font-bold text-foreground">{movements.length}</span> movimientos
                        </p>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 hover:bg-white border border-border rounded-xl disabled:opacity-30 transition-all active:scale-90"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="flex items-center px-4 h-9 bg-white border border-border rounded-xl text-xs font-bold">
                                Página {currentPage} de {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 hover:bg-white border border-border rounded-xl disabled:opacity-30 transition-all active:scale-90"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <MovementModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={fetchData}
                productos={productos}
                facturas={facturas}
            />

            <ConfirmModal
                isOpen={!!movementToDelete}
                onClose={() => setMovementToDelete(null)}
                onConfirm={handleDeleteMovement}
                title="¿Eliminar movimiento?"
                description="Esta acción revertirá (si es posible) el stock del producto afectado y borrará el registro permanente del historial."
                variant="danger"
                confirmText="Eliminar permanentemente"
            />
        </div>
    );
}

function MovementModal({ isOpen, onClose, onSave, productos, facturas }: {
    isOpen: boolean,
    onClose: () => void,
    onSave: () => void,
    productos: Producto[],
    facturas: Factura[]
}) {
    const [formData, setFormData] = useState<Partial<Movimiento>>({
        producto_id: undefined,
        tipo: "ENTRADA",
        cantidad: 1,
        tasa_momento: 0,
        price_per_dolar: 0,
        total_usd: 0,
        total_bs: 0,
        fecha: new Date().toISOString().slice(0, 16),
        factura_id: null
    });
    const [loading, setLoading] = useState(false);

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
                    fecha: new Date().toISOString().slice(0, 16),
                    factura_id: null
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
        if (!formData.producto_id) return toast.error("Selecciona un producto");

        const selectedProduct = productos.find(p => p.id === formData.producto_id);
        if (!selectedProduct) return;

        const rate = parseFloat(formData.price_per_dolar as any) || 0;
        const total_usd = (selectedProduct.precio_ref_usd * (formData.cantidad || 0));
        const total_bs = total_usd * rate;

        // Stock validation
        if (formData.tipo === "SALIDA" && (formData.cantidad || 0) > selectedProduct.stock) {
            return toast.error(`Error: No hay suficiente stock. Disponible: ${selectedProduct.stock}`);
        }

        setLoading(true);
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
            toast.success("Movimiento registrado");
            onSave();
            onClose();
        } catch (error) {
            toast.error("Error: " + error);
        } finally {
            setLoading(false);
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
                                className="w-full pl-10 pr-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
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
                                className="w-full px-4 py-2 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
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
                                className="w-full px-4 py-2 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
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
                                    className="w-full px-3 py-1.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 font-bold outline-none"
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
                                className="w-full px-3 py-1.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 text-xs outline-none"
                                value={formData.fecha || ""}
                                onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold">Factura (opcional)</label>
                        <SearchableSelect
                            options={facturas.map(f => ({
                                value: String(f.id),
                                label: `${f.numero} - ${f.fecha} ${f.proveedor ? `(${f.proveedor})` : ""}`
                            }))}
                            value={formData.factura_id ? String(formData.factura_id) : ""}
                            onChange={(val) => setFormData({ ...formData, factura_id: val ? parseInt(val) : null })}
                            placeholder="Seleccionar factura..."
                        />
                    </div>

                    <div className="flex justify-between items-center px-4 py-2 bg-primary/5 rounded-lg border border-primary/10">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Ref. BCV</span>
                        <span className="font-bold text-primary text-sm">{formData.tasa_momento} Bs/$</span>
                    </div>

                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} disabled={loading} className="px-6 py-2 text-muted-foreground hover:bg-secondary rounded-xl transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="px-6 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50">
                            {loading ? "Procesando..." : "Confirmar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

