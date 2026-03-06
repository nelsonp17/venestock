import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
    FileText, Pencil, Trash2, X, FilePlus, Search,
    ChevronLeft, ChevronRight, Hash, Calendar, Truck, ArrowLeft, Package
} from "lucide-react";
import { Factura, FacturaItem } from "../types";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "../components/ConfirmModal";
import { formatCurrency } from "../lib/utils";

export function FacturasView({ active }: { active: boolean }) {
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Detalles de Factura
    const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
    const [facturaItems, setFacturaItems] = useState<FacturaItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const [formData, setFormData] = useState<Partial<Factura>>({
        numero: "",
        fecha: new Date().toISOString().slice(0, 10),
        proveedor: "",
        observaciones: ""
    });

    const fetchFacturas = async () => {
        setLoading(true);
        try {
            const f = await invoke("get_facturas") as Factura[];
            setFacturas(f);
        } catch (error) {
            console.error("Error fetching facturas:", error);
            toast.error("Error al cargar facturas");
        } finally {
            setLoading(false);
        }
    };

    const fetchFacturaItems = async (facturaId: number) => {
        setLoadingItems(true);
        try {
            const items = await invoke("get_factura_items", { facturaId }) as FacturaItem[];
            setFacturaItems(items);
        } catch (error) {
            console.error("Error fetching factura items:", error);
            toast.error("Error al cargar productos de la factura");
        } finally {
            setLoadingItems(false);
        }
    };

    useEffect(() => {
        if (active) {
            fetchFacturas();
        }
    }, [active]);

    const handleSelectFactura = (factura: Factura) => {
        setSelectedFactura(factura);
        if (factura.id) {
            fetchFacturaItems(factura.id);
        }
    };

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
            resetForm();
        } catch (error) {
            toast.error("Error: " + error);
        } finally {
            setActionLoading(false);
        }
    };

    const resetForm = () => {
        setEditMode(false);
        setFormData({
            numero: "",
            fecha: new Date().toISOString().slice(0, 10),
            proveedor: "",
            observaciones: ""
        });
    };

    const handleEdit = (e: React.MouseEvent, factura: Factura) => {
        e.stopPropagation();
        setFormData({ ...factura });
        setEditMode(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async () => {
        if (!confirmDeleteId) return;
        setActionLoading(true);
        try {
            await invoke("delete_factura", { id: confirmDeleteId });
            toast.success("Factura eliminada");
            fetchFacturas();
        } catch (error) {
            toast.error("Error: " + error);
        } finally {
            setActionLoading(false);
            setConfirmDeleteId(null);
        }
    };

    if (!active) return null;

    if (selectedFactura) {
        return (
            <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in slide-in-from-right duration-300">
                <button
                    onClick={() => setSelectedFactura(null)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    Volver al listado
                </button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                <FileText size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold">Factura {selectedFactura.numero}</h2>
                                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                                    <Calendar size={16} /> {selectedFactura.fecha}
                                    {selectedFactura.proveedor && (
                                        <>
                                            <span className="text-border">|</span>
                                            <Truck size={16} /> {selectedFactura.proveedor}
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-border p-4 rounded-2xl shadow-sm flex gap-8">
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total USD</p>
                            <p className="text-2xl font-black text-primary">
                                {formatCurrency(facturaItems.reduce((acc, item) => acc + item.total_usd, 0), "USD")}
                            </p>
                        </div>
                        <div className="w-px bg-border self-stretch" />
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Productos</p>
                            <p className="text-2xl font-black">{facturaItems.length}</p>
                        </div>
                    </div>
                </div>

                {selectedFactura.observaciones && (
                    <div className="bg-secondary/5 border border-border p-4 rounded-xl italic text-muted-foreground text-sm">
                        "{selectedFactura.observaciones}"
                    </div>
                )}

                <div className="bg-white border border-border rounded-3xl shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-secondary/5 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Producto</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Cant.</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Precio Unit.</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Total USD</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Total BS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loadingItems ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-8 h-12 bg-gray-50/50" />
                                    </tr>
                                ))
                            ) : facturaItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                                        No hay productos vinculados a esta factura.
                                    </td>
                                </tr>
                            ) : (
                                facturaItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-secondary/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-secondary rounded-lg text-muted-foreground">
                                                    <Package size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{item.producto_nombre}</p>
                                                    <p className="text-xs font-mono text-muted-foreground">{item.producto_codigo}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.tipo === 'ENTRADA'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {item.tipo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono font-bold">
                                            {item.cantidad}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-sm">
                                            {formatCurrency(item.precio_unitario_usd, "USD")}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="font-black text-sm">{formatCurrency(item.total_usd, "USD")}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-xs text-muted-foreground">{formatCurrency(item.total_bs, "VES")}</p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // Filtrado y Paginación
    const filteredFacturas = facturas.filter(f =>
        f.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.proveedor?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredFacturas.length / itemsPerPage);
    const paginatedFacturas = filteredFacturas.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold">Administrar Facturas</h2>
                <p className="text-muted-foreground mt-1">Registra y gestiona las facturas de tus proveedores.</p>
            </div>

            {/* Formulario de Registro */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border bg-secondary/5 flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <FilePlus size={20} />
                    </div>
                    <h3 className="font-bold text-lg">{editMode ? "Editar Factura" : "Nueva Factura"}</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold flex items-center gap-2">
                            <Hash size={14} className="text-muted-foreground" /> Número
                        </label>
                        <input
                            type="text" required
                            className="w-full px-4 py-2.5 border border-border rounded-xl font-mono text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            value={formData.numero}
                            onChange={e => setFormData({ ...formData, numero: e.target.value })}
                            placeholder="Ej. 001-00523"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold flex items-center gap-2">
                            <Calendar size={14} className="text-muted-foreground" /> Fecha
                        </label>
                        <input
                            type="date" required
                            className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            value={formData.fecha}
                            onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold flex items-center gap-2">
                            <Truck size={14} className="text-muted-foreground" /> Proveedor
                        </label>
                        <input
                            type="text"
                            className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            value={formData.proveedor || ""}
                            onChange={e => setFormData({ ...formData, proveedor: e.target.value })}
                            placeholder="Nombre de la empresa"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        {editMode && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2.5 border border-border text-muted-foreground hover:bg-secondary rounded-xl transition-all"
                            >
                                <X size={20} />
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={actionLoading}
                            className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {actionLoading ? "Procesando..." : editMode ? "Actualizar Factura" : "Registrar Factura"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Listado con Buscador y Paginación */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por número o proveedor..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none shadow-sm transition-all"
                        />
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-2 bg-white border border-border p-1 rounded-xl shadow-sm">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 hover:bg-secondary rounded-lg disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="text-xs font-bold px-3">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 hover:bg-secondary rounded-lg disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-32 bg-white border border-border rounded-2xl animate-pulse" />
                        ))
                    ) : filteredFacturas.length === 0 ? (
                        <div className="col-span-full py-12 bg-white border border-border rounded-3xl text-center text-muted-foreground italic">
                            No se encontraron facturas registradas.
                        </div>
                    ) : (
                        paginatedFacturas.map(f => (
                            <div
                                key={f.id}
                                onClick={() => handleSelectFactura(f)}
                                className="bg-white border border-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group relative overflow-hidden cursor-pointer active:scale-95"
                            >
                                <div className="absolute top-0 right-0 p-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleEdit(e, f)}
                                        className="p-1.5 bg-secondary text-muted-foreground hover:text-primary rounded-lg transition-colors"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(f.id!); }}
                                        className="p-1.5 bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-primary/5 rounded-xl text-primary">
                                        <FileText size={24} />
                                    </div>
                                    <div className="space-y-1 pr-12">
                                        <p className="font-mono font-bold text-sm text-foreground truncate">{f.numero}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Calendar size={12} /> {f.fecha}
                                        </p>
                                        {f.proveedor && (
                                            <p className="text-xs font-semibold text-primary mt-2 truncate">
                                                {f.proveedor}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={handleDelete}
                title="¿Eliminar factura?"
                description="Esta acción desvinculará los movimientos asociados a esta factura, pero no los eliminará del historial."
                variant="danger"
                confirmText="Eliminar permanentemente"
                loading={actionLoading}
            />
        </div>
    );
}
