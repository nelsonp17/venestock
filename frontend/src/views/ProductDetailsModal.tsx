import { X, Barcode, Tag, Package, DollarSign, Info, Layout } from "lucide-react";
import { Producto } from "../types";
import { formatCurrency } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ProductDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Producto | null;
}

export function ProductDetailsModal({ isOpen, onClose, product }: ProductDetailsModalProps) {
    if (!product) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
                    >
                        {/* Header */}
                        <div className="relative h-32 bg-gradient-to-br from-primary/10 to-primary/5 p-6 flex flex-col justify-end border-b border-border">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-md rounded-full text-muted-foreground hover:text-foreground transition-all shadow-sm active:scale-90"
                            >
                                <X size={20} />
                            </button>
                            <div className="flex items-center space-x-3 mb-1">
                                <div className="p-2 bg-primary/20 rounded-xl text-primary">
                                    <Package size={24} />
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest text-primary/60">Detalles del Producto</span>
                            </div>
                            <h3 className="text-2xl font-bold truncate pr-12">{product.nombre}</h3>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Categoria y Subcategoria */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 p-3 bg-secondary/20 rounded-2xl border border-border/50">
                                    <div className="flex items-center space-x-2 text-muted-foreground">
                                        <Layout size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Categoría</span>
                                    </div>
                                    <p className="font-semibold text-sm">{product.categoria || "Sin categoría"}</p>
                                </div>
                                <div className="space-y-1.5 p-3 bg-secondary/20 rounded-2xl border border-border/50">
                                    <div className="flex items-center space-x-2 text-muted-foreground">
                                        <Tag size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Subcategoría</span>
                                    </div>
                                    <p className="font-semibold text-sm">{product.subcategoria || "Sin subcategoría"}</p>
                                </div>
                            </div>

                            {/* Precios */}
                            <div className="bg-primary/5 rounded-3xl p-5 border border-primary/10 space-y-4">
                                <div className="flex justify-between items-end border-b border-primary/10 pb-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center space-x-2 text-primary/60">
                                            <DollarSign size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Precio Referencia</span>
                                        </div>
                                        <p className="text-4xl font-black text-primary">
                                            {formatCurrency(product.precio_ref_usd, "USD")}
                                        </p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <span className="text-[10px] font-bold text-muted-foreground bg-white px-2 py-0.5 rounded-full border border-border">
                                            Tasa: {product.price_per_dolar.toFixed(2)} Bs/$
                                        </span>
                                        <p className="text-xl font-bold text-foreground">
                                            {formatCurrency(product.precio_bs, "BS")}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center bg-white/50 p-3 rounded-2xl">
                                    <div className="flex items-center space-x-2 text-muted-foreground">
                                        <Package size={16} />
                                        <span className="text-xs font-semibold">Stock Disponible</span>
                                    </div>
                                    <div className="flex items-baseline space-x-1">
                                        <span className="text-2xl font-black text-foreground">{Number(product.stock.toFixed(3))}</span>
                                        <span className="text-xs font-bold text-muted-foreground uppercase">{product.unidad}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Codigos */}
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2 text-muted-foreground px-1">
                                    <Barcode size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Identificadores</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 border border-border rounded-2xl flex flex-col space-y-1 hover:border-primary/30 transition-colors">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Código Interno</span>
                                        <code className="text-xs font-mono font-bold bg-secondary/30 px-2 py-1 rounded-md self-start">{product.codigo}</code>
                                    </div>
                                    <div className="p-3 border border-border rounded-2xl flex flex-col space-y-1 hover:border-primary/30 transition-colors">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Código de Barras</span>
                                        <code className="text-xs font-mono font-bold bg-secondary/30 px-2 py-1 rounded-md self-start">{product.barras || "N/A"}</code>
                                    </div>
                                </div>
                            </div>

                            {/* Descripcion */}
                            {product.descripcion && (
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-muted-foreground px-1">
                                        <Info size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Descripción</span>
                                    </div>
                                    <div className="p-4 bg-secondary/5 border border-border rounded-2xl text-sm text-balance text-muted-foreground leading-relaxed italic">
                                        "{product.descripcion}"
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 pt-0">
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-secondary hover:bg-secondary/80 text-foreground font-bold rounded-2xl transition-all active:scale-[0.98]"
                            >
                                Entendido
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
