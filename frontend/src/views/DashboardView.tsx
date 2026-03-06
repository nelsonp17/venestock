import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "react-hot-toast";
import {
    Package, AlertTriangle, TrendingUp, TrendingDown, DollarSign,
    ArrowDownLeft, ArrowUpRight, BarChart2, RefreshCw
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell
} from "recharts";
import { cn, formatCurrency } from "../lib/utils";

interface DashboardStats {
    total_productos: number;
    stock_bajo: number;
    tasa_actual: number;
    total_inversion_usd: number;
    total_inversion_bs: number;
    total_ganancias_usd: number;
    total_ganancias_bs: number;
    total_perdidas_usd: number;
    total_perdidas_bs: number;
    top_entradas: ChartItem[];
    top_salidas: ChartItem[];
}

interface ChartItem {
    nombre: string;
    cantidad: number;
    total_usd: number;
    total_bs: number;
}

// ── Tooltip personalizado para recharts ────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
        const d: ChartItem = payload[0].payload;
        return (
            <div className="bg-white border border-border rounded-xl shadow-lg p-3 text-xs min-w-[160px]">
                <p className="font-bold text-foreground mb-1 leading-tight">{d.nombre}</p>
                <p className="text-muted-foreground">Cantidad: <span className="font-semibold text-foreground">{d.cantidad}</span></p>
                <p className="text-muted-foreground">USD: <span className="font-semibold text-primary">{formatCurrency(d.total_usd, "USD")}</span></p>
                <p className="text-muted-foreground">Bs: <span className="font-semibold text-foreground">{formatCurrency(d.total_bs, "BS")}</span></p>
            </div>
        );
    }
    return null;
}

