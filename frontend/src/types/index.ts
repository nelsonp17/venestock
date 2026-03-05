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
}
