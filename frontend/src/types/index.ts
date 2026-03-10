export interface Producto {
    id?: null | number;
    codigo: string;
    barras?: string;
    nombre: string;
    descripcion?: string;
    precio_ref_usd: number;
    precio_bs: number;
    categoria?: string;
    subcategoria?: string;
    stock: number;
    unidad: string;
    price_per_dolar: number;
}

export interface Tasa {
    id?: number;
    valor: number;
    fecha: string;
    fuente: string;
}

export interface Movimiento {
    id?: number;
    producto_id: number;
    tipo: 'ENTRADA' | 'SALIDA';
    cantidad: number;
    precio_unitario: number;
    tasa_momento: number;
    total_usd: number;
    total_bs: number;
    price_per_dolar: number;
    fecha?: string;
    factura_id?: number;
}

export interface Categoria {
    id?: number;
    nombre: string;
}

export interface Subcategoria {
    id?: number;
    nombre: string;
    categoria_id: number;
}

export interface Factura {
    id?: number;
    numero: string;
    fecha: string;
    proveedor?: string;
    tipo: 'COMPRA' | 'VENTA';
    observaciones?: string;
    created_at?: string;
}

export interface Cliente {
    id?: number;
    cedula: string;
    nombre: string;
    apellido: string;
    telefono?: string;
    correo?: string;
}

export interface MetodoPago {
    id?: number;
    nombre: string;
}

export interface PagoFactura {
    id?: number;
    factura_id?: number;
    metodo_id: number;
    monto: number;
    tasa_referencia: number;
    moneda: 'USD' | 'BS';
}

export interface VentaPayload {
    factura: Partial<Factura>;
    items: Movimiento[];
    pagos: Partial<PagoFactura>[];
    cliente_id?: number;
}
