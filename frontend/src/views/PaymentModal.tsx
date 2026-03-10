import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, CreditCard, Banknote, Plus, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";
import { MetodoPago, PagoFactura, VentaPayload, Producto, Cliente, Movimiento } from "../types";
import toast from "react-hot-toast";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    totalUSD: number;
    tasa: number;
    cart: { producto: Producto; cantidad: number }[];
    cliente: Cliente | null;
}

export function PaymentModal({ isOpen, onClose, onSuccess, totalUSD, tasa, cart, cliente }: PaymentModalProps) {
    const [metodos, setMetodos] = useState<MetodoPago[]>([]);
    const [pagos, setPagos] = useState<Partial<PagoFactura>[]>([]);
    const [loading, setLoading] = useState(false);

    // Formulario de nuevo pago
    const [selectedMetodo, setSelectedMetodo] = useState<number>(0);
    const [montoInput, setMontoInput] = useState("");
    const [monedaInput, setMonedaInput] = useState<'USD' | 'BS'>('BS');

    const totalBS = totalUSD * tasa;

    // Obtener total pagado en USD para cálculos de restante
    const totalPagadoUSD = pagos.reduce((sum, p) => {
        const valor = p.monto || 0;
        return sum + (p.moneda === 'BS' ? valor / tasa : valor);
    }, 0);

    const restanteUSD = totalUSD - totalPagadoUSD;
    const isTotalCovered = restanteUSD <= 0.01;

    // Efecto inicial al abrir el modal
    useEffect(() => {
        if (isOpen) {
            fetchMetodos();
            setPagos([]);
            // Inicializar con el monto total en la moneda por defecto (BS)
            setMontoInput((totalUSD * tasa).toFixed(2));
        }
    }, [isOpen]);

    // Efecto para recalcular montoInput cuando cambia la moneda o los pagos
    useEffect(() => {
        if (isOpen) {
            const faltante = Math.max(0, restanteUSD);
            const valorCalculado = monedaInput === 'BS' ? (faltante * tasa) : faltante;
            setMontoInput(valorCalculado.toFixed(2));
        }
    }, [monedaInput, pagos.length, isOpen]);

    // Restricciones de moneda según el método seleccionado
    useEffect(() => {
        if (selectedMetodo && metodos.length > 0) {
            const metodo = metodos.find(m => m.id === selectedMetodo);
            if (metodo) {
                if (metodo.nombre === 'Efectivo USD' || metodo.nombre === 'Zelle' || metodo.nombre === 'PayPal') {
                    setMonedaInput('USD');
                } else if (metodo.nombre === 'Efectivo BS') {
                    setMonedaInput('BS');
                }
                // Otros métodos (Punto, Pago Móvil, BioPago) permiten ambas monedas según el usuario
            }
        }
    }, [selectedMetodo, metodos]);

    const fetchMetodos = async () => {
        try {
            const result: MetodoPago[] = await invoke("get_metodos_pago");
            setMetodos(result);
            if (result.length > 0) {
                // Intentar seleccionar Punto de Venta por defecto (asumiendo que es el ID 5 o buscando por nombre)
                const punto = result.find(m => m.nombre === 'Punto de Venta');
                setSelectedMetodo(punto?.id || result[0].id!);
            }
        } catch (e) {
            console.error("Error fetching metodos:", e);
        }
    };

    const addPago = () => {
        const monto = parseFloat(montoInput);
        if (isNaN(monto) || monto <= 0) return;

        const nuevoPago: Partial<PagoFactura> = {
            metodo_id: selectedMetodo,
            monto: monto,
            moneda: monedaInput,
            tasa_referencia: tasa
        };

        setPagos([...pagos, nuevoPago]);
        // El useEffect se encargará de actualizar el montoInput con el nuevo restante
    };

    const removePago = (index: number) => {
        setPagos(pagos.filter((_, i) => i !== index));
    };

    const handleFinalizar = async () => {
        setLoading(true);
        try {
            const numeroFactura = `FAC-${Date.now()}`;

            const items: Movimiento[] = cart.map(item => ({
                producto_id: item.producto.id!,
                tipo: 'SALIDA',
                cantidad: item.cantidad,
                precio_unitario: item.producto.precio_ref_usd,
                tasa_momento: tasa,
                total_usd: item.producto.precio_ref_usd * item.cantidad,
                total_bs: (item.producto.precio_ref_usd * item.cantidad) * tasa,
                price_per_dolar: tasa
            }));

            const payload: VentaPayload = {
                factura: {
                    numero: numeroFactura,
                    fecha: new Date().toISOString(),
                    tipo: 'VENTA',
                    observaciones: `Venta POS - ${cliente ? 'Cliente: ' + cliente.nombre : 'Anónima'}`
                },
                items,
                pagos: pagos as PagoFactura[],
                cliente_id: cliente?.id
            };

            await invoke("procesar_venta", { payload });
            toast.success("Venta procesada con éxito");
            onSuccess();
        } catch (e: any) {
            toast.error(`Error: ${e}`);
        } finally {
            setLoading(false);
        }
    };

    // Función para saber si la moneda está bloqueada por el método
    const isMonedaDisabled = () => {
        const metodo = metodos.find(m => m.id === selectedMetodo);
        if (!metodo) return false;
        return ['Efectivo USD', 'Efectivo BS', 'Zelle', 'PayPal'].includes(metodo.nombre);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex overflow-hidden animate-in zoom-in duration-300">
                {/* Lado Izquierdo: Formulario de Pago */}
                <div className="flex-1 p-10 space-y-8">
                    <div className="flex justify-between items-center">
                        <h3 className="text-3xl font-black">Procesar Pago</h3>
                        <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-muted-foreground ml-1">Método</label>
                            <select
                                value={selectedMetodo}
                                onChange={(e) => setSelectedMetodo(parseInt(e.target.value))}
                                className="w-full p-4 bg-secondary/50 border border-border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                            >
                                {metodos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-muted-foreground ml-1">Moneda</label>
                            <div className={cn("flex p-1 bg-secondary/50 rounded-2xl border border-border", isMonedaDisabled() && "opacity-50 grayscale")}>
                                <button
                                    disabled={isMonedaDisabled()}
                                    onClick={() => setMonedaInput('USD')}
                                    className={cn("flex-1 py-3 rounded-xl font-bold transition-all", monedaInput === 'USD' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
                                >
                                    USD ($)
                                </button>
                                <button
                                    disabled={isMonedaDisabled()}
                                    onClick={() => setMonedaInput('BS')}
                                    className={cn("flex-1 py-3 rounded-xl font-bold transition-all", monedaInput === 'BS' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
                                >
                                    BS (Bs)
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-muted-foreground ml-1">Monto a pagar</label>
                        <div className="relative">
                            <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={24} />
                            <input
                                type="number"
                                step="0.01"
                                value={montoInput}
                                onChange={(e) => setMontoInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addPago()}
                                placeholder="0.00"
                                className="w-full pl-14 pr-4 py-6 bg-secondary/30 border-2 border-transparent focus:border-primary/20 rounded-3xl outline-none text-2xl font-black transition-all"
                            />
                            <button
                                onClick={addPago}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-3 rounded-2xl shadow-lg hover:opacity-90 active:scale-95 transition-all"
                            >
                                <Plus size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest border-b border-border pb-2">Desglose de pagos</h4>
                        <div className="max-h-48 overflow-auto space-y-2 pr-2">
                            {pagos.length === 0 ? (
                                <p className="text-center text-muted-foreground italic py-4">No hay pagos registrados</p>
                            ) : (
                                pagos.map((p, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-primary/5 rounded-2xl border border-primary/10 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                                                <CreditCard size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold">{metodos.find(m => m.id === p.metodo_id)?.nombre}</p>
                                                <p className="text-[10px] uppercase font-black text-muted-foreground">Confirmado</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <p className="text-lg font-black">{formatCurrency(p.monto || 0, p.moneda || 'USD')}</p>
                                            <button onClick={() => removePago(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Lado Derecho: Resumen Final */}
                <div className="w-96 bg-secondary/20 p-10 flex flex-col justify-between border-l border-border">
                    <div className="space-y-8">
                        <div>
                            <p className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-1">Total a Cobrar</p>
                            <h2 className="text-4xl font-black text-primary">{formatCurrency(totalUSD, "USD")}</h2>
                            <p className="text-xl font-bold text-muted-foreground italic">{formatCurrency(totalBS, "BS")}</p>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-white rounded-[2rem] shadow-sm border border-border">
                                <p className="text-xs font-black uppercase text-muted-foreground mb-4">Estado del Pago</p>
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Pagado ($)</span>
                                        <span className="font-bold text-green-600">+{formatCurrency(totalPagadoUSD, "USD")}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-border pt-4">
                                        <span className="text-sm font-bold">Restante ($)</span>
                                        <span className={cn("text-xl font-black", restanteUSD <= 0 ? "text-green-600" : "text-destructive")}>
                                            {formatCurrency(Math.max(0, restanteUSD), "USD")}
                                        </span>
                                    </div>
                                    {restanteUSD < -0.01 && (
                                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center animate-bounce">
                                            <span className="text-[10px] font-black uppercase text-blue-600">Cambio (BS)</span>
                                            <span className="font-black text-blue-700">{formatCurrency(Math.abs(restanteUSD) * tasa, "BS")}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleFinalizar}
                        disabled={!isTotalCovered || loading}
                        className={cn(
                            "w-full py-6 rounded-3xl font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-3",
                            isTotalCovered
                                ? "bg-primary text-primary-foreground shadow-primary/30 hover:opacity-90 active:scale-95"
                                : "bg-gray-200 text-muted-foreground cursor-not-allowed"
                        )}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={28} /> <span>FINALIZAR VENTA</span></>}
                    </button>
                </div>
            </div>
        </div>
    );
}
