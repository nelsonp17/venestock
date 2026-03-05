import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TasaWidget } from "./components/TasaWidget";
import { cn, formatCurrency } from "./lib/utils";
import { InventoryView } from "./views/InventoryView";
import { MovementsView } from "./views/MovementsView";
import { invoke } from "@tauri-apps/api/core";

function Dashboard({ active }: { active: boolean }) {
  const [stats, setStats] = useState({ total_productos: 0, stock_bajo: 0, tasa_actual: 0 });

  const fetchStats = async () => {
    try {
      const s: any = await invoke("get_stats");
      setStats(s);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (active) {
      fetchStats();
    }
  }, [active]);

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6">Panel de Control</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Productos Totales</p>
          <p className="text-4xl font-bold mt-2">{stats.total_productos}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Stock Bajo</p>
          <p className="text-4xl font-bold mt-2 text-destructive">{stats.stock_bajo}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Categorías</p>
          <p className="text-4xl font-bold mt-2">---</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Tasa Actual (Bs)</p>
          <p className="text-4xl font-bold mt-2 text-primary">{formatCurrency(stats.tasa_actual, "BS")}</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("inventory");

  return (
    <div className="flex h-screen bg-secondary/30 selection:bg-primary/20">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-auto">
        <div className={cn("transition-all duration-300", activeTab === "dashboard" ? "block" : "hidden")}>
          <Dashboard active={activeTab === "dashboard"} />
        </div>
        <div className={cn("transition-all duration-300", activeTab === "inventory" ? "block" : "hidden")}>
          <InventoryView active={activeTab === "inventory"} />
        </div>
        <div className={cn("transition-all duration-300", activeTab === "movements" ? "block" : "hidden")}>
          <MovementsView active={activeTab === "movements"} />
        </div>
      </main>

      <TasaWidget />
    </div>
  );
}

export default App;
