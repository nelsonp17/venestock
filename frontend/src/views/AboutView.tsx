import { Info, Code, Shield, Mail, ExternalLink, Computer } from "lucide-react";

export function AboutView({ active }: { active: boolean }) {
    if (!active) return null;

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="text-center space-y-4 mb-12">
                <div className="w-24 h-24 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-sm border border-primary/20">
                    <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain opacity-80" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <Computer size={48} className="text-primary absolute" />
                </div>
                <h2 className="text-4xl font-extrabold tracking-tight">SGM Venestock</h2>
                <p className="text-xl text-muted-foreground font-medium">Sistema de Gestión de Inventario</p>
                <div className="inline-flex items-center space-x-2 bg-secondary/50 px-4 py-1.5 rounded-full border border-border">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    <span className="text-sm font-semibold tracking-wider text-muted-foreground">V 0.1.0 (Beta)</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Info Card */}
                <div className="bg-white p-8 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                        <Info size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-4">Acerca del Software</h3>
                    <p className="text-muted-foreground leading-relaxed">
                        SGM Venestock es una herramienta integral diseñada para simplificar y optimizar el control de inventario,
                        seguimiento de movimientos y cálculo de rentabilidad en tiempo real. Construido pensando en la velocidad
                        y la experiencia del usuario, permitiendo gestionar el catálogo de productos con tasas multi-divisa (USD/Bs).
                    </p>
                </div>

                {/* Tech Card */}
                <div className="bg-white p-8 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-600 mb-6">
                        <Code size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-4">Tecnologías</h3>
                    <ul className="space-y-3">
                        <li className="flex items-center space-x-3 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            <span><strong>Rust & Tauri</strong> para un backend nativo ultra rápido</span>
                        </li>
                        <li className="flex items-center space-x-3 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                            <span><strong>React & TypeScript</strong> para una interfaz dinámica</span>
                        </li>
                        <li className="flex items-center space-x-3 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                            <span><strong>SQLite</strong> para almacenamiento local seguro</span>
                        </li>
                        <li className="flex items-center space-x-3 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                            <span><strong>Tailwind CSS</strong> para diseño moderno</span>
                        </li>
                    </ul>
                </div>

                {/* License Card */}
                <div className="bg-white p-8 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
                        <Shield size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-4">Licencia Privada</h3>
                    <p className="text-muted-foreground leading-relaxed">
                        Este software es de uso privado y comercial bajo licencia restrictiva.
                        La copia, modificación, distribución o uso no autorizado de este código fuente
                        y sus binarios compilados están estrictamente prohibidos sin el consentimiento
                        expreso del desarrollador.
                    </p>
                </div>

                {/* Developer Card */}
                <div className="bg-primary/5 p-8 rounded-3xl border border-primary/20 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mb-6">
                        <Mail size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-4">Soporte y Contacto</h3>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                        ¿Tienes dudas, sugerencias o necesitas reportar un problema? Ponte en contacto con el equipo de desarrollo.
                    </p>
                    <a
                        href="mailto:nelsonportillo982@gmail.com"
                        className="inline-flex items-center justify-center space-x-2 w-full py-3 bg-white hover:bg-secondary/50 border border-primary/20 text-primary font-bold rounded-xl transition-colors"
                    >
                        <span>Contactar Desarrollador</span>
                        <ExternalLink size={18} />
                    </a>
                </div>
            </div>

            <div className="text-center pt-8 border-t border-border mt-12">
                <p className="text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} SGM Venestock. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
}
