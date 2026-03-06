export interface Producto {
    id: number | null;
    codigo: string;
    barras: string | null;
    nombre: string;
    descripcion: string | null;
    precio_ref_usd: number;
    precio_bs: number;
    categoria: string | null;
    subcategoria: string | null;
    stock: number;
    price_per_dolar: number;
}

export interface Tasa {
    id: number | null;
    valor: number;
    fecha: string;
    fuente: string;
}

export interface Movimiento {
    id: number | null;
    producto_id: number;
    tipo: 'ENTRADA' | 'SALIDA';
    cantidad: number;
    tasa_momento: number;
    total_usd: number;
    total_bs: number;
    price_per_dolar: number;
    fecha: string | null;
    factura_id: number | null;
}

export interface Factura {
    id: number | null;
    numero: string;
    fecha: string;
    proveedor: string | null;
    observaciones: string | null;
    created_at: string | null;
}

export interface FacturaItem {
    id: number;
    producto_id: number;
    producto_nombre: string;
    producto_codigo: string;
    cantidad: number;
    total_usd: number;
    total_bs: number;
    tipo: 'ENTRADA' | 'SALIDA';
    precio_unitario_usd: number;
}
