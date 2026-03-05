import { LayoutDashboard, Package, History, Database } from "lucide-react";
import { cn } from "../lib/utils";

const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
    { icon: Package, label: "Inventario", id: "inventory" },
    { icon: History, label: "Movimientos", id: "movements" },
    { icon: Database, label: "Base de Datos", id: "database" }
];

export function Sidebar({ activeTab, onTabChange }: { activeTab: string, onTabChange: (id: string) => void }) {
    return (
        <div className="w-64 h-screen bg-white border-r border-border flex flex-col">
            <div className="p-6">
                <h1 className="text-2xl font-bold text-primary">SGM Venestock</h1>
            </div>

            <nav className="flex-1 px-4">
                <ul className="space-y-2">
                    {menuItems.map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => onTabChange(item.id)}
                                className={cn(
                                    "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                                    activeTab === item.id
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                )}
                            >
                                <item.icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* <div className="p-4 border-t border-border">
                <button className="w-full flex items-center space-x-3 px-4 py-3 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                    <LogOut size={20} />
                    <span className="font-medium">Salir</span>
                </button>
            </div> */}
        </div>
    );
}
