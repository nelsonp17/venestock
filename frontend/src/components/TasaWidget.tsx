import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DollarSign, RefreshCcw } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { TasaConfirmModal } from "./TasaConfirmModal";
import { toast } from "react-hot-toast";

export function TasaWidget() {
    const [tasa, setTasa] = useState<{ valor: number; fuente: string; fecha: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
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
        <div className="fixed bottom-6 right-6 flex flex-col items-end space-y-2 z-40">
            <div className="bg-white/80 backdrop-blur-md border-border border rounded-2xl shadow-xl p-4 flex items-center space-x-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                    <DollarSign className="text-primary" size={24} />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tasa Activa</p>
                    <p className="text-2xl font-bold text-foreground">
                        {tasa ? formatCurrency(tasa.valor, "BS") : "---"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                        {tasa ? `Fuente: ${tasa.fuente} (${tasa.fecha.split('T')[0].replace(/-/g, "/")})` : "Cargando..."}
                    </p>
                </div>
                <button
                    onClick={handleScrapeBCV}
                    disabled={loading}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50 group"
                    title="Actualizar desde BCV"
                >
                    <RefreshCcw className={cn("text-muted-foreground group-hover:text-foreground", loading ? "animate-spin" : "")} size={20} />
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
import { cn } from "../lib/utils";
