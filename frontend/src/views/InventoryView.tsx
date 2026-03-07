import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Search, Edit2, Trash2, Calculator, QrCode, FileText, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";
import { ProductModal } from "./ProductModal.tsx";
import { LabelModal } from "./LabelModal.tsx";
import { RecalculateModal } from "./RecalculateModal.tsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Producto } from "../types";
import toast from "react-hot-toast";
import { ConfirmModal } from "../components/ConfirmModal";
import logoUrl from "../../public/tauri.png";

export function InventoryView({ active }: { active?: boolean }) {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [labelOpen, setLabelOpen] = useState(false);
    const [recalculateOpen, setRecalculateOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [productToDelete, setProductToDelete] = useState<Producto | null>(null);
    const [tasa, setTasa] = useState<{ valor: number; fuente: string; fecha: string } | null>(null);

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchTasa = async () => {
        try {
            const result: any = await invoke("get_tasa_actual");
            setTasa(result);
        } catch (error) {
            console.error("Error fetching tasa:", error);
        }
    };

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

    const toggleSelection = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === paginatedProducts.length && paginatedProducts.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(paginatedProducts.map(p => p.id!));
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
            // 1. Encabezado personalizado

            doc.addImage(logoUrl, 'PNG', 14, 10, 20, 20);

            // Ajustamos los textos para que no se pisen con el logo
            doc.setFontSize(18);
            doc.text("VeneStock - Reporte de Inventario", 40, 18); // Desplazado a la derecha (x=40)

            doc.setFontSize(10);
            doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 40, 25);
            doc.text(`Tasa aplicada: ${tasa?.valor || 0.00} Bs/$`, 40, 30);

            const tableData = filtered.map(p => [
                p.codigo,
                p.nombre,
                formatCurrency(p.precio_ref_usd, "USD"),
                p.price_per_dolar,
                formatCurrency(p.precio_bs, "BS"),
                `${p.stock} ${p.unidad}`
            ]);

            autoTable(doc, {
                head: [["Código", "Nombre", "Precio ($)", "Tasa", "Precio (Bs)", "Stock"]],
                body: tableData,
                startY: 40,
                headStyles: { fillColor: [30, 64, 175] } // Color azul para el header de la tabla
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
                Stock: p.stock,
                Unidad: p.unidad
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
            fetchTasa();
        }
    }, [active]);

    // Resetear a la primera página cuando se busca
    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds([]);
    }, [search]);

    const filtered = productos.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo.toLowerCase().includes(search.toLowerCase()) ||
        (p.barras && p.barras.includes(search))
    );

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedProducts = filtered.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const selectedProducts = productos.filter(p => selectedIds.includes(p.id!));

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold">Inventario</h2>
                    <p className="text-muted-foreground mt-1">Gestiona tus productos y actualiza precios en lote.</p>
                </div>
                <div className="flex space-x-3">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={() => setLabelOpen(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl transition-all font-bold shadow-lg shadow-primary/20 active:scale-95 animate-in zoom-in"
                        >
                            <QrCode size={18} />
                            <span>Imprimir QR ({selectedIds.length})</span>
                        </button>
                    )}
                    <button
                        onClick={() => setRecalculateOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-primary text-primary hover:bg-gray-200 rounded-xl transition-colors font-medium active:scale-95"
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

            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
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
                            <tr className="bg-secondary/5 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                                <th className="px-6 py-4 text-center w-10">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                                        checked={selectedIds.length === paginatedProducts.length && paginatedProducts.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-4 font-semibold">Código</th>
                                <th className="px-6 py-4 font-semibold">Producto</th>
                                <th className="px-6 py-4 font-semibold text-right">Ref ($)</th>
                                <th className="px-6 py-4 font-semibold text-center whitespace-nowrap">Tasa Ref.</th>
                                <th className="px-6 py-4 font-semibold text-right">Bs.</th>
                                <th className="px-6 py-4 font-semibold text-center">Disponibilidad</th>
                                <th className="px-6 py-4 font-semibold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">Cargando productos...</td>
                                </tr>
                            ) : paginatedProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">No se encontraron productos.</td>
                                </tr>
                            ) : paginatedProducts.map((p) => (
                                <tr key={p.id} className={cn(
                                    "hover:bg-secondary/5 transition-colors group",
                                    selectedIds.includes(p.id!) && "bg-primary/5"
                                )}>
                                    <td className="px-6 py-4 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                                            checked={selectedIds.includes(p.id!)}
                                            onChange={() => toggleSelection(p.id!)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs">{p.codigo}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-foreground">{p.nombre}</div>
                                        <div className="text-xs text-muted-foreground">{p.categoria || "Sin categoría"}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold text-primary">
                                        {formatCurrency(p.precio_ref_usd, "USD")}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md font-semibold">
                                            <span>{p.price_per_dolar.toFixed(2)}</span>
                                            <span>Bs/$</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-foreground">
                                        {formatCurrency(p.precio_bs, "BS")}
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold">
                                        {p.stock} <span className="text-[10px] text-muted-foreground ml-1">{p.unidad}</span>
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

                {/* Footer con Paginación */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-border bg-secondary/5 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            Mostrando <span className="font-bold text-foreground">{paginatedProducts.length}</span> de <span className="font-bold text-foreground">{filtered.length}</span> productos
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

            <ProductModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={fetchProductos}
                product={editingProduct}
            />

            <LabelModal
                isOpen={labelOpen}
                onClose={() => { setLabelOpen(false); setSelectedIds([]); }}
                products={selectedProducts}
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
