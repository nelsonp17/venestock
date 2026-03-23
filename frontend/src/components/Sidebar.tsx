import { LayoutDashboard, Package, History, FileText, Database, Tags, Info, ShoppingCart, LogOut } from "lucide-react";
import { cn } from "../lib/utils";

const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", roles: ["ADMIN", "GERENTE"] },
    { icon: ShoppingCart, label: "Punto de Venta", id: "pos", roles: ["ADMIN", "OPERADOR_POS", "GERENTE"] },
    { icon: Package, label: "Inventario", id: "inventory", roles: ["ADMIN", "ALMACENISTA", "GERENTE"] },
    { icon: History, label: "Movimientos", id: "movements", roles: ["ADMIN", "ALMACENISTA", "GERENTE"] },
    { icon: FileText, label: "Facturas", id: "facturas", roles: ["ADMIN", "GERENTE"] },
    { icon: Tags, label: "Categorías", id: "categories", roles: ["ADMIN", "ALMACENISTA", "GERENTE"] },
    { icon: Database, label: "Base de Datos", id: "database", roles: ["ADMIN"] },
    { icon: Info, label: "Acerca de", id: "about", roles: ["ADMIN", "OPERADOR_POS", "ALMACENISTA", "GERENTE"] },
];

export function Sidebar({ activeTab, onTabChange }: { activeTab: string, onTabChange: (id: string) => void }) {
    const savedLicense = JSON.parse(localStorage.getItem('venestock_license') || '{}');
    const userRole = savedLicense.role || 'ADMIN';

    const handleLogout = () => {
        if (confirm("¿Estás seguro de que deseas cerrar sesión? Esto eliminará la licencia de este equipo.")) {
            localStorage.removeItem('venestock_license');
            window.location.reload();
        }
    };

    const filteredMenu = menuItems.filter(item => item.roles.includes(userRole));

    return (
        <div className="w-64 h-screen bg-white border-r border-gray-300 flex flex-col">
            <div className="p-6">
                <h1 className="text-2xl font-bold text-primary">SGM VeneStock</h1>
                <div className="mt-1 flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest">
                        {userRole.replace('_', ' ')}
                    </span>
                </div>
            </div>

            <nav className="flex-1 px-4 overflow-y-auto">
                <ul className="space-y-2">
                    {filteredMenu.map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => onTabChange(item.id)}
                                className={cn(
                                    "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                                    activeTab === item.id
                                        ? "bg-primary text-primary-foreground shadow-md"
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

            <div className="p-4 border-t border-border bg-secondary/10">
                <div className="mb-4 px-4">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Usuario</p>
                    <p className="text-xs font-medium truncate">{savedLicense.owner_name || 'Usuario'}</p>
                </div>
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-destructive hover:bg-destructive/10 rounded-lg transition-colors group"
                >
                    <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
                    <span className="font-bold">Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
}
