import { useState, useEffect } from 'react';
import { databases, APPWRITE_CONFIG } from '../lib/appwrite';
import { Query } from 'appwrite';
import { ShieldAlert, Key, Loader2, CheckCircle2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

export function LicenseGuard({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<'checking' | 'unauthorized' | 'authorized'>('checking');
    const [inputKey, setInputKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        checkLocalLicense();

        // Verificación periódica cada minuto
        const interval = setInterval(() => {
            const saved = localStorage.getItem('venestock_license');
            if (saved) {
                try {
                    const license = JSON.parse(saved);
                    if (license.expiration_date) {
                        const expDate = new Date(license.expiration_date);
                        if (expDate <= new Date()) {
                            localStorage.removeItem('venestock_license');
                            invoke('validate_license', { status: 'inactive' });
                            setStatus('unauthorized');
                            return;
                        }
                    }
                    verifyWithServer(license.key, license.machine_id);
                } catch (e) {
                    console.error("Error parsing license for periodic check");
                }
            }
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    const getMachineId = async () => {
        try {
            const id = await invoke('get_machine_id') as string;
            return id.trim();
        } catch (e) {
            console.error("Error getting machine id:", e);
            return "unknown-machine";
        }
    };

    const checkLocalLicense = async () => {
        const saved = localStorage.getItem('venestock_license');
        if (!saved) {
            setStatus('unauthorized');
            return;
        }

        try {
            const license = JSON.parse(saved);
            const machineId = await getMachineId();

            if (license.machine_id !== machineId) {
                localStorage.removeItem('venestock_license');
                setStatus('unauthorized');
                return;
            }

            if (license.expiration_date) {
                const expDate = new Date(license.expiration_date);
                console.log(expDate);
                console.log(new Date());
                if (expDate < new Date()) {
                    localStorage.removeItem('venestock_license');
                    await invoke('validate_license', { status: 'inactive' });
                    setStatus('unauthorized');
                    return;
                }
            }

            await invoke('init_database', {
                url: license.turso_url || null,
                token: license.turso_token || null
            });

            setStatus('authorized');
            await invoke('validate_license', { status: 'active' });

            verifyWithServer(license.key, machineId);
        } catch (e) {
            await invoke('validate_license', { status: 'inactive' });
            setStatus('unauthorized');
        }
    };

    const verifyWithServer = async (key: string, machineId: string) => {
        try {
            const response = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collectionId,
                [Query.equal('key', key)]
            );

            const doc = response.documents[0];
            
            if (!doc || doc.status !== 'active' || doc.machine_id !== machineId) {
                localStorage.removeItem('venestock_license');
                await invoke('validate_license', { status: 'inactive' });
                setStatus('unauthorized');
                return;
            }

            if (doc.expiration_date) {
                const expDate = new Date(doc.expiration_date);
                if (expDate <= new Date()) {
                    localStorage.removeItem('venestock_license');
                    await invoke('validate_license', { status: 'inactive' });
                    setStatus('unauthorized');
                    return;
                }
            }

            // Actualizar rol y fecha en local por si cambió en el servidor
            const saved = JSON.parse(localStorage.getItem('venestock_license') || '{}');
            let updated = false;
            
            if (saved.role !== doc.role) {
                saved.role = doc.role || 'ADMIN';
                updated = true;
            }
            if (saved.expiration_date !== doc.expiration_date) {
                saved.expiration_date = doc.expiration_date;
                updated = true;
            }
            
            if (updated) {
                localStorage.setItem('venestock_license', JSON.stringify(saved));
            }
        } catch (e) {
            console.warn("Could not verify license with server, using offline mode.");
        }
    };

    const handleActivate = async () => {
        setLoading(true);
        setError('');
        try {
            const machineId = await getMachineId();

            const response = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collectionId,
                [Query.equal('key', inputKey)]
            );

            const doc = response.documents[0];

            if (!doc) throw new Error("Llave de producto no válida.");
            if (doc.status !== 'active') throw new Error("Esta licencia ha sido desactivada.");
            if (doc.machine_id && doc.machine_id !== machineId) throw new Error("Esta licencia ya está vinculada a otro equipo.");

            if (doc.expiration_date) {
                const expDate = new Date(doc.expiration_date);
                if (expDate < new Date()) throw new Error("Esta licencia ha expirado.");
            }

            if (!doc.machine_id) {
                await databases.updateDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collectionId,
                    doc.$id,
                    { machine_id: machineId, activated_at: new Date().toISOString() }
                );
            }

            const licenseData = {
                key: doc.key,
                owner_name: doc.owner_name,
                machine_id: machineId,
                status: 'active',
                role: doc.role || 'ADMIN',
                turso_url: doc.turso_db_url,
                turso_token: doc.turso_auth_token,
                expiration_date: doc.expiration_date
            };

            localStorage.setItem('venestock_license', JSON.stringify(licenseData));

            await invoke('init_database', {
                url: doc.turso_db_url || null,
                token: doc.turso_auth_token || null
            });

            await invoke('validate_license', { status: 'active' });
            setStatus('authorized');
        } catch (e: any) {
            setError(e.message || "Error al activar.");
        } finally {
            setLoading(false);
        }
    };

    if (status === 'checking') {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-secondary/20">
                <Loader2 className="animate-spin text-primary mb-4" size={48} />
                <p className="font-bold text-muted-foreground">Verificando licencia...</p>
            </div>
        );
    }

    if (status === 'unauthorized') {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-secondary/30 p-4">
                <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in duration-300">
                    <div className="p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center text-primary">
                            <ShieldAlert size={40} />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-black">Activar VeneStock</h2>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                Ingresa la llave de producto que recibiste al adquirir el software.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                <input
                                    type="text"
                                    placeholder="VENE-XXXX-XXXX-XXXX"
                                    value={inputKey}
                                    onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                                    className="w-full pl-12 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-mono text-sm transition-all"
                                />
                            </div>

                            {error && (
                                <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-lg border border-red-100 italic">
                                    {error}
                                </p>
                            )}

                            <button
                                onClick={handleActivate}
                                disabled={loading || !inputKey}
                                className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /><span>Activar Ahora</span></>}
                            </button>
                        </div>
                    </div>

                    <div className="p-6 bg-secondary/10 border-t border-border text-center">
                        <p className="text-xs text-muted-foreground">
                            ¿Problemas con tu licencia? <a href="https://www.linkedin.com/in/nelson-portillo/" target="_blank" className="text-primary font-bold hover:underline">Soporte</a>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
