import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, ArrowUpRight, ArrowDownLeft, Calendar, Search, FileText, Pencil, Trash2, X, FilePlus } from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { Movimiento, Producto, Factura } from "../types";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "../components/ConfirmModal";

export function MovementsView({ active }: { active?: boolean }) {
    const [movements, setMovements] = useState<Movimiento[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [facturasModalOpen, setFacturasModalOpen] = useState(false);

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

    const getProductName = (id: number) => {
        const p = productos.find(prod => prod.id === id);
        return p ? p.nombre : "Producto desconocido";
    };

    const getFacturaInfo = (id: number | null) => {
        if (!id) return null;
        const f = facturas.find(fac => fac.id === id);
        return f || null;
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold">Movimientos</h2>
                    <p className="text-muted-foreground mt-1">Historial detallado de entradas y salidas de stock.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setFacturasModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-2xl transition-all font-semibold border border-border active:scale-95"
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
                                <th className="px-6 py-4 font-semibold">Factura</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground text-sm">Cargando historial...</td>
                                </tr>
                            ) : movements.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground text-sm">No hay movimientos registrados.</td>
                                </tr>
                            ) : movements.map((m) => {
                                const factura = getFacturaInfo(m.factura_id);
                                return (
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
                                    <td className="px-6 py-4">
                                        {factura ? (
                                            <div className="flex items-center space-x-1 text-xs">
                                                <FileText size={12} className="text-primary" />
                                                <span className="font-mono font-bold text-primary">{factura.numero}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <MovementModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={fetchData}
                productos={productos}
                facturas={facturas}
            />

            <FacturasModal
                isOpen={facturasModalOpen}
                onClose={() => setFacturasModalOpen(false)}
                onSave={fetchData}
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
                        <select
                            className="w-full px-4 py-2 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                            value={formData.factura_id || ""}
                            onChange={e => setFormData({ ...formData, factura_id: e.target.value ? parseInt(e.target.value) : null })}
                        >
                            <option value="">Sin factura</option>
                            {facturas.map(f => (
                                <option key={f.id} value={f.id || ''}>
                                    {f.numero} - {f.fecha} {f.proveedor ? `(${f.proveedor})` : ''}
                                </option>
                            ))}
                        </select>
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

function FacturasModal({ isOpen, onClose, onSave }: {
    isOpen: boolean,
    onClose: () => void,
    onSave: () => void
}) {
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    const [formData, setFormData] = useState<Partial<Factura>>({
        numero: "",
        fecha: new Date().toISOString().slice(0, 10),
        proveedor: "",
        observaciones: ""
    });

    const fetchFacturas = async () => {
        try {
            const f = await invoke("get_facturas") as Factura[];
            setFacturas(f);
        } catch (error) {
            console.error("Error fetching facturas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchFacturas();
            setEditMode(false);
            setFormData({
                numero: "",
                fecha: new Date().toISOString().slice(0, 10),
                proveedor: "",
                observaciones: ""
            });
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.numero || !formData.fecha) {
            return toast.error("Número y fecha son requeridos");
        }

        const facturaData: Factura = {
            id: formData.id || null,
            numero: formData.numero || "",
            fecha: formData.fecha || "",
            proveedor: formData.proveedor || null,
            observaciones: formData.observaciones || null,
            created_at: null
        };

        setActionLoading(true);
        try {
            await invoke("upsert_factura", { factura: facturaData });
            toast.success(editMode ? "Factura actualizada" : "Factura registrada");
            fetchFacturas();
            setEditMode(false);
            setFormData({
                numero: "",
                fecha: new Date().toISOString().slice(0, 10),
                proveedor: "",
                observaciones: ""
            });
            onSave();
        } catch (error) {
            toast.error("Error: " + error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleEdit = (factura: Factura) => {
        setFormData({ ...factura });
        setEditMode(true);
    };

    const handleDelete = async () => {
        if (!confirmDeleteId) return;
        setActionLoading(true);
        try {
            await invoke("delete_factura", { id: confirmDeleteId });
            toast.success("Factura eliminada");
            fetchFacturas();
            onSave();
        } catch (error) {
            toast.error("Error: " + error);
        } finally {
            setActionLoading(false);
            setConfirmDeleteId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h3 className="text-xl font-bold">Administrar Facturas</h3>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 border-b border-border bg-secondary/5">
                    <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase">Número</label>
                            <input
                                type="text"
                                required
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20"
                                value={formData.numero}
                                onChange={e => setFormData({ ...formData, numero: e.target.value })}
                                placeholder="001-001-0000001"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase">Fecha</label>
                            <input
                                type="date"
                                required
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                value={formData.fecha}
                                onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase">Proveedor</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                value={formData.proveedor || ""}
                                onChange={e => setFormData({ ...formData, proveedor: e.target.value })}
                                placeholder="Nombre del proveedor"
                            />
                        </div>
                        <div className="space-y-1 flex items-end">
                            <div className="flex space-x-2 w-full">
                                {editMode && (
                                    <button
                                        type="button"
                                        disabled={actionLoading}
                                        onClick={() => {
                                            setEditMode(false);
                                            setFormData({
                                                numero: "",
                                                fecha: new Date().toISOString().slice(0, 10),
                                                proveedor: "",
                                                observaciones: ""
                                            });
                                        }}
                                        className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-secondary transition-colors disabled:opacity-50"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-all flex items-center justify-center space-x-1 shadow-md active:scale-95 disabled:opacity-50"
                                >
                                    <FilePlus size={16} />
                                    <span>{actionLoading ? "..." : editMode ? "Actualizar" : "Agregar"}</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Cargando...</div>
                    ) : facturas.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No hay facturas registradas.</div>
                    ) : (
                        <div className="space-y-2">
                            {facturas.map(f => (
                                <div key={f.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary/5 transition-colors group">
                                    <div className="flex items-center space-x-4">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <FileText size={18} className="text-primary" />
                                        </div>
                                        <div>
                                            <div className="font-mono font-bold text-sm">{f.numero}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {f.fecha} {f.proveedor && `• ${f.proveedor}`}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(f)}
                                            className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-primary"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => setConfirmDeleteId(f.id!)}
                                            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-muted-foreground hover:text-red-600"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal 
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={handleDelete}
                title="¿Eliminar factura?"
                description="Los movimientos asociados a esta factura no se eliminarán, pero perderán su referencia."
                variant="danger"
                confirmText="Eliminar"
                loading={actionLoading}
            />
        </div>
    );
}
