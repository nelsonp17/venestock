import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
    Search,
    ShoppingCart,
    User,
    Trash2,
    Plus,
    Minus,
    CreditCard,
    X,
    UserPlus,
    Loader2,
    Barcode,
    ChevronRight
} from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";
import { Producto, Cliente, Movimiento, MetodoPago, PagoFactura, VentaPayload } from "../types";
import toast from "react-hot-toast";

import { PaymentModal } from "./PaymentModal";
import { ConfirmModal } from "../components/ConfirmModal";

interface CartItem {
    producto: Producto;
    cantidad: number;
}

export function POSView({ active }: { active?: boolean }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState("");
    const [productos, setProductos] = useState<Producto[]>([]);
    const [searchResults, setSearchResults] = useState<Producto[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [cedulaBusqueda, setCedulaBusqueda] = useState("");
    const [tasa, setTasa] = useState<number>(1);
    const [loading, setLoading] = useState(false);

    // Modales
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [newCliente, setNewCliente] = useState({ cedula: "", nombre: "", apellido: "", telefono: "", correo: "" });

    // Refs para el escáner y clicks fuera
    const searchInputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (active) {
            fetchTasa();
            fetchProductos();
            if (searchInputRef.current) searchInputRef.current.focus();
        }
    }, [active]);

    // Filtrar resultados en tiempo real
    useEffect(() => {
        if (search.trim().length > 0) {
            const filtered = productos.filter(p =>
                p.nombre.toLowerCase().includes(search.toLowerCase()) ||
                p.codigo.toLowerCase().includes(search.toLowerCase()) ||
                (p.barras && p.barras.includes(search))
            ).slice(0, 8); // Limitar a 8 sugerencias para velocidad
            setSearchResults(filtered);
            setSelectedIndex(0);
        } else {
            setSearchResults([]);
        }
    }, [search, productos]);

    // Listener de Teclado Global para el POS
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!active) return;

            const anyModalOpen = isPaymentModalOpen || isClientModalOpen || isConfirmClearOpen;

            // 1. Hotkeys principales (F1, F2, F12)
            if (e.key === "F1") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            if (e.key === "F2") {
                e.preventDefault();
                setIsClientModalOpen(true);
            }
            if (e.key === "F12") {
                e.preventDefault();
                if (cart.length > 0) setIsPaymentModalOpen(true);
            }

            // 2. Manejo de Escape (Cerrar modales o confirmar limpieza)
            if (e.key === "Escape") {
                if (isPaymentModalOpen) setIsPaymentModalOpen(false);
                else if (isClientModalOpen) {
                    setIsClientModalOpen(false);
                    setIsRegisterMode(false);
                }
                else if (isConfirmClearOpen) setIsConfirmClearOpen(false);
                else if (searchResults.length > 0) setSearchResults([]);
                else if (cart.length > 0) setIsConfirmClearOpen(true);
            }

            // 3. Omni-focus: Si presiona una tecla alfanumérica y no hay modales, enfocar buscador
            if (!anyModalOpen && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                if (document.activeElement !== searchInputRef.current) {
                    searchInputRef.current?.focus();
                }
            }

            // 4. Navegación de resultados (solo si no hay modales)
            if (!anyModalOpen && searchResults.length > 0) {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev + 1) % searchResults.length);
                }
                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [active, cart, isPaymentModalOpen, isClientModalOpen, isConfirmClearOpen, searchResults, selectedIndex]);

    const fetchTasa = async () => {
        try {
            const result: any = await invoke("get_tasa_actual");
            setTasa(result.valor);
        } catch (e) {
            console.error("Error fetching tasa:", e);
        }
    };

    const fetchProductos = async () => {
        try {
            const result: Producto[] = await invoke("get_productos");
            setProductos(result);
        } catch (e) {
            console.error("Error fetching products:", e);
        }
    };

    const addToCart = (producto: Producto) => {
        setCart(prev => {
            const existing = prev.find(item => item.producto.id === producto.id);
            if (existing) {
                return prev.map(item =>
                    item.producto.id === producto.id
                        ? { ...item, cantidad: item.cantidad + 1 }
                        : item
                );
            }
            return [...prev, { producto, cantidad: 1 }];
        });
        setSearch("");
        setSearchResults([]);
        searchInputRef.current?.focus();
    };

    const removeFromCart = (id: number) => {
        setCart(prev => prev.filter(item => item.producto.id !== id));
    };

    const updateQuantity = (id: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.producto.id === id) {
                const isUnit = item.producto.unidad.toUpperCase() === "UNID" || item.producto.unidad.toUpperCase() === "PZA";
                let newQty = item.cantidad + delta;

                if (isUnit) {
                    newQty = Math.max(1, Math.round(newQty));
                } else {
                    newQty = Math.max(0.01, Math.round(newQty * 1000) / 1000);
                }

                return { ...item, cantidad: newQty };
            }
            return item;
        }));
    };

    const handleSearchEnter = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            if (searchResults.length > 0) {
                // Añadir el producto seleccionado por el índice (flechas)
                addToCart(searchResults[selectedIndex]);
            } else if (search.trim()) {
                // Fallback: buscar match exacto (para escáner rápido que no disparó el useEffect)
                const matched = productos.find(p =>
                    p.codigo.toLowerCase() === search.toLowerCase() ||
                    (p.barras && p.barras === search)
                );
                if (matched) addToCart(matched);
            }
        }
    };

    const clearSale = () => {
        setCart([]);
        setCliente(null);
        setSearch("");
        setIsConfirmClearOpen(false);
        toast.success("Venta limpiada");
    };

    const totalUSD = cart.reduce((sum, item) => sum + (item.producto.precio_ref_usd * item.cantidad), 0);
    const totalBS = totalUSD * tasa;

    const handleSearchCliente = async () => {
        if (!cedulaBusqueda) return;
        setLoading(true);
        try {
            const result: Cliente | null = await invoke("get_cliente_by_cedula", { cedula: cedulaBusqueda });
            if (result) {
                setCliente(result);
                setIsClientModalOpen(false);
                setCedulaBusqueda("");
                toast.success(`Cliente: ${result.nombre} ${result.apellido}`);
            } else {
                setNewCliente({ ...newCliente, cedula: cedulaBusqueda });
                setIsRegisterMode(true);
                toast("Cliente no registrado. Ingrese los datos básicos.");
            }
        } catch (e) {
            toast.error("Error al buscar cliente");
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterCliente = async () => {
        if (!newCliente.nombre || !newCliente.apellido) {
            toast.error("Nombre y Apellido son obligatorios");
            return;
        }
        setLoading(true);
        try {
            const result: Cliente = await invoke("upsert_cliente", { cliente: newCliente });
            setCliente(result);
            setIsClientModalOpen(false);
            setIsRegisterMode(false);
            setNewCliente({ cedula: "", nombre: "", apellido: "", telefono: "", correo: "" });
            setCedulaBusqueda("");
            toast.success("Cliente registrado y asociado");
        } catch (e) {
            toast.error("Error al registrar cliente");
        } finally {
            setLoading(false);
        }
    };

    if (!active) return null;

    return (
        <div className="flex flex-col h-screen bg-secondary/10">
            {/* Header POS */}
            <div className="bg-white border-b border-border p-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-2 rounded-xl text-primary">
                        <ShoppingCart size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Punto de Venta</h2>
                        <div className="flex gap-4 text-xs font-medium text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <span className="bg-secondary px-1.5 py-0.5 rounded border border-border">F1</span> Buscar Producto
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="bg-secondary px-1.5 py-0.5 rounded border border-border">F2</span> Cliente
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="bg-secondary px-1.5 py-0.5 rounded border border-border">F12</span> Cobrar
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Tasa BCV</p>
                        <p className="text-lg font-black text-primary">{tasa.toFixed(2)} Bs/$</p>
                    </div>
                    <div className="h-10 w-px bg-border mx-2"></div>
                    <div className={cn(
                        "flex items-center gap-3 px-4 py-2 rounded-xl border transition-all",
                        cliente ? "bg-primary/5 border-primary/20" : "bg-white border-dashed border-border"
                    )}>
                        <div className={cn(
                            "p-1.5 rounded-lg",
                            cliente ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                        )}>
                            <User size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Cliente</p>
                            <p className="font-bold text-sm">
                                {cliente ? `${cliente.nombre} ${cliente.apellido}` : "Público General"}
                            </p>
                        </div>
                        {cliente && (
                            <button onClick={() => setCliente(null)} className="text-muted-foreground hover:text-destructive">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden p-4 gap-4">
                {/* Lado Izquierdo: Carrito */}
                <div className="flex-[2] bg-white rounded-3xl border border-border shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-border bg-secondary/5 relative z-40">
                        <div className="relative">
                            <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Escanear código o buscar nombre (F1)..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleSearchEnter}
                                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none shadow-sm transition-all text-lg font-medium"
                            />
                        </div>

                        {/* Lista de Resultados Flotante */}
                        {searchResults.length > 0 && (
                            <div
                                ref={resultsRef}
                                className="absolute left-4 right-4 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                            >
                                <div className="p-2 border-b border-border bg-secondary/10 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground ml-2">Resultados encontrados</span>
                                    <span className="text-[10px] text-muted-foreground font-medium">Usa ↑ ↓ y Enter</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {searchResults.map((p, index) => (
                                        <button
                                            key={p.id}
                                            onClick={() => addToCart(p)}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-4 transition-all border-b border-border/50 last:border-0",
                                                index === selectedIndex ? "bg-primary text-primary-foreground" : "hover:bg-secondary/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs",
                                                    index === selectedIndex ? "bg-white/20" : "bg-secondary text-muted-foreground"
                                                )}>
                                                    {p.codigo.slice(0, 3)}
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold">{p.nombre}</p>
                                                    <p className={cn(
                                                        "text-xs",
                                                        index === selectedIndex ? "text-white/70" : "text-muted-foreground"
                                                    )}>
                                                        {p.codigo} • {p.categoria || "Sin categoría"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="font-black">{formatCurrency(p.precio_ref_usd, "USD")}</p>
                                                    <p className={cn(
                                                        "text-[10px] font-bold",
                                                        index === selectedIndex ? "text-white/60" : "text-muted-foreground"
                                                    )}>
                                                        Stock: {p.stock} {p.unidad}
                                                    </p>
                                                </div>
                                                <ChevronRight size={16} className={index === selectedIndex ? "text-white" : "text-muted-foreground/30"} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto p-4">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4">
                                <div className="p-8 bg-secondary/50 rounded-full">
                                    <ShoppingCart size={64} strokeWidth={1} />
                                </div>
                                <p className="text-xl font-medium italic">El carrito está vacío</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {cart.map((item) => {
                                    const isOutStock = item.cantidad > item.producto.stock;
                                    return (
                                        <div key={item.producto.id} className={cn(
                                            "group flex items-center gap-4 p-4 bg-white border rounded-2xl transition-all",
                                            isOutStock ? "border-destructive bg-destructive/5" : "border-border hover:border-primary/30 hover:shadow-md"
                                        )}>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-lg">{item.producto.nombre}</h4>
                                                    {isOutStock && <span className="bg-destructive text-destructive-foreground text-[10px] px-2 py-0.5 rounded-full font-black uppercase">Sin Stock</span>}
                                                </div>
                                                <p className="text-sm text-muted-foreground font-mono">
                                                    {item.producto.codigo} • <span className={cn(isOutStock ? "text-destructive font-bold" : "")}>Disponible: {Number(item.producto.stock.toFixed(3))}</span>
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3 bg-secondary/50 p-1.5 rounded-xl border border-border">
                                                <button
                                                    onClick={() => updateQuantity(item.producto.id!, -1)}
                                                    className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:text-primary active:scale-90 transition-all"
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span className="w-12 text-center font-black text-lg">{item.cantidad}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.producto.id!, 1)}
                                                    className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:text-primary active:scale-90 transition-all"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>

                                            <div className="w-40 text-right">
                                                <p className="text-lg font-black text-primary">{formatCurrency(item.producto.precio_ref_usd * item.cantidad, "USD")}</p>
                                                <p className="text-xs font-bold text-muted-foreground">{formatCurrency(item.producto.precio_bs * item.cantidad, "BS")}</p>
                                            </div>

                                            <button
                                                onClick={() => removeFromCart(item.producto.id!)}
                                                className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-border bg-secondary/5 flex justify-between items-center">
                        <button
                            onClick={clearSale}
                            disabled={cart.length === 0}
                            className="px-6 py-3 text-muted-foreground hover:text-destructive font-bold transition-colors disabled:opacity-30"
                        >
                            Limpiar Venta (Esc)
                        </button>
                        <p className="text-sm text-muted-foreground italic">
                            {cart.length} productos registrados
                        </p>
                    </div>
                </div>

                {/* Lado Derecho: Resumen */}
                <div className="w-96 flex flex-col gap-4">
                    <div className="bg-white rounded-3xl border border-border shadow-sm p-6 space-y-6">
                        <h3 className="text-xl font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-4">Resumen</h3>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground font-medium">Subtotal</span>
                                <span className="font-bold">{formatCurrency(totalUSD, "USD")}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground font-medium">IVA (0%)</span>
                                <span className="font-bold">$0.00</span>
                            </div>
                            <div className="pt-4 border-t-2 border-dashed border-border flex flex-col gap-1">
                                <div className="flex justify-between items-end">
                                    <span className="text-lg font-bold">TOTAL</span>
                                    <span className="text-3xl font-black text-primary leading-none">
                                        {formatCurrency(totalUSD, "USD")}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-black text-muted-foreground italic">
                                        {formatCurrency(totalBS, "BS")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            disabled={cart.length === 0}
                            className="w-full bg-primary text-primary-foreground py-6 rounded-2xl font-black text-xl shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            <CreditCard size={28} />
                            <span>COBRAR (F12)</span>
                        </button>
                    </div>

                    <div className="bg-primary/5 rounded-3xl border border-primary/20 p-6 flex-1 flex flex-col justify-center items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                            <UserPlus size={32} />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-lg">¿Nuevo Cliente?</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Registra los datos del cliente para historial de facturación y fidelización.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsClientModalOpen(true)}
                            className="bg-white text-primary border border-primary/20 px-6 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-white/80 transition-all"
                        >
                            Buscar / Registrar (F2)
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal Cliente Simple / Registro */}
            {isClientModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10">
                            <h3 className="text-xl font-bold">{isRegisterMode ? "Nuevo Cliente" : "Asociar Cliente"}</h3>
                            <button onClick={() => { setIsClientModalOpen(false); setIsRegisterMode(false); }} className="text-muted-foreground hover:text-foreground">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            {!isRegisterMode ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-muted-foreground ml-1">Cédula / RIF</label>
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="V-12345678"
                                                value={cedulaBusqueda}
                                                onChange={(e) => setCedulaBusqueda(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleSearchCliente()}
                                                className="w-full pl-12 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSearchCliente}
                                        disabled={loading || !cedulaBusqueda}
                                        className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : <><Search size={20} /> <span>Buscar Cliente</span></>}
                                    </button>
                                </>
                            ) : (
                                <div className="space-y-4 animate-in slide-in-from-right duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nombre</label>
                                            <input
                                                type="text"
                                                autoFocus
                                                value={newCliente.nombre}
                                                onChange={(e) => setNewCliente({ ...newCliente, nombre: e.target.value })}
                                                className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Apellido</label>
                                            <input
                                                type="text"
                                                value={newCliente.apellido}
                                                onChange={(e) => setNewCliente({ ...newCliente, apellido: e.target.value })}
                                                className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Teléfono (Opcional)</label>
                                        <input
                                            type="text"
                                            value={newCliente.telefono}
                                            onChange={(e) => setNewCliente({ ...newCliente, telefono: e.target.value })}
                                            className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Correo (Opcional)</label>
                                        <input
                                            type="email"
                                            value={newCliente.correo}
                                            onChange={(e) => setNewCliente({ ...newCliente, correo: e.target.value })}
                                            className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => setIsRegisterMode(false)}
                                            className="flex-1 px-4 py-4 bg-secondary text-muted-foreground rounded-xl font-bold hover:bg-secondary/80 transition-all"
                                        >
                                            Volver
                                        </button>
                                        <button
                                            onClick={handleRegisterCliente}
                                            disabled={loading}
                                            className="flex-[2] bg-primary text-primary-foreground py-4 rounded-xl font-black shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : <><UserPlus size={20} /> <span>Registrar</span></>}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!isRegisterMode && (
                                <div className="text-center pt-2">
                                    <p className="text-xs text-muted-foreground">Si el cliente no existe, serás redirigido para su registro rápido.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Pago */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={() => {
                    setIsPaymentModalOpen(false);
                    setCart([]);
                    setCliente(null);
                    setSearch("");
                    searchInputRef.current?.focus();
                }}
                totalUSD={totalUSD}
                tasa={tasa}
                cart={cart}
                cliente={cliente}
            />

            <ConfirmModal
                isOpen={isConfirmClearOpen}
                onClose={() => setIsConfirmClearOpen(false)}
                onConfirm={clearSale}
                title="¿Limpiar venta actual?"
                description="Se eliminarán todos los productos del carrito y se desasociará al cliente. Esta acción no se puede deshacer."
                variant="danger"
                confirmText="Limpiar Venta"
            />
        </div>
    );
}
