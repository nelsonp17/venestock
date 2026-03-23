import { Info, Code, Shield, Mail, ExternalLink, Key, CheckCircle, XCircle, Download, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { databases, APPWRITE_CONFIG } from "../lib/appwrite";
import { Query } from "appwrite";
import Logo from "/public/tauri.png";
import packageJson from "../../package.json";

export function AboutView({ active }: { active: boolean }) {
    const [license, setLicense] = useState<any>(null);
    const [contactLink, setContactLink] = useState("https://www.linkedin.com/in/nelson-portillo/");
    const [latestVersion, setLatestVersion] = useState(packageJson.version);
    const [downloadLink, setDownloadLink] = useState("");
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

    const currentVersion = packageJson.version;

    useEffect(() => {
        const saved = localStorage.getItem('venestock_license');
        if (saved) {
            try {
                setLicense(JSON.parse(saved));
            } catch (e) {
                console.error("Error parsing license:", e);
            }
        }

        // Fetch dynamic environment variables from Appwrite
        const fetchEnv = async () => {
            try {
                // Fetch contact link
                const contactRes = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.envCollectionId,
                    [Query.equal("name", "contact_link")]
                );
                if (contactRes.total > 0) {
                    setContactLink(contactRes.documents[0].value);
                }

                // Fetch version info
                const versionRes = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.envCollectionId,
                    [Query.equal("name", "latest_version")]
                );
                
                if (versionRes.total > 0) {
                    const latest = versionRes.documents[0].value;
                    setLatestVersion(latest);
                    
                    // Simple version comparison
                    if (latest !== currentVersion) {
                        setIsUpdateAvailable(true);
                        
                        // Fetch download link if update available
                        const linkRes = await databases.listDocuments(
                            APPWRITE_CONFIG.databaseId,
                            APPWRITE_CONFIG.envCollectionId,
                            [Query.equal("name", "latest_version_link")]
                        );
                        if (linkRes.total > 0) {
                            setDownloadLink(linkRes.documents[0].value);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching env data from Appwrite:", error);
            }
        };

        if (active) fetchEnv();
    }, [active, currentVersion]);

    if (!active) return null;

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4 mb-12">
                <div className="w-24 h-24 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-sm border border-primary/20">
                    <img src={Logo} alt="Logo" className="w-16 h-16 object-contain opacity-80" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
                <h2 className="text-4xl font-extrabold tracking-tight">SGM VeneStock</h2>
                <p className="text-xl text-muted-foreground font-medium">Sistema de Gestión de Inventario</p>
                <div className="flex flex-col items-center gap-3">
                    <div className="inline-flex items-center space-x-2 bg-secondary/50 px-4 py-1.5 rounded-full border border-border">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                        <span className="text-sm font-semibold tracking-wider text-muted-foreground">V {currentVersion}</span>
                    </div>

                    {isUpdateAvailable && (
                        <div className="animate-bounce inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-2xl border border-amber-200 shadow-sm">
                            <Sparkles size={16} />
                            <span className="text-xs font-black uppercase tracking-widest">¡Nueva Versión Disponible: {latestVersion}!</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Update Banner */}
            {isUpdateAvailable && downloadLink && (
                <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-amber-500/5 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-4 text-center md:text-left">
                        <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                            <Download size={24} />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-amber-900">Actualización del Sistema</h4>
                            <p className="text-amber-700/80 text-sm">Hay una versión más reciente disponible para descargar ({latestVersion}). Mejora el rendimiento y añade nuevas funciones.</p>
                        </div>
                    </div>
                    <a
                        href={downloadLink}
                        target="_blank"
                        className="bg-amber-500 hover:bg-amber-600 text-white font-black px-8 py-3 rounded-2xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 whitespace-nowrap"
                    >
                        Descargar v{latestVersion}
                    </a>
                </div>
            )}

            {/* License Information Card */}
            <div className="bg-gradient-to-br from-primary to-primary/80 p-8 rounded-3xl text-white shadow-xl shadow-primary/20 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                    <Shield size={120} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Key size={20} className="text-primary-foreground/70" />
                            <span className="text-sm font-bold uppercase tracking-widest text-primary-foreground/80">Información de Licencia</span>
                        </div>
                        <div>
                            <h3 className="text-3xl font-black">{license?.owner_name || "Versión No Activada"}</h3>
                            <p className="text-primary-foreground/80 font-mono mt-1">
                                {license?.key ? `Key: ${license.key}` : "Requiere una llave de producto válida"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20">
                        {license?.status === 'active' ? (
                            <>
                                <CheckCircle size={32} className="text-emerald-300" />
                                <div className="text-left">
                                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-100/70">Estado</p>
                                    <p className="text-lg font-black text-emerald-300">ACTIVA</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <XCircle size={32} className="text-red-300" />
                                <div className="text-left">
                                    <p className="text-xs font-bold uppercase tracking-wider text-red-100/70">Estado</p>
                                    <p className="text-lg font-black text-red-300">INACTIVA</p>
                                </div>
                            </>
                        )}
                    </div>
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
                        SGM VeneStock es una herramienta integral diseñada para simplificar y optimizar el control de inventario,
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
                        href={contactLink}
                        target="_blank"
                        className="inline-flex items-center justify-center space-x-2 w-full py-3 bg-white hover:bg-secondary/50 border border-primary/20 text-primary font-bold rounded-xl transition-colors"
                    >
                        <span>Contactar Desarrollador</span>
                        <ExternalLink size={18} />
                    </a>
                </div>
            </div>

            <div className="text-center pt-8 border-t border-border mt-12">
                <p className="text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} SGM VeneStock. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
}
