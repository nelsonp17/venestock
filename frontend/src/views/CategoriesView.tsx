import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Pencil, Trash2, Tags, FolderTree, X, Save, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { SearchableSelect } from "../components/SearchableSelect";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "../components/ConfirmModal";

interface Categoria {
    id: number | null;
    nombre: string;
}

interface Subcategoria {
    id: number | null;
    nombre: string;
    categoria_id: number;
}

// ── Modales ────────────────────────────────────────────────────────────────────

function CategoriaModal({
    isOpen,
    onClose,
    onSave,
    categoria,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    categoria: Categoria | null;
}) {
    const [nombre, setNombre] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setNombre(categoria?.nombre ?? "");
    }, [categoria, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await invoke("upsert_categoria", {
                categoria: { id: categoria?.id ?? null, nombre },
            });
            toast.success(categoria ? "Categoría actualizada" : "Categoría creada");
            onSave();
            onClose();
        } catch (err) {
            toast.error("Error al guardar categoría: " + err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-5 border-b border-border">
                    <h3 className="text-lg font-bold">{categoria ? "Editar Categoría" : "Nueva Categoría"}</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold">Nombre</label>
                        <input
                            required
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="Ej. Alimentos"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-5 py-2 border border-border text-muted-foreground hover:bg-secondary rounded-xl transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition-all flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
                        >
                            <Save size={15} />
                            {loading ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function SubcategoriaModal({
    isOpen,
    onClose,
    onSave,
    subcategoria,
    categorias,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    subcategoria: Subcategoria | null;
    categorias: Categoria[];
}) {
    const [nombre, setNombre] = useState("");
    const [categoriaId, setCategoriaId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setNombre(subcategoria?.nombre ?? "");
        setCategoriaId(subcategoria?.categoria_id ?? null);
    }, [subcategoria, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoriaId) return toast.error("Selecciona una categoría padre.");
        setLoading(true);
        try {
            await invoke("upsert_subcategoria", {
                subcategoria: {
                    id: subcategoria?.id ?? null,
                    nombre,
                    categoria_id: categoriaId,
                },
            });
            toast.success(subcategoria ? "Subcategoría actualizada" : "Subcategoría creada");
            onSave();
            onClose();
        } catch (err) {
            toast.error("Error al guardar subcategoría: " + err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const catOptions = categorias
        .filter((c) => c.id !== null)
        .map((c) => ({ value: String(c.id!), label: c.nombre }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-5 border-b border-border">
                    <h3 className="text-lg font-bold">{subcategoria ? "Editar Subcategoría" : "Nueva Subcategoría"}</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold">Categoría Padre</label>
                        <SearchableSelect
                            options={catOptions}
                            value={categoriaId !== null ? String(categoriaId) : ""}
                            onChange={(v) => setCategoriaId(v ? parseInt(v) : null)}
                            placeholder="Seleccionar categoría..."
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold">Nombre</label>
                        <input
                            required
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="Ej. Lácteos"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-5 py-2 border border-border text-muted-foreground hover:bg-secondary rounded-xl transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition-all flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
                        >
                            <Save size={15} />
                            {loading ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Vista Principal ────────────────────────────────────────────────────────────

export function CategoriesView({ active }: { active: boolean }) {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
    const [selectedCat, setSelectedCat] = useState<number | null>(null);

    const [catModalOpen, setCatModalOpen] = useState(false);
    const [subModalOpen, setSubModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'cat' | 'sub', id: number } | null>(null);

    const [editingCat, setEditingCat] = useState<Categoria | null>(null);
    const [editingSub, setEditingSub] = useState<Subcategoria | null>(null);

    const fetchCategorias = async () => {
        try {
            const cats: Categoria[] = await invoke("get_categorias");
            setCategorias(cats);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchSubcategorias = async (catId: number | null) => {
        try {
            const subs: Subcategoria[] = await invoke("get_subcategorias", {
                categoriaId: catId,
            });
            setSubcategorias(subs);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (active) {
            fetchCategorias();
            fetchSubcategorias(selectedCat);
        }
    }, [active]);

    useEffect(() => {
        fetchSubcategorias(selectedCat);
    }, [selectedCat]);

    const executeDelete = async () => {
        if (!confirmDelete) return;
        try {
            if (confirmDelete.type === 'cat') {
                await invoke("delete_categoria", { id: confirmDelete.id });
                if (selectedCat === confirmDelete.id) setSelectedCat(null);
                toast.success("Categoría eliminada");
                fetchCategorias();
                fetchSubcategorias(null);
            } else {
                await invoke("delete_subcategoria", { id: confirmDelete.id });
                toast.success("Subcategoría eliminada");
                fetchSubcategorias(selectedCat);
            }
        } catch (e) {
            toast.error("Error: " + e);
        } finally {
            setConfirmDelete(null);
        }
    };

    if (!active) return null;

    const filteredSubs = selectedCat
        ? subcategorias.filter((s) => s.categoria_id === selectedCat)
        : subcategorias;

    const getCatName = (id: number) =>
        categorias.find((c) => c.id === id)?.nombre ?? "—";

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold">Categorías</h2>
                <p className="text-muted-foreground mt-1">
                    Organiza tus productos con categorías y subcategorías.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Categorías ─────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <div className="flex items-center gap-2 font-bold text-lg">
                            <Tags size={20} className="text-primary" />
                            Categorías
                        </div>
                        <button
                            onClick={() => { setEditingCat(null); setCatModalOpen(true); }}
                            className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition-all shadow-md active:scale-95"
                        >
                            <Plus size={15} />
                            Nueva
                        </button>
                    </div>

                    <ul className="divide-y divide-border">
                        {categorias.length === 0 && (
                            <li className="px-6 py-8 text-center text-sm text-muted-foreground">
                                Sin categorías. ¡Crea la primera!
                            </li>
                        )}
                        {categorias.map((cat) => (
                            <li
                                key={cat.id}
                                onClick={() => setSelectedCat(cat.id === selectedCat ? null : cat.id!)}
                                className={cn(
                                    "flex items-center justify-between px-6 py-3.5 cursor-pointer transition-colors group",
                                    selectedCat === cat.id
                                        ? "bg-primary/5 border-l-4 border-primary"
                                        : "hover:bg-secondary/50 border-l-4 border-transparent"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <ChevronRight
                                        size={14}
                                        className={cn(
                                            "text-muted-foreground transition-transform",
                                            selectedCat === cat.id && "rotate-90 text-primary"
                                        )}
                                    />
                                    <span className={cn("font-medium text-sm", selectedCat === cat.id && "text-primary")}>
                                        {cat.nombre}
                                    </span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingCat(cat); setCatModalOpen(true); }}
                                        className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'cat', id: cat.id! }); }}
                                        className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ── Subcategorías ──────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <div className="flex items-center gap-2 font-bold text-lg">
                            <FolderTree size={20} className="text-primary" />
                            Subcategorías
                            {selectedCat && (
                                <span className="text-xs font-normal text-muted-foreground ml-1">
                                    filtrado por: <span className="font-semibold text-primary">{getCatName(selectedCat)}</span>
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => { setEditingSub(null); setSubModalOpen(true); }}
                            className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition-all shadow-md active:scale-95"
                        >
                            <Plus size={15} />
                            Nueva
                        </button>
                    </div>

                    <ul className="divide-y divide-border">
                        {filteredSubs.length === 0 && (
                            <li className="px-6 py-8 text-center text-sm text-muted-foreground">
                                {selectedCat
                                    ? "Sin subcategorías para esta categoría."
                                    : "Sin subcategorías. ¡Crea la primera!"}
                            </li>
                        )}
                        {filteredSubs.map((sub) => (
                            <li
                                key={sub.id}
                                className="flex items-center justify-between px-6 py-3.5 hover:bg-secondary/50 transition-colors group"
                            >
                                <div>
                                    <p className="font-medium text-sm">{sub.nombre}</p>
                                    {!selectedCat && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {getCatName(sub.categoria_id)}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => { setEditingSub(sub); setSubModalOpen(true); }}
                                        className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => setConfirmDelete({ type: 'sub', id: sub.id! })}
                                        className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Modales */}
            <CategoriaModal
                isOpen={catModalOpen}
                onClose={() => setCatModalOpen(false)}
                onSave={fetchCategorias}
                categoria={editingCat}
            />
            <SubcategoriaModal
                isOpen={subModalOpen}
                onClose={() => setSubModalOpen(false)}
                onSave={() => fetchSubcategorias(selectedCat)}
                subcategoria={editingSub}
                categorias={categorias}
            />
            <ConfirmModal 
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={executeDelete}
                title={confirmDelete?.type === 'cat' ? "¿Eliminar categoría?" : "¿Eliminar subcategoría?"}
                description={confirmDelete?.type === 'cat' 
                    ? "Esta acción es irreversible y eliminará todas las subcategorías asociadas." 
                    : "Esta acción es irreversible."}
                variant="danger"
                confirmText="Eliminar"
            />
        </div>
    );
}
