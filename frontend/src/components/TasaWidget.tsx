import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RefreshCcw, ChevronRight, ChevronLeft } from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";
import { TasaConfirmModal } from "./TasaConfirmModal";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export function TasaWidget() {
    const [tasa, setTasa] = useState<{ valor: number; fuente: string; fecha: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [tempTasa, setTempTasa] = useState<number>(0);

    const fetchTasa = async () => {
        try {
            const result: any = await invoke("get_tasa_actual");
            setTasa(result);
        } catch (error) {
            console.error("Error fetching tasa:", error);
        }
    };

    const handleScrapeBCV = async () => {
        setLoading(true);
        try {
            const result: any = await invoke("fetch_bcv_tasa");
            setTempTasa(result.valor);
            setShowConfirm(true);
        } catch (error) {
            toast.error("Error al obtener tasa BCV: " + error);
        } finally {
            setLoading(false);
        }
    };

    const confirmSaveTasa = async () => {
        setLoading(true);
        try {
            const saved: any = await invoke("save_tasa", { valor: tempTasa, fuente: "BCV" });
            setTasa(saved);
            setShowConfirm(false);
            toast.success("Tasa actualizada correctamente");
        } catch (error) {
            toast.error("Error al guardar la tasa: " + error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasa();
    }, []);

    return (
        <div className="fixed bottom-6 right-6 flex flex-col items-end z-40">
            <div className="flex items-center gap-2">
                <motion.div
                    layout
                    className="bg-white backdrop-blur-md border-gray-300 border rounded-2xl shadow-gray-400 shadow-lg overflow-hidden flex items-center"
                >
                    {/* Botón de minimizar/expandir (Icono lateral) */}
                    {/* <button 
                        onClick={() => setMinimized(!minimized)}
                        className="p-4 hover:bg-secondary/50 transition-colors border-r border-border/50 text-primary"
                    >
                        <DollarSign size={24} className={cn("transition-transform duration-300", minimized ? "scale-110" : "scale-100")} />
                    </button> */}

                    <AnimatePresence>
                        {!minimized && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: "auto", opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="flex items-center space-x-4 p-4 pr-6 whitespace-nowrap"
                            >
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Tasa Activa</p>
                                    <p className="text-2xl font-black text-foreground tabular-nums">
                                        {tasa ? formatCurrency(tasa.valor, "BS") : "---"}
                                    </p>
                                    <p className="text-[9px] text-muted-foreground opacity-80">
                                        {tasa ? `${tasa.fuente} • ${tasa.fecha.split('T')[0].replace(/-/g, "/")}` : "Cargando..."}
                                    </p>
                                </div>
                                <button
                                    onClick={handleScrapeBCV}
                                    disabled={loading}
                                    className="p-2.5 bg-primary/5 hover:bg-primary/10 rounded-xl transition-all disabled:opacity-50 group border border-primary/10"
                                    title="Actualizar desde BCV"
                                >
                                    <RefreshCcw className={cn("text-primary", loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500")} size={18} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Indicador visual de estado */}
                <button
                    onClick={() => setMinimized(!minimized)}
                    className="w-8 h-8 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                >
                    {minimized ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
            </div>

            <TasaConfirmModal
                isOpen={showConfirm}
                loading={loading}
                valor={tempTasa}
                onClose={() => setShowConfirm(false)}
                onConfirm={confirmSaveTasa}
            />
        </div>
    );
}
