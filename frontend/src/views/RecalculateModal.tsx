import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Calculator, Globe, Edit3, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

interface RecalculateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (rate: number) => Promise<void>;
}

export function RecalculateModal({ isOpen, onClose, onConfirm }: RecalculateModalProps) {
    const [method, setMethod] = useState<'bcv' | 'custom'>('bcv');
    const [bcvRate, setBcvRate] = useState<number>(0);
    const [customRate, setCustomRate] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchTasa = async () => {
                setLoading(true);
                try {
                    const tasa: any = await invoke("get_tasa_actual");
                    setBcvRate(tasa.valor);
                } catch (e) {
                    console.error("Error fetching tasa:", e);
                } finally {
                    setLoading(false);
                }
            };
            fetchTasa();
            setProcessing(false);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        const rate = method === 'bcv' ? bcvRate : parseFloat(customRate);
        if (isNaN(rate) || rate <= 0) {
            alert("Por favor ingrese una tasa válida");
            return;
        }

        setProcessing(true);
        try {
            await onConfirm(rate);
            onClose();
        } catch (error) {
            alert("Error al recalcular: " + error);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                    <Calculator size={24} />
                                </div>
                                <h3 className="text-xl font-bold">Recalcular Precios</h3>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-6">
                            <p className="text-muted-foreground text-center text-sm">
                                Selecciona el método para actualizar los precios de venta en bolívares de todo el inventario.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                {/* BCV Card */}
                                <button
                                    onClick={() => setMethod('bcv')}
                                    className={cn(
                                        "relative p-6 rounded-2xl border-2 transition-all text-left flex flex-col space-y-4 h-full",
                                        method === 'bcv'
                                            ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                                            : "border-border hover:border-primary/50 bg-white"
                                    )}
                                >
                                    <div className={cn(
                                        "p-3 rounded-xl w-fit transition-colors",
                                        method === 'bcv' ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                                    )}>
                                        <Globe size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">Tasa BCV</h4>
                                        <p className="text-[10px] text-muted-foreground leading-tight">Usa la tasa oficial guardada en sistema</p>
                                    </div>
                                    {loading ? (
                                        <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                                    ) : (
                                        <div className="text-xl font-black text-primary">
                                            {bcvRate.toFixed(2)} <span className="text-[10px] font-medium opacity-70">Bs/$</span>
                                        </div>
                                    )}
                                    {method === 'bcv' && (
                                        <div className="absolute top-2 right-2 text-primary">
                                            <Check size={18} />
                                        </div>
                                    )}
                                </button>

                                {/* Custom Card */}
                                <button
                                    onClick={() => setMethod('custom')}
                                    className={cn(
                                        "relative p-6 rounded-2xl border-2 transition-all text-left flex flex-col space-y-4 h-full",
                                        method === 'custom'
                                            ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                                            : "border-border hover:border-primary/50 bg-white"
                                    )}
                                >
                                    <div className={cn(
                                        "p-3 rounded-xl w-fit transition-colors",
                                        method === 'custom' ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                                    )}>
                                        <Edit3 size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">Personalizado</h4>
                                        <p className="text-[10px] text-muted-foreground leading-tight">Ingresa una tasa de cambio manual</p>
                                    </div>
                                    <div className="relative mt-auto">
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={customRate}
                                            onChange={(e) => setCustomRate(e.target.value)}
                                            disabled={method !== 'custom'}
                                            autoFocus={method === 'custom'}
                                            className={cn(
                                                "w-full bg-transparent border-none p-2 focus:ring-0 text-xl font-black placeholder:text-muted-foreground/30",
                                                method === 'custom' ? "text-primary" : "text-muted-foreground"
                                            )}
                                        />
                                        <span className="absolute right-0 bottom-1 text-[10px] font-medium opacity-70">Bs/$</span>
                                    </div>
                                    {method === 'custom' && (
                                        <div className="absolute top-2 right-2 text-primary">
                                            <Check size={18} />
                                        </div>
                                    )}
                                </button>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start space-x-3">
                                <div className="text-amber-600 mt-0.5"><Calculator size={16} /></div>
                                <p className="text-[11px] text-amber-800 leading-relaxed font-semibold">
                                    <span className="uppercase text-[10px]">Atención:</span> Esta acción recalculará los precios de <span className="underline">TODOS</span> los productos y no se puede deshacer.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-secondary/10 flex space-x-3">
                            <button
                                onClick={onClose}
                                disabled={processing}
                                className="flex-1 px-6 py-3 border border-border text-foreground hover:bg-white rounded-2xl transition-all font-bold text-sm disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={processing || (method === 'custom' && !customRate) || (method === 'bcv' && bcvRate <= 0)}
                                className="flex-1 px-6 py-3 bg-primary text-primary-foreground hover:opacity-90 rounded-2xl transition-all font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center space-x-2"
                            >
                                {processing ? (
                                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <span>Confirmar</span>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