// ── Tarjeta KPI ────────────────────────────────────────────────────────────────
function KpiCard({
    label, valueUSD, valueBS, icon: Icon, color, sublabel
}: {
    label: string;
    valueUSD: number;
    valueBS: number;
    icon: any;
    color: string;
    sublabel?: string;
}) {
    return (
        <div className={cn(
            "bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-all group"
        )}>
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground font-medium">{label}</p>
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", color)}>
                    <Icon size={17} />
                </div>
            </div>
            <div>
                <p className="text-2xl font-bold">{formatCurrency(valueUSD, "USD")}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{formatCurrency(valueBS, "BS")}</p>
            </div>
            {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
        </div>
    );
}

// ── Tarjeta de conteo simple ───────────────────────────────────────────────────
function CountCard({ label, value, icon: Icon, color, note }: {
    label: string; value: number; icon: any; color: string; note?: string;
}) {
    return (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground font-medium">{label}</p>
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", color)}>
                    <Icon size={17} />
                </div>
            </div>
            <p className="text-4xl font-bold">{value}</p>
            {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
        </div>
    );
}

// ── Vista principal ────────────────────────────────────────────────────────────
export function DashboardView({ active }: { active: boolean }) {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const s = await invoke<DashboardStats>("get_dashboard_stats");
            setStats(s);
            toast.success("Datos actualizados");
        } catch (e) {
            console.error("Dashboard stats error:", e);
            toast.error("Error al actualizar datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (active) fetchStats();
    }, [active]);

    if (!active) return null;

    const rentabilidad = stats
        ? stats.total_inversion_usd > 0
            ? ((stats.total_ganancias_usd / stats.total_inversion_usd) * 100).toFixed(1)
            : "0.0"
        : "0.0";

    const isProfit = stats ? stats.total_ganancias_usd >= stats.total_inversion_usd : true;

    // Truncate product names for bar chart axis
    const truncate = (s: string, n = 14) => s.length > n ? s.slice(0, n) + "…" : s;

    const entradasData = (stats?.top_entradas ?? []).map(d => ({ ...d, nombre: truncate(d.nombre) }));
    const salidasData = (stats?.top_salidas ?? []).map(d => ({ ...d, nombre: truncate(d.nombre) }));

    // Color palette for bars
    const entradaColors = ["#22c55e", "#16a34a", "#15803d", "#166534", "#14532d", "#052e16", "#a7f3d0", "#6ee7b7"];
    const salidaColors = ["#f97316", "#ea580c", "#c2410c", "#9a3412", "#7c2d12", "#43150a", "#fed7aa", "#fdba74"];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Panel de Control</h2>
                    <p className="text-muted-foreground mt-1">Resumen financiero y actividad del inventario.</p>
                </div>
                <button
                    onClick={fetchStats}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl text-sm font-medium hover:bg-secondary/50 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                    <RefreshCw size={15} className={cn(loading && "animate-spin")} />
                    Actualizar
                </button>
            </div>

            {/* ── Fila 1: Conteos ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <CountCard
                    label="Productos Totales"
                    value={stats?.total_productos ?? 0}
                    icon={Package}
                    color="bg-primary/10 text-primary"
                />
                <CountCard
                    label="Stock Bajo"
                    value={stats?.stock_bajo ?? 0}
                    icon={AlertTriangle}
                    color="bg-destructive/10 text-destructive"
                    note="≤ 5 unidades"
                />
                <div className="bg-white rounded-2xl border border-border shadow-sm p-5 hover:shadow-md transition-all group">
                    <p className="text-sm text-muted-foreground font-medium mb-3">Tasa Actual</p>
                    <p className="text-4xl font-bold text-primary">{formatCurrency(stats?.tasa_actual ?? 0, "BS")}</p>
                    <p className="text-xs text-muted-foreground mt-1">por dólar</p>
                </div>
                <div className={cn(
                    "rounded-2xl border shadow-sm p-5 hover:shadow-md transition-all",
                    isProfit ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                )}>
                    <p className="text-sm font-medium mb-3 text-muted-foreground">Rentabilidad</p>
                    <p className={cn("text-4xl font-bold", isProfit ? "text-green-700" : "text-red-700")}>
                        {rentabilidad}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{isProfit ? "Ganancia" : "Pérdida"} neta</p>
                </div>
            </div>

            {/* ── Fila 2: KPIs financieros ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                    label="Total Inversión"
                    valueUSD={stats?.total_inversion_usd ?? 0}
                    valueBS={stats?.total_inversion_bs ?? 0}
                    icon={DollarSign}
                    color="bg-blue-500/10 text-blue-600"
                    sublabel="Suma de todas las compras (ENTRADA)"
                />
                <KpiCard
                    label="Total Ganancias"
                    valueUSD={stats?.total_ganancias_usd ?? 0}
                    valueBS={stats?.total_ganancias_bs ?? 0}
                    icon={TrendingUp}
                    color="bg-green-500/10 text-green-600"
                    sublabel="Suma de todas las ventas (SALIDA)"
                />
                <KpiCard
                    label={isProfit ? "Retorno sobre inversión" : "Total Pérdidas"}
                    valueUSD={isProfit
                        ? (stats?.total_ganancias_usd ?? 0) - (stats?.total_inversion_usd ?? 0)
                        : (stats?.total_perdidas_usd ?? 0)}
                    valueBS={isProfit
                        ? (stats?.total_ganancias_bs ?? 0) - (stats?.total_inversion_bs ?? 0)
                        : (stats?.total_perdidas_bs ?? 0)}
                    icon={isProfit ? TrendingUp : TrendingDown}
                    color={isProfit ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}
                    sublabel={isProfit ? "Diferencia positiva entre ventas y compras" : "Inversión aún no recuperada"}
                />
            </div>

            {/* ── Fila 3: Gráficas ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfica Entradas */}
                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
                        <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center text-green-600">
                            <ArrowDownLeft size={16} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Top Productos — Entradas</h3>
                            <p className="text-xs text-muted-foreground">Por cantidad total ingresada</p>
                        </div>
                    </div>
                    <div className="p-4 h-64">
                        {entradasData.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center">
                                    <BarChart2 size={32} className="text-muted-foreground/30 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">Sin datos de entradas aún</p>
                                </div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={entradasData} margin={{ top: 4, right: 4, left: -20, bottom: 24 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis
                                        dataKey="nombre"
                                        tick={{ fontSize: 10, fill: "#888" }}
                                        angle={-30}
                                        textAnchor="end"
                                        interval={0}
                                        dy={8}
                                    />
                                    <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                                    <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                        {entradasData.map((_, index) => (
                                            <Cell key={index} fill={entradaColors[index % entradaColors.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Gráfica Salidas */}
                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
                        <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center text-orange-600">
                            <ArrowUpRight size={16} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Top Productos — Salidas</h3>
                            <p className="text-xs text-muted-foreground">Por cantidad total vendida</p>
                        </div>
                    </div>
                    <div className="p-4 h-64">
                        {salidasData.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center">
                                    <BarChart2 size={32} className="text-muted-foreground/30 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">Sin datos de salidas aún</p>
                                </div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={salidasData} margin={{ top: 4, right: 4, left: -20, bottom: 24 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis
                                        dataKey="nombre"
                                        tick={{ fontSize: 10, fill: "#888" }}
                                        angle={-30}
                                        textAnchor="end"
                                        interval={0}
                                        dy={8}
                                    />
                                    <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                                    <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                        {salidasData.map((_, index) => (
                                            <Cell key={index} fill={salidaColors[index % salidaColors.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
