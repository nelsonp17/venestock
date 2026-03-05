import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DollarSign, RefreshCcw } from "lucide-react";
import { formatCurrency } from "../lib/utils";

export function TasaWidget() {
    const [tasa, setTasa] = useState<{ valor: number; fuente: string; fecha: string } | null>(null);
    const [loading, setLoading] = useState(false);

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
            if (confirm(`Nueva tasa BCV encontrada: ${result.valor}. ¿Desea guardarla?`)) {
                const saved: any = await invoke("save_tasa", { valor: result.valor, fuente: "BCV" });
                setTasa(saved);
            }
        } catch (error) {
            alert("Error al obtener tasa BCV: " + error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasa();
    }, []);

    return (
        <div className="fixed bottom-6 right-6 flex flex-col items-end space-y-2">
            <div className="bg-white border border-border rounded-2xl shadow-lg p-4 flex items-center space-x-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                    <DollarSign className="text-primary" size={24} />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tasa Activa</p>
                    <p className="text-2xl font-bold text-foreground">
                        {tasa ? formatCurrency(tasa.valor, "BS") : "---"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                        {tasa ? `Fuente: ${tasa.fuente} (${tasa.fecha.split('T')[0]})` : "Cargando..."}
                    </p>
                </div>
                <button
                    onClick={handleScrapeBCV}
                    disabled={loading}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
                    title="Actualizar desde BCV"
                >
                    <RefreshCcw className={loading ? "animate-spin" : ""} size={20} />
                </button>
            </div>
        </div>
    );
}
