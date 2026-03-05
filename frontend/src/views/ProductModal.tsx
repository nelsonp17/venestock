import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Save } from "lucide-react";
import { Producto } from "../types";
import { SearchableSelect, SelectOption } from "../components/SearchableSelect";

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    product: Producto | null;
}

interface Categoria { id: number; nombre: string; }
interface Subcategoria { id: number; nombre: string; categoria_id: number; }

export function ProductModal({ isOpen, onClose, onSave, product }: ProductModalProps) {
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
        price_per_dolar: 1.0
    });

    const [tasa, setTasa] = useState(1.0);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
    const [filteredSubs, setFilteredSubs] = useState<Subcategoria[]>([]);

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
                const subs = await invoke<Subcategoria[]>("get_subcategorias", { categoria_id: null });
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
                price_per_dolar: tasa
            });
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
        // When category changes, clear subcategory
        setFormData({ ...formData, categoria: val, subcategoria: "" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const finalData = {
                ...formData,
                precio_ref_usd: typeof formData.precio_ref_usd === 'string' ? (parseFloat(formData.precio_ref_usd) || 0) : formData.precio_ref_usd
            };

            // Autogenerate barcode if missing
            if (!finalData.barras) {
                finalData.barras = finalData.codigo;
            }

            // Ensure price in Bs is calculated with latest tasa before saving
            finalData.precio_bs = parseFloat((finalData.precio_ref_usd * tasa).toFixed(2));
            finalData.price_per_dolar = tasa;

            await invoke("upsert_producto", { producto: finalData });
            onSave();
            onClose();
        } catch (error) {
            alert("Error al guardar producto: " + error);
        }
    };

    if (!isOpen) return null;

    const catOptions: SelectOption[] = categorias.map(c => ({ value: c.nombre, label: c.nombre }));
    const subOptions: SelectOption[] = filteredSubs.map(s => ({ value: s.nombre, label: s.nombre }));
    const selectedCat = categorias.find(c => c.nombre === formData.categoria);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h3 className="text-xl font-bold">{product ? "Editar Producto" : "Nuevo Producto"}</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold">Código Interno</label>
                        <input
                            required
                            value={formData.codigo}
                            onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                            className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="PROD-001"
                        />
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
                            <input
                                type="number" required
                                value={formData.stock}
                                onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                            />
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
    );
}
