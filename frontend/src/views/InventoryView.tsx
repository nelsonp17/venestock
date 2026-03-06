import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Search, Edit2, Trash2, Calculator, Barcode, FileText, FileSpreadsheet } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { ProductModal } from "./ProductModal.tsx";
import { LabelModal } from "./LabelModal.tsx";
import { RecalculateModal } from "./RecalculateModal.tsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Producto } from "../types";
import toast from "react-hot-toast";
import { ConfirmModal } from "../components/ConfirmModal";

export function InventoryView({ active }: { active?: boolean }) {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [labelOpen, setLabelOpen] = useState(false);
    const [recalculateOpen, setRecalculateOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const [productToDelete, setProductToDelete] = useState<Producto | null>(null);

    const fetchProductos = async () => {
        setLoading(true);
        try {
            const result: Producto[] = await invoke("get_productos");
            setProductos(result);
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    const executeDeleteProduct = async () => {
        if (!productToDelete) return;
        try {
            await invoke("delete_producto", { id: productToDelete.id });
            toast.success("Producto eliminado");
            await fetchProductos();
        } catch (error) {
            console.error("Error deleting product:", error);
            toast.error("Error al eliminar el producto");
        } finally {
            setProductToDelete(null);
        }
    };

    const handleRecalculate = async (tasa: number) => {
        try {
            await invoke("recalculate_prices", { tasa });
            await fetchProductos();
            toast.success("Precios actualizados con éxito");
        } catch (error) {
            throw error; // Let the modal handle it
        }
    };

    const exportToPDF = async () => {
        try {
            const doc = new jsPDF();
            doc.text("Reporte de Inventario - SGM Venestock", 14, 15);

            const tableData = filtered.map(p => [
                p.codigo,
                p.nombre,
                formatCurrency(p.precio_ref_usd, "USD"),
                formatCurrency(p.precio_bs, "BS"),
                p.stock.toString()
            ]);

            autoTable(doc, {
                head: [["Código", "Nombre", "Precio ($)", "Precio (Bs)", "Stock"]],
                body: tableData,
                startY: 20,
            });

            const dataUri = doc.output("datauristring");
            const base64 = dataUri.split(",")[1];
            const fileName = `inventario_${new Date().toISOString().split('T')[0]}.pdf`;

            await invoke("save_export_file", {
                filename: fileName,
                base64Data: base64
            });

            toast.success("PDF guardado en Descargas");
        } catch (error) {
            console.error("Error al exportar PDF:", error);
            toast.error("No se pudo generar el PDF");
        }
    };

    const exportToExcel = async () => {
        try {
            const worksheet = XLSX.utils.json_to_sheet(filtered.map(p => ({
                Código: p.codigo,
                Nombre: p.nombre,
                Referencia_USD: p.precio_ref_usd,
                Precio_BS: p.precio_bs,
                Categoría: p.categoria,
                Stock: p.stock
            })));
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");

            const excelBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
            const fileName = `inventario_${new Date().toISOString().split('T')[0]}.xlsx`;

            await invoke("save_export_file", {
                filename: fileName,
                base64Data: excelBase64
            });

            toast.success("Excel guardado en Descargas");
        } catch (error) {
            console.error("Error al exportar Excel:", error);
            toast.error("No se pudo generar el Excel");
        }
    };

    useEffect(() => {
        if (active !== false) {
            fetchProductos();
        }
    }, [active]);

    const filtered = productos.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo.toLowerCase().includes(search.toLowerCase()) ||
        (p.barras && p.barras.includes(search))
    );

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold">Inventario</h2>
                    <p className="text-muted-foreground mt-1">Gestiona tus productos y actualiza precios en lote.</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setRecalculateOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 border border-primary text-primary hover:bg-primary/5 rounded-xl transition-colors font-medium active:scale-95"
                    >
                        <Calculator size={18} />
                        <span>Recalcular Precios</span>
                    </button>
                    <button
                        onClick={() => { setEditingProduct(null); setModalOpen(true); }}
                        className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition-all font-medium shadow-sm active:scale-95"
                    >
                        <Plus size={18} />
                        <span>Nuevo Producto</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border bg-secondary/10 flex justify-between items-center">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, código o barras..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={exportToPDF}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors" title="Exportar PDF">
                            <FileText size={20} />
                        </button>
                        <button
                            onClick={exportToExcel}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors" title="Exportar Excel">
                            <FileSpreadsheet size={20} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-secondary/5 text-xs uppercase tracking-wider text-muted-foreground">
                                <th className="px-6 py-4 font-semibold">Código</th>
                                <th className="px-6 py-4 font-semibold">Producto</th>
                                <th className="px-6 py-4 font-semibold text-right">Ref ($)</th>
                                <th className="px-6 py-4 font-semibold text-right">Bs.</th>
                                <th className="px-6 py-4 font-semibold text-center whitespace-nowrap">Tasa Ref.</th>
                                <th className="px-6 py-4 font-semibold text-center">Disponibilidad</th>
                                <th className="px-6 py-4 font-semibold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">Cargando productos...</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">No se encontraron productos.</td>
                                </tr>
                            ) : filtered.map((p) => (
                                <tr key={p.id} className="hover:bg-secondary/5 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-xs">{p.codigo}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-foreground">{p.nombre}</div>
                                        <div className="text-xs text-muted-foreground">{p.categoria || "Sin categoría"}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold text-primary">
                                        {formatCurrency(p.precio_ref_usd, "USD")}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-foreground">
                                        {formatCurrency(p.precio_bs, "BS")}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md font-semibold">
                                            <span>{p.price_per_dolar.toFixed(2)}</span>
                                            <span>Bs/$</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold">
                                        {p.stock}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingProduct(p); setModalOpen(true); }}
                                                className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedProduct(p); setLabelOpen(true); }}
                                                className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                                                <Barcode size={16} />
                                            </button>
                                            <button
                                                onClick={() => setProductToDelete(p)}
                                                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ProductModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={fetchProductos}
                product={editingProduct}
            />

            <LabelModal
                isOpen={labelOpen}
                onClose={() => setLabelOpen(false)}
                product={selectedProduct}
            />

            <RecalculateModal
                isOpen={recalculateOpen}
                onClose={() => setRecalculateOpen(false)}
                onConfirm={handleRecalculate}
            />

            <ConfirmModal
                isOpen={!!productToDelete}
                onClose={() => setProductToDelete(null)}
                onConfirm={executeDeleteProduct}
                title="¿Eliminar producto?"
                description={`¿Está seguro que desea eliminar "${productToDelete?.nombre}"? Esta acción no se puede deshacer y borrará permanentemente el registro.`}
                variant="danger"
                confirmText="Eliminar"
            />
        </div>
    );
}
