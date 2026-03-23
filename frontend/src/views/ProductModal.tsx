import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Save, HelpCircle, Info, Barcode } from "lucide-react";
import { Producto } from "../types";
import { SearchableSelect, SelectOption } from "../components/SearchableSelect";
import { generateBarcode } from "../lib/utils";
import toast from "react-hot-toast";

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    product: Producto | null;
}

interface Categoria { id: number; nombre: string; }
interface Subcategoria { id: number; nombre: string; categoria_id: number; }

export function ProductModal({ isOpen, onClose, onSave, product }: ProductModalProps) {
    const barcodeRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState<Producto>({
        id: null,
        codigo: "",
        barras: "",
        nombre: "",
        descripcion: "",
        precio_ref_usd: 1.0,
        precio_bs: 0.0,
        categoria: "",
        subcategoria: "",
        stock: 0,
        unidad: "UNID",
        price_per_dolar: 1.0
    });

    const [tasa, setTasa] = useState(1.0);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
    const [filteredSubs, setFilteredSubs] = useState<Subcategoria[]>([]);
    const [showHelp, setShowHelp] = useState(false);

    // Fetch tasa on open
    useEffect(() => {
        const fetchTasa = async () => {
            try {
                const t: any = await invoke("get_tasa_actual");
                setTasa(t.valor);
            } catch (e) {
                console.error("Error fetching tasa in modal:", e);
            }
        };
        if (isOpen) fetchTasa();
    }, [isOpen]);

    // Fetch categorias and subcategorias on open
    useEffect(() => {
        if (!isOpen) return;
        const fetchAll = async () => {
            try {
                const cats = await invoke<Categoria[]>("get_categorias");
                const subs = await invoke<Subcategoria[]>("get_subcategorias", { categoriaId: null });
                setCategorias(cats);
                setSubcategorias(subs);
            } catch (e) {
                console.error("Error fetching categorias:", e);
            }
        };
        fetchAll();
    }, [isOpen]);

    // Update form when product or tasa changes
    useEffect(() => {
        if (product) {
            setFormData(product);
        } else {
            setFormData({
                id: null,
                codigo: "",
                barras: "",
                nombre: "",
                descripcion: "",
                precio_ref_usd: 1.0,
                precio_bs: tasa,
                categoria: "",
                subcategoria: "",
                stock: 0,
                unidad: "UNID",
                price_per_dolar: tasa
            });
            // Autofocus on barcode field for new products
            if (isOpen) {
                setTimeout(() => barcodeRef.current?.focus(), 100);
            }
        }
    }, [product, isOpen, tasa]);

    // Filter subcategorias when categoria changes
    useEffect(() => {
        const selectedCat = categorias.find(c => c.nombre === formData.categoria);
        if (selectedCat) {
            setFilteredSubs(subcategorias.filter(s => s.categoria_id === selectedCat.id));
        } else {
            setFilteredSubs(subcategorias);
        }
    }, [formData.categoria, subcategorias, categorias]);

    const handlePriceUSDChange = (val: string) => {
        const numVal = parseFloat(val) || 0;
        setFormData({
            ...formData,
            precio_ref_usd: val as any,
            precio_bs: parseFloat((numVal * tasa).toFixed(2))
        });
    };

    const handleCategoriaChange = (val: string) => {
        setFormData({ ...formData, categoria: val, subcategoria: "" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let cleanStock = parseFloat(formData.stock.toString()) || 0;
            const isUnit = formData.unidad.toUpperCase() === "UNID" || formData.unidad.toUpperCase() === "PAQ" || formData.unidad.toUpperCase() === "PZA";

            if (isUnit) {
                cleanStock = Math.round(cleanStock);
            } else {
                cleanStock = Math.round(cleanStock * 1000) / 1000;
            }

            const finalData = {
                ...formData,
                stock: cleanStock,
                precio_ref_usd: typeof formData.precio_ref_usd === 'string' ? (parseFloat(formData.precio_ref_usd) || 0) : formData.precio_ref_usd
            };

            // LÓGICA INTELIGENTE DE CÓDIGOS
            // 1. Si no hay código de barras, generamos uno interno para etiquetas
            if (!finalData.barras) {
                finalData.barras = generateBarcode("750", "001");
            }
            
            // 2. Si no hay código interno (nombre corto) pero sí de barras (escaneado), usamos el de barras como interno
            if (!finalData.codigo) {
                finalData.codigo = finalData.barras;
            }

            finalData.precio_bs = parseFloat((finalData.precio_ref_usd * tasa).toFixed(2));
            finalData.price_per_dolar = tasa;

            await invoke("upsert_producto", { producto: finalData });
            onSave();
            onClose();
        } catch (error) {
            toast.error("Error al guardar producto: " + error);
        }
    };

    if (!isOpen) return null;

    const catOptions: SelectOption[] = categorias.map(c => ({ value: c.nombre, label: c.nombre }));
    const subOptions: SelectOption[] = filteredSubs.map(s => ({ value: s.nombre, label: s.nombre }));
    const selectedCat = categorias.find(c => c.nombre === formData.categoria);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh]">
                <div className="flex justify-between items-center p-6 border-b border-border bg-white sticky top-0 z-10">
                    <div className="flex items-center space-x-4">
                        <h3 className="text-xl font-bold">{product ? "Editar Producto" : "Nuevo Producto"}</h3>
                        <button
                            type="button"
                            onClick={() => setShowHelp(!showHelp)}
                            className={`p-1.5 rounded-lg transition-all flex items-center space-x-2 text-[10px] font-black uppercase tracking-tighter ${showHelp ? "bg-primary text-primary-foreground shadow-inner" : "bg-secondary text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <HelpCircle size={14} />
                            <span>{showHelp ? "Cerrar Ayuda" : "¿Ayuda?"}</span>
                        </button>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X size={24} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
                    {showHelp && (
                        <div className="p-6 bg-primary/5 border-b border-primary/10 animate-in slide-in-from-top-4 duration-300">
                            <div className="flex items-start space-x-3">
                                <Info className="text-primary mt-1 shrink-0" size={20} />
                                <div className="space-y-3 text-sm">
                                    <p className="font-bold text-primary italic">Instrucciones de Inventario:</p>
                                    <ul className="space-y-2 text-muted-foreground leading-relaxed">
                                        <li>• <span className="text-foreground font-semibold">Código de Barras:</span> Escanea el código del fabricante aquí. Si lo dejas vacío, el sistema generará uno automático.</li>
                                        <li>• <span className="text-foreground font-semibold">Código Interno:</span> Identificador corto. Si lo dejas vacío, se usará el código de barras.</li>
                                        <li>• <span className="text-foreground font-semibold">Nombre:</span> Nombre del producto (ej. Arroz Mary 1kg).</li>
                                        <li>• <span className="text-foreground font-semibold">Precio Ref ($):</span> Precio de venta en dólares.</li>
                                        <li>• <span className="text-foreground font-semibold">Stock Inicial:</span> Cantidad física disponible.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center space-x-2">
                                    <Barcode size={14} className="text-primary" />
                                    <span>Código de Barras</span>
                                </label>
                                <input
                                    ref={barcodeRef}
                                    value={formData.barras}
                                    onChange={e => setFormData({ ...formData, barras: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-mono"
                                    placeholder="Escanea el código aquí..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-muted-foreground">Código Interno (Opcional)</label>
                                <input
                                    value={formData.codigo}
                                    onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="Ej. HAR-PAN"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Nombre del Producto</label>
                            <input
                                required
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="Ej. Harina Pan 1kg"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-primary">Precio Ref ($)</label>
                                <input
                                    type="number" step="any" required
                                    value={formData.precio_ref_usd}
                                    onChange={e => handlePriceUSDChange(e.target.value)}
                                    className="w-full px-4 py-2 border border-primary/30 rounded-xl focus:ring-2 focus:ring-primary/20 bg-primary/5 font-bold outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Stock Inicial</label>
                                <div className="flex space-x-2">
                                    <input
                                        type="number" step="any" required
                                        value={formData.stock}
                                        onChange={e => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                    />
                                    <select
                                        value={formData.unidad}
                                        onChange={e => setFormData({ ...formData, unidad: e.target.value })}
                                        className="px-2 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-white text-sm font-semibold"
                                    >
                                        <option value="UNID">UNID</option>
                                        <option value="KG">KG</option>
                                        <option value="G">G</option>
                                        <option value="L">L</option>
                                        <option value="ML">ML</option>
                                        <option value="PAQ">PAQ</option>
                                        <option value="BULT">BULT</option>
                                        <option value="PACA">PACA</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Categoría</label>
                                <SearchableSelect
                                    options={catOptions}
                                    value={formData.categoria || ""}
                                    onChange={handleCategoriaChange}
                                    placeholder="Seleccionar categoría..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Subcategoría</label>
                                <SearchableSelect
                                    options={subOptions}
                                    value={formData.subcategoria || ""}
                                    onChange={(val) => setFormData({ ...formData, subcategoria: val })}
                                    placeholder={selectedCat ? "Seleccionar..." : "Primero elige categoría"}
                                    disabled={subOptions.length === 0}
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2 border border-border text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition-all shadow-md flex items-center space-x-2"
                            >
                                <Save size={18} />
                                <span>Guardar Producto</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
