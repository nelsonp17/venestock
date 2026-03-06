import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "./components/Sidebar";
import { TasaWidget } from "./components/TasaWidget";
import { cn } from "./lib/utils";
import { InventoryView } from "./views/InventoryView";
import { MovementsView } from "./views/MovementsView";
import { FacturasView } from "./views/FacturasView";
import { DatabaseView } from "./views/DatabaseView";
import { CategoriesView } from "./views/CategoriesView";
import { DashboardView } from "./views/DashboardView";
import { AboutView } from "./views/AboutView";
import { LicenseGuard } from "./components/LicenseGuard";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <LicenseGuard>
      <div className="flex h-screen bg-secondary/30 selection:bg-primary/20">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 overflow-auto bg-gray-100">
          <DashboardView active={activeTab === "dashboard"} />
          <div className={cn("transition-all duration-300", activeTab === "inventory" ? "block" : "hidden")}>
            <InventoryView active={activeTab === "inventory"} />
          </div>
          <div className={cn("transition-all duration-300", activeTab === "movements" ? "block" : "hidden")}>
            <MovementsView active={activeTab === "movements"} onNavigateToFacturas={() => setActiveTab("facturas")} />
          </div>
          <div className={cn("transition-all duration-300", activeTab === "facturas" ? "block" : "hidden")}>
            <FacturasView active={activeTab === "facturas"} />
          </div>
          <div className={cn("transition-all duration-300", activeTab === "categories" ? "block" : "hidden")}>
            <CategoriesView active={activeTab === "categories"} />
          </div>
          <div className={cn("transition-all duration-300", activeTab === "database" ? "block" : "hidden")}>
            <DatabaseView active={activeTab === "database"} />
          </div>
          <div className={cn("transition-all duration-300", activeTab === "about" ? "block" : "hidden")}>
            <AboutView active={activeTab === "about"} />
          </div>
        </main>

        <TasaWidget />
        <Toaster position="top-center" />
      </div>
    </LicenseGuard>
  );
}

export default App;
