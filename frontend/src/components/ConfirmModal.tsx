import { AlertTriangle, X } from "lucide-react";
import { cn } from "../lib/utils";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "primary";
    loading?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "primary",
    loading = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center",
                            variant === "danger" ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                        )}>
                            <AlertTriangle size={24} />
                        </div>
                        <button 
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <h3 className="text-xl font-bold mb-2">{title}</h3>
                    <p className="text-muted-foreground text-sm mb-6">
                        {description}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-secondary/50 transition-all disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className={cn(
                                "flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50",
                                variant === "danger" 
                                    ? "bg-red-600 shadow-red-200" 
                                    : "bg-primary shadow-primary/20"
                            )}
                        >
                            {loading ? "Procesando..." : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
