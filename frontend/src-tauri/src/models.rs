use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Producto {
    pub id: Option<i32>,
    pub codigo: String,
    pub barras: Option<String>,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub precio_ref_usd: f64,
    pub precio_bs: f64,
    pub categoria: Option<String>,
    pub subcategoria: Option<String>,
    pub stock: f64,
    pub unidad: String,
    pub price_per_dolar: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Tasa {
    pub id: Option<i32>,
    pub valor: f64,
    pub fecha: NaiveDateTime,
    pub fuente: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Movimiento {
    pub id: Option<i32>,
    pub producto_id: i32,
    pub tipo: String,
    pub cantidad: f64,
    pub precio_unitario: f64,
    pub tasa_momento: f64,
    pub total_usd: f64,
    pub total_bs: f64,
    pub price_per_dolar: f64,
    pub fecha: Option<NaiveDateTime>,
    pub factura_id: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Categoria {
    pub id: Option<i32>,
    pub nombre: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Subcategoria {
    pub id: Option<i32>,
    pub nombre: String,
    pub categoria_id: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Factura {
    pub id: Option<i32>,
    pub numero: String,
    pub fecha: String,
    pub proveedor: Option<String>,
    pub tipo: String, // 'COMPRA' o 'VENTA'
    pub observaciones: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Cliente {
    pub id: Option<i32>,
    pub cedula: String,
    pub nombre: String,
    pub apellido: String,
    pub telefono: Option<String>,
    pub correo: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MetodoPago {
    pub id: Option<i32>,
    pub nombre: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PagoFactura {
    pub id: Option<i32>,
    pub factura_id: Option<i32>,
    pub metodo_id: i32,
    pub monto: f64,
    pub tasa_referencia: f64,
    pub moneda: String,
}
