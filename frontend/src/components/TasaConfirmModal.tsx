import { DollarSign, X } from "lucide-react";
import { formatCurrency } from "../lib/utils";

interface TasaConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    valor: number;
    loading: boolean;
}

export function TasaConfirmModal({ isOpen, onClose, onConfirm, valor, loading }: TasaConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <DollarSign size={24} />
                        </div>
                        <button 
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <h3 className="text-xl font-bold mb-2">Nueva Tasa Detectada</h3>
                    <p className="text-muted-foreground text-sm mb-6">
                        Se ha encontrado una actualización en el portal del BCV. ¿Desea aplicar esta nueva tasa al sistema?
                    </p>

                    <div className="bg-secondary/30 rounded-xl p-4 mb-6 flex flex-col items-center">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Valor Encontrado</span>
                        <span className="text-3xl font-black text-primary">{formatCurrency(valor, "BS")}</span>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-secondary/50 transition-all disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {loading ? "Guardando..." : "Confirmar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
