mod db;
mod models;
mod scraper;

use models::{Producto, Tasa, Movimiento, Factura, Cliente, PagoFactura, FacturaCliente};
use libsql::{Database, Connection};
use tauri::{Manager, State};
use base64::{Engine as _, engine::general_purpose};
use std::fs;
use tauri::path::BaseDirectory;
use std::sync::{Mutex, Arc};

#[derive(serde::Serialize)]
struct ProductoChartItem {
    nombre: String,
    unidad: String,
    cantidad: f64,
    total_usd: f64,
    total_bs: f64,
}

#[derive(serde::Serialize)]
struct DashboardStats {
    total_productos: i64,
    stock_bajo: i64,
    tasa_actual: f64,
    total_inversion_usd: f64,
    total_inversion_bs: f64,
    total_ganancias_usd: f64,
    total_ganancias_bs: f64,
    total_perdidas_usd: f64,
    total_perdidas_bs: f64,
    top_entradas: Vec<ProductoChartItem>,
    top_salidas: Vec<ProductoChartItem>,
}

struct AppState {
    db: Mutex<Option<Arc<Database>>>,
    license_active: Mutex<bool>,
}

fn get_conn(state: &State<'_, AppState>) -> Result<Connection, String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or_else(|| "Base de datos no inicializada".to_string())?;
    db.connect().map_err(|e| e.to_string())
}

#[tauri::command]
async fn validate_license(state: State<'_, AppState>, status: String) -> Result<(), String> {
    let mut active = state.license_active.lock().unwrap();
    *active = status == "active";
    Ok(())
}

fn is_licensed(state: &State<'_, AppState>) -> bool {
    *state.license_active.lock().unwrap()
}

#[tauri::command]
async fn init_database(
    app: tauri::AppHandle, 
    state: State<'_, AppState>,
    url: Option<String>,
    token: Option<String>
) -> Result<(), String> {
    let db = db::init_db(&app, url, token).await.map_err(|e| e.to_string())?;
    let mut db_state = state.db.lock().unwrap();
    *db_state = Some(db);
    Ok(())
}

#[tauri::command]
async fn get_dashboard_stats(state: State<'_, AppState>) -> Result<DashboardStats, String> {
    if !is_licensed(&state) { return Err("LICENSE_INACTIVE".to_string()); }
    let conn = get_conn(&state)?;

    let total_productos: i64 = {
        let mut rows = conn.query("SELECT COUNT(*) FROM productos", ()).await.map_err(|e| e.to_string())?;
        rows.next().await.map_err(|e| e.to_string())?.and_then(|r| r.get(0).ok()).unwrap_or(0)
    };

    let stock_bajo: i64 = {
        let mut rows = conn.query("SELECT COUNT(*) FROM productos WHERE stock <= 5", ()).await.map_err(|e| e.to_string())?;
        rows.next().await.map_err(|e| e.to_string())?.and_then(|r| r.get(0).ok()).unwrap_or(0)
    };

    let tasa_actual: f64 = {
        let mut rows = conn.query("SELECT valor FROM tasas ORDER BY fecha DESC LIMIT 1", ()).await.map_err(|e| e.to_string())?;
        rows.next().await.map_err(|e| e.to_string())?.and_then(|r| r.get(0).ok()).unwrap_or(0.0)
    };

    let total_inversion_usd: f64 = {
        let mut rows = conn.query("SELECT SUM(total_usd) FROM movimientos WHERE tipo = 'ENTRADA'", ()).await.map_err(|e| e.to_string())?;
        rows.next().await.map_err(|e| e.to_string())?.and_then(|r| r.get(0).ok()).unwrap_or(0.0)
    };
    
    let total_inversion_bs: f64 = {
        let mut rows = conn.query("SELECT SUM(total_bs) FROM movimientos WHERE tipo = 'ENTRADA'", ()).await.map_err(|e| e.to_string())?;
        rows.next().await.map_err(|e| e.to_string())?.and_then(|r| r.get(0).ok()).unwrap_or(0.0)
    };

    let total_ganancias_usd: f64 = {
        let mut rows = conn.query("SELECT SUM(total_usd) FROM movimientos WHERE tipo = 'SALIDA'", ()).await.map_err(|e| e.to_string())?;
        rows.next().await.map_err(|e| e.to_string())?.and_then(|r| r.get(0).ok()).unwrap_or(0.0)
    };

    let total_ganancias_bs: f64 = {
        let mut rows = conn.query("SELECT SUM(total_bs) FROM movimientos WHERE tipo = 'SALIDA'", ()).await.map_err(|e| e.to_string())?;
        rows.next().await.map_err(|e| e.to_string())?.and_then(|r| r.get(0).ok()).unwrap_or(0.0)
    };

    let total_perdidas_usd = (total_inversion_usd - total_ganancias_usd).max(0.0);
    let total_perdidas_bs = (total_inversion_bs - total_ganancias_bs).max(0.0);

    let mut top_entradas = Vec::new();
    let mut rows = conn.query("SELECT p.nombre, p.unidad, SUM(m.cantidad) as cantidad, SUM(m.total_usd) as total_usd, SUM(m.total_bs) as total_bs FROM movimientos m JOIN productos p ON p.id = m.producto_id WHERE m.tipo = 'ENTRADA' GROUP BY m.producto_id ORDER BY cantidad DESC LIMIT 8", ()).await.map_err(|e| e.to_string())?;
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        top_entradas.push(ProductoChartItem {
            nombre: row.get(0).map_err(|e| e.to_string())?,
            unidad: row.get(1).map_err(|e| e.to_string())?,
            cantidad: row.get(2).map_err(|e| e.to_string())?,
            total_usd: row.get(3).map_err(|e| e.to_string())?,
            total_bs: row.get(4).map_err(|e| e.to_string())?,
        });
    }

    let mut top_salidas = Vec::new();
    let mut rows = conn.query("SELECT p.nombre, p.unidad, SUM(m.cantidad) as cantidad, SUM(m.total_usd) as total_usd, SUM(m.total_bs) as total_bs FROM movimientos m JOIN productos p ON p.id = m.producto_id WHERE m.tipo = 'SALIDA' GROUP BY m.producto_id ORDER BY cantidad DESC LIMIT 8", ()).await.map_err(|e| e.to_string())?;
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        top_salidas.push(ProductoChartItem {
            nombre: row.get(0).map_err(|e| e.to_string())?,
            unidad: row.get(1).map_err(|e| e.to_string())?,
            cantidad: row.get(2).map_err(|e| e.to_string())?,
            total_usd: row.get(3).map_err(|e| e.to_string())?,
            total_bs: row.get(4).map_err(|e| e.to_string())?,
        });
    }

    Ok(DashboardStats { 
        total_productos, stock_bajo, tasa_actual, 
        total_inversion_usd, total_inversion_bs, 
        total_ganancias_usd, total_ganancias_bs, 
        total_perdidas_usd, total_perdidas_bs, 
        top_entradas, top_salidas 
    })
}

#[tauri::command]
async fn get_tasa_actual(state: State<'_, AppState>) -> Result<Tasa, String> {
    if !is_licensed(&state) { return Err("LICENSE_INACTIVE".to_string()); }
    let conn = get_conn(&state)?;
    let mut rows = conn.query("SELECT id, valor, fecha, fuente FROM tasas ORDER BY fecha DESC LIMIT 1", ()).await.map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        let fecha_str: String = row.get(2).map_err(|e| e.to_string())?;
        let fecha = chrono::NaiveDateTime::parse_from_str(&fecha_str, "%Y-%m-%d %H:%M:%S").unwrap_or_default();
        Ok(Tasa {
            id: row.get(0).ok(),
            valor: row.get(1).map_err(|e| e.to_string())?,
            fecha,
            fuente: row.get(3).map_err(|e| e.to_string())?,
        })
    } else {
        Err("No hay tasas registradas".to_string())
    }
}

#[tauri::command]
async fn fetch_bcv_tasa() -> Result<scraper::TasaBCV, String> {
    scraper::scrape_bcv().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_tasa(state: State<'_, AppState>, valor: f64, fuente: String) -> Result<Tasa, String> {
    let conn = get_conn(&state)?;
    let now = chrono::Utc::now().naive_utc().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute("INSERT INTO tasas (valor, fecha, fuente) VALUES (?, ?, ?)", (valor, now.clone(), fuente.clone())).await.map_err(|e| e.to_string())?;
    
    let mut rows = conn.query("SELECT id, valor, fecha, fuente FROM tasas WHERE valor = ? AND fuente = ? ORDER BY id DESC LIMIT 1", (valor, fuente)).await.map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        let fecha_str: String = row.get(2).map_err(|e| e.to_string())?;
        let fecha = chrono::NaiveDateTime::parse_from_str(&fecha_str, "%Y-%m-%d %H:%M:%S").unwrap_or_default();
        Ok(Tasa {
            id: row.get(0).ok(),
            valor: row.get(1).map_err(|e| e.to_string())?,
            fecha,
            fuente: row.get(3).map_err(|e| e.to_string())?,
        })
    } else {
        Err("Error al recuperar la tasa guardada".to_string())
    }
}

#[tauri::command]
async fn get_productos(state: State<'_, AppState>) -> Result<Vec<Producto>, String> {
    let conn = get_conn(&state)?;
    let mut rows = conn.query("SELECT id, codigo, barras, nombre, descripcion, precio_ref_usd, precio_bs, categoria, subcategoria, stock, unidad, price_per_dolar FROM productos", ()).await.map_err(|e| e.to_string())?;
    let mut productos = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        productos.push(Producto {
            id: row.get(0).ok(),
            codigo: row.get(1).map_err(|e| e.to_string())?,
            barras: row.get(2).ok(),
            nombre: row.get(3).map_err(|e| e.to_string())?,
            descripcion: row.get(4).ok(),
            precio_ref_usd: row.get(5).map_err(|e| e.to_string())?,
            precio_bs: row.get(6).map_err(|e| e.to_string())?,
            categoria: row.get(7).ok(),
            subcategoria: row.get(8).ok(),
            stock: row.get(9).map_err(|e| e.to_string())?,
            unidad: row.get(10).map_err(|e| e.to_string())?,
            price_per_dolar: row.get(11).map_err(|e| e.to_string())?,
        });
    }
    Ok(productos)
}

#[tauri::command]
async fn upsert_producto(state: State<'_, AppState>, mut producto: Producto) -> Result<Producto, String> {
    let conn = get_conn(&state)?;
    if let Some(id) = producto.id {
        conn.execute("UPDATE productos SET codigo=?, barras=?, nombre=?, descripcion=?, precio_ref_usd=?, precio_bs=?, categoria=?, subcategoria=?, stock=?, unidad=?, price_per_dolar=? WHERE id=?", 
            (producto.codigo.clone(), producto.barras.clone(), producto.nombre.clone(), producto.descripcion.clone(), producto.precio_ref_usd, producto.precio_bs, producto.categoria.clone(), producto.subcategoria.clone(), producto.stock, producto.unidad.clone(), producto.price_per_dolar, id)
        ).await.map_err(|e| e.to_string())?;
    } else {
        conn.execute("INSERT INTO productos (codigo, barras, nombre, descripcion, precio_ref_usd, precio_bs, categoria, subcategoria, stock, unidad, price_per_dolar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
            (producto.codigo.clone(), producto.barras.clone(), producto.nombre.clone(), producto.descripcion.clone(), producto.precio_ref_usd, producto.precio_bs, producto.categoria.clone(), producto.subcategoria.clone(), producto.stock, producto.unidad.clone(), producto.price_per_dolar)
        ).await.map_err(|e| e.to_string())?;
        producto.id = Some(conn.last_insert_rowid() as i32);
    }
    Ok(producto)
}

#[tauri::command]
async fn delete_producto(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = get_conn(&state)?;
    conn.execute("DELETE FROM movimientos WHERE producto_id = ?", [id]).await.map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM productos WHERE id = ?", [id]).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn recalculate_prices(state: State<'_, AppState>, tasa: f64, ids: Option<Vec<i32>>) -> Result<(), String> {
    let conn = get_conn(&state)?;
    match ids {
        Some(list) => { 
            for id in list { 
                conn.execute("UPDATE productos SET precio_bs = precio_ref_usd * ?, price_per_dolar = ? WHERE id = ?", (tasa, tasa, id)).await.map_err(|e| e.to_string())?; 
            } 
        }
        None => { 
            conn.execute("UPDATE productos SET precio_bs = precio_ref_usd * ?, price_per_dolar = ?", (tasa, tasa)).await.map_err(|e| e.to_string())?; 
        }
    }
    Ok(())
}

#[tauri::command]
async fn get_movements(state: State<'_, AppState>) -> Result<Vec<Movimiento>, String> {
    let conn = get_conn(&state)?;
    let mut rows = conn.query("SELECT id, producto_id, tipo, cantidad, precio_unitario, tasa_momento, total_usd, total_bs, price_per_dolar, fecha, factura_id FROM movimientos ORDER BY fecha DESC", ()).await.map_err(|e| e.to_string())?;
    let mut movimientos = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        let fecha_str: Option<String> = row.get(9).ok();
        let fecha = fecha_str.and_then(|s| chrono::NaiveDateTime::parse_from_str(&s, "%Y-%m-%d %H:%M:%S").ok());
        movimientos.push(Movimiento {
            id: row.get(0).ok(),
            producto_id: row.get(1).map_err(|e| e.to_string())?,
            tipo: row.get(2).map_err(|e| e.to_string())?,
            cantidad: row.get(3).map_err(|e| e.to_string())?,
            precio_unitario: row.get(4).map_err(|e| e.to_string())?,
            tasa_momento: row.get(5).map_err(|e| e.to_string())?,
            total_usd: row.get(6).map_err(|e| e.to_string())?,
            total_bs: row.get(7).map_err(|e| e.to_string())?,
            price_per_dolar: row.get(8).map_err(|e| e.to_string())?,
            fecha,
            factura_id: row.get(10).ok(),
        });
    }
    Ok(movimientos)
}

#[tauri::command]
async fn record_movement(state: State<'_, AppState>, mov: Movimiento) -> Result<(), String> {
    let conn = get_conn(&state)?;
    let now_dt = chrono::Utc::now().naive_utc();
    let final_fecha = mov.fecha.unwrap_or(now_dt);
    let fecha_str = final_fecha.format("%Y-%m-%d %H:%M:%S").to_string();
    
    conn.execute("INSERT INTO movimientos (producto_id, tipo, cantidad, precio_unitario, tasa_momento, total_usd, total_bs, price_per_dolar, fecha, factura_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
        (mov.producto_id, mov.tipo.clone(), mov.cantidad, mov.precio_unitario, mov.tasa_momento, mov.total_usd, mov.total_bs, mov.price_per_dolar, fecha_str, mov.factura_id)
    ).await.map_err(|e| e.to_string())?;
    
    let modifier = if mov.tipo == "ENTRADA" { 1.0 } else { -1.0 };
    conn.execute("UPDATE productos SET stock = stock + ? WHERE id = ?", (mov.cantidad * modifier, mov.producto_id)).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn delete_movement(state: State<'_, AppState>, id: i32, producto_id: i32, cantidad: f64, tipo: String) -> Result<(), String> {
    let conn = get_conn(&state)?;
    let modifier = if tipo == "ENTRADA" { -1.0 } else { 1.0 };
    conn.execute("UPDATE productos SET stock = stock + ? WHERE id = ?", (cantidad * modifier, producto_id)).await.map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM movimientos WHERE id = ?", [id]).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(serde::Serialize)]
struct Stats { total_productos: i64, stock_bajo: i64, tasa_actual: f64 }

#[tauri::command]
async fn get_stats(state: State<'_, AppState>) -> Result<Stats, String> {
    let conn = get_conn(&state)?;
    let total_productos: i64 = {
        let mut rows = conn.query("SELECT COUNT(*) FROM productos", ()).await.map_err(|e| e.to_string())?;
        rows.next().await.map_err(|e| e.to_string())?.and_then(|r| r.get(0).ok()).unwrap_or(0)
    };
    let stock_bajo: i64 = {
        let mut rows = conn.query("SELECT COUNT(*) FROM productos WHERE stock <= 5", ()).await.map_err(|e| e.to_string())?;
        rows.next().await.map_err(|e| e.to_string())?.and_then(|r| r.get(0).ok()).unwrap_or(0)
    };
    let tasa_actual: f64 = {
        let mut rows = conn.query("SELECT valor FROM tasas ORDER BY fecha DESC LIMIT 1", ()).await.map_err(|e| e.to_string())?;
        rows.next().await.map_err(|e| e.to_string())?.and_then(|r| r.get(0).ok()).unwrap_or(0.0)
    };
    Ok(Stats { total_productos, stock_bajo, tasa_actual })
}

#[tauri::command]
async fn save_export_file(app: tauri::AppHandle, filename: String, base64_data: String) -> Result<String, String> {
    let downloads_dir = app.path().resolve(filename, BaseDirectory::Download).map_err(|e| e.to_string())?;
    let bytes = general_purpose::STANDARD.decode(base64_data).map_err(|e| e.to_string())?;
    fs::write(&downloads_dir, bytes).map_err(|e| e.to_string())?;
    Ok(downloads_dir.to_string_lossy().to_string())
}

#[tauri::command]
async fn export_data(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let conn = get_conn(&state)?;
    
    let productos = get_productos(state.clone()).await?;
    let movimientos = get_movements(state.clone()).await?;
    let facturas = get_facturas(state.clone()).await?;
    let clientes = get_clientes(state.clone()).await?;
    
    let mut tasas = Vec::new();
    let mut rows = conn.query("SELECT id, valor, fecha, fuente FROM tasas", ()).await.map_err(|e| e.to_string())?;
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        let fecha_str: String = row.get(2).map_err(|e| e.to_string())?;
        tasas.push(Tasa {
            id: row.get(0).ok(),
            valor: row.get(1).map_err(|e| e.to_string())?,
            fecha: chrono::NaiveDateTime::parse_from_str(&fecha_str, "%Y-%m-%d %H:%M:%S").unwrap_or_default(),
            fuente: row.get(3).map_err(|e| e.to_string())?,
        });
    }

    let mut categorias = Vec::new();
    let mut rows = conn.query("SELECT id, nombre FROM categorias", ()).await.map_err(|e| e.to_string())?;
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        categorias.push(models::Categoria { id: row.get(0).ok(), nombre: row.get(1).map_err(|e| e.to_string())? });
    }

    let mut subcategorias = Vec::new();
    let mut rows = conn.query("SELECT id, nombre, categoria_id FROM subcategorias", ()).await.map_err(|e| e.to_string())?;
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        subcategorias.push(models::Subcategoria { id: row.get(0).ok(), nombre: row.get(1).map_err(|e| e.to_string())?, categoria_id: row.get(2).map_err(|e| e.to_string())? });
    }

    let mut pagos = Vec::new();
    let mut rows = conn.query("SELECT id, factura_id, metodo_id, monto, tasa_referencia, moneda FROM pagos_factura", ()).await.map_err(|e| e.to_string())?;
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        pagos.push(PagoFactura {
            id: row.get(0).ok(),
            factura_id: row.get(1).ok(),
            metodo_id: row.get(2).map_err(|e| e.to_string())?,
            monto: row.get(3).map_err(|e| e.to_string())?,
            tasa_referencia: row.get(4).map_err(|e| e.to_string())?,
            moneda: row.get(5).map_err(|e| e.to_string())?,
        });
    }

    let mut factura_clientes = Vec::new();
    let mut rows = conn.query("SELECT factura_id, cliente_id FROM factura_cliente", ()).await.map_err(|e| e.to_string())?;
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        factura_clientes.push(FacturaCliente {
            factura_id: row.get(0).map_err(|e| e.to_string())?,
            cliente_id: row.get(1).map_err(|e| e.to_string())?,
        });
    }

    Ok(serde_json::json!({ 
        "productos": productos, 
        "movimientos": movimientos, 
        "tasas": tasas, 
        "categorias": categorias, 
        "subcategorias": subcategorias,
        "facturas": facturas,
        "clientes": clientes,
        "pagos": pagos,
        "factura_clientes": factura_clientes
    }))
}

#[tauri::command]
async fn import_data(
    state: State<'_, AppState>, 
    productos: Vec<Producto>, 
    movimientos: Vec<Movimiento>, 
    categorias: Vec<models::Categoria>, 
    subcategorias: Vec<models::Subcategoria>,
    facturas: Option<Vec<Factura>>,
    clientes: Option<Vec<Cliente>>,
    pagos: Option<Vec<PagoFactura>>,
    factura_clientes: Option<Vec<FacturaCliente>>
) -> Result<(), String> {
    let conn = get_conn(&state)?;
    
    // Categorias and Subcategorias
    for cat in categorias { conn.execute("INSERT OR REPLACE INTO categorias (id, nombre) VALUES (?, ?)", (cat.id, cat.nombre)).await.map_err(|e| e.to_string())?; }
    for sub in subcategorias { conn.execute("INSERT OR REPLACE INTO subcategorias (id, nombre, categoria_id) VALUES (?, ?, ?)", (sub.id, sub.nombre, sub.categoria_id)).await.map_err(|e| e.to_string())?; }
    
    // Clientes
    if let Some(c_list) = clientes {
        for c in c_list {
            conn.execute("INSERT OR REPLACE INTO clientes (id, cedula, nombre, apellido, telefono, correo) VALUES (?, ?, ?, ?, ?, ?)", 
                (c.id, c.cedula, c.nombre, c.apellido, c.telefono, c.correo)
            ).await.map_err(|e| e.to_string())?;
        }
    }

    // Facturas
    if let Some(f_list) = facturas {
        for f in f_list {
            conn.execute("INSERT OR REPLACE INTO facturas (id, numero, fecha, proveedor, tipo, observaciones) VALUES (?, ?, ?, ?, ?, ?)", 
                (f.id, f.numero, f.fecha, f.proveedor, f.tipo, f.observaciones)
            ).await.map_err(|e| e.to_string())?;
        }
    }

    // Productos
    for prod in productos { 
        conn.execute("INSERT OR REPLACE INTO productos (id, codigo, barras, nombre, descripcion, precio_ref_usd, precio_bs, categoria, subcategoria, stock, unidad, price_per_dolar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
            (prod.id, prod.codigo, prod.barras, prod.nombre, prod.descripcion, prod.precio_ref_usd, prod.precio_bs, prod.categoria, prod.subcategoria, prod.stock, prod.unidad, prod.price_per_dolar)
        ).await.map_err(|e| e.to_string())?; 
    }

    // Movimientos
    for mov in movimientos { 
        let fecha_str = mov.fecha.map(|f| f.format("%Y-%m-%d %H:%M:%S").to_string());
        conn.execute("INSERT OR REPLACE INTO movimientos (id, producto_id, tipo, cantidad, precio_unitario, tasa_momento, total_usd, total_bs, price_per_dolar, fecha, factura_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
            (mov.id, mov.producto_id, mov.tipo, mov.cantidad, mov.precio_unitario, mov.tasa_momento, mov.total_usd, mov.total_bs, mov.price_per_dolar, fecha_str, mov.factura_id)
        ).await.map_err(|e| e.to_string())?; 
    }

    // Pagos
    if let Some(p_list) = pagos {
        for p in p_list {
            conn.execute("INSERT OR REPLACE INTO pagos_factura (id, factura_id, metodo_id, monto, tasa_referencia, moneda) VALUES (?, ?, ?, ?, ?, ?)", 
                (p.id, p.factura_id, p.metodo_id, p.monto, p.tasa_referencia, p.moneda)
            ).await.map_err(|e| e.to_string())?;
        }
    }

    // FacturaCliente
    if let Some(fc_list) = factura_clientes {
        for fc in fc_list {
            conn.execute("INSERT OR REPLACE INTO factura_cliente (factura_id, cliente_id) VALUES (?, ?)", 
                (fc.factura_id, fc.cliente_id)
            ).await.map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
async fn clear_database(state: State<'_, AppState>) -> Result<(), String> {
    let conn = get_conn(&state)?;
    conn.execute("DELETE FROM pagos_factura", ()).await.map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM factura_cliente", ()).await.map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM movimientos", ()).await.map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM facturas", ()).await.map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM clientes", ()).await.map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM productos", ()).await.map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM subcategorias", ()).await.map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM categorias", ()).await.map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tasas", ()).await.map_err(|e| e.to_string())?;
    // Re-insertar tasa por defecto
    conn.execute("INSERT INTO tasas (valor, fecha, fuente) VALUES (1.0, '2000-01-01 00:00:00', 'SISTEMA')", ()).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command] async fn get_categorias(state: State<'_, AppState>) -> Result<Vec<models::Categoria>, String> { 
    let conn = get_conn(&state)?; 
    let mut rows = conn.query("SELECT id, nombre FROM categorias ORDER BY nombre", ()).await.map_err(|e| e.to_string())?;
    let mut res = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? { res.push(models::Categoria { id: row.get(0).ok(), nombre: row.get(1).map_err(|e| e.to_string())? }); }
    Ok(res)
}
#[tauri::command] async fn upsert_categoria(state: State<'_, AppState>, mut categoria: models::Categoria) -> Result<models::Categoria, String> { 
    let conn = get_conn(&state)?; 
    if let Some(id) = categoria.id { conn.execute("UPDATE categorias SET nombre = ? WHERE id = ?", (categoria.nombre.clone(), id)).await.map_err(|e| e.to_string())?; } 
    else { conn.execute("INSERT INTO categorias (nombre) VALUES (?)", [categoria.nombre.clone()]).await.map_err(|e| e.to_string())?; categoria.id = Some(conn.last_insert_rowid() as i32); } 
    Ok(categoria) 
}
#[tauri::command] async fn delete_categoria(state: State<'_, AppState>, id: i32) -> Result<(), String> { 
    let conn = get_conn(&state)?; 
    conn.execute("DELETE FROM subcategorias WHERE categoria_id = ?", [id]).await.map_err(|e| e.to_string())?; 
    conn.execute("DELETE FROM categorias WHERE id = ?", [id]).await.map_err(|e| e.to_string())?; 
    Ok(()) 
}
#[tauri::command] async fn get_subcategorias(state: State<'_, AppState>, categoria_id: Option<i32>) -> Result<Vec<models::Subcategoria>, String> { 
    let conn = get_conn(&state)?; 
    let mut rows = match categoria_id { 
        Some(cid) => conn.query("SELECT id, nombre, categoria_id FROM subcategorias WHERE categoria_id = ? ORDER BY nombre", [cid]).await.map_err(|e| e.to_string())?, 
        None => conn.query("SELECT id, nombre, categoria_id FROM subcategorias ORDER BY nombre", ()).await.map_err(|e| e.to_string())?, 
    };
    let mut res = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? { res.push(models::Subcategoria { id: row.get(0).ok(), nombre: row.get(1).map_err(|e| e.to_string())?, categoria_id: row.get(2).map_err(|e| e.to_string())? }); }
    Ok(res)
}
#[tauri::command] async fn upsert_subcategoria(state: State<'_, AppState>, mut subcategoria: models::Subcategoria) -> Result<models::Subcategoria, String> { 
    let conn = get_conn(&state)?; 
    if let Some(id) = subcategoria.id { conn.execute("UPDATE subcategorias SET nombre = ?, categoria_id = ? WHERE id = ?", (subcategoria.nombre.clone(), subcategoria.categoria_id, id)).await.map_err(|e| e.to_string())?; } 
    else { conn.execute("INSERT INTO subcategorias (nombre, categoria_id) VALUES (?, ?)", (subcategoria.nombre.clone(), subcategoria.categoria_id)).await.map_err(|e| e.to_string())?; subcategoria.id = Some(conn.last_insert_rowid() as i32); } 
    Ok(subcategoria) 
}
#[tauri::command] async fn delete_subcategoria(state: State<'_, AppState>, id: i32) -> Result<(), String> { 
    let conn = get_conn(&state)?; conn.execute("DELETE FROM subcategorias WHERE id = ?", [id]).await.map_err(|e| e.to_string())?; Ok(()) 
}
#[tauri::command] async fn get_facturas(state: State<'_, AppState>) -> Result<Vec<Factura>, String> { 
    let conn = get_conn(&state)?; 
    let mut rows = conn.query("SELECT id, numero, fecha, proveedor, tipo, observaciones, created_at FROM facturas ORDER BY fecha DESC", ()).await.map_err(|e| e.to_string())?;
    let mut res = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? { res.push(Factura { id: row.get(0).ok(), numero: row.get(1).map_err(|e| e.to_string())?, fecha: row.get(2).map_err(|e| e.to_string())?, proveedor: row.get(3).ok(), tipo: row.get(4).map_err(|e| e.to_string())?, observaciones: row.get(5).ok(), created_at: row.get(6).ok() }); }
    Ok(res)
}
#[tauri::command] async fn upsert_factura(state: State<'_, AppState>, mut factura: Factura) -> Result<Factura, String> { 
    let conn = get_conn(&state)?; 
    if let Some(id) = factura.id { conn.execute("UPDATE facturas SET numero = ?, fecha = ?, proveedor = ?, tipo = ?, observaciones = ? WHERE id = ?", (factura.numero.clone(), factura.fecha.clone(), factura.proveedor.clone(), factura.tipo.clone(), factura.observaciones.clone(), id)).await.map_err(|e| e.to_string())?; } 
    else { conn.execute("INSERT INTO facturas (numero, fecha, proveedor, tipo, observaciones) VALUES (?, ?, ?, ?, ?)", (factura.numero.clone(), factura.fecha.clone(), factura.proveedor.clone(), factura.tipo.clone(), factura.observaciones.clone())).await.map_err(|e| e.to_string())?; factura.id = Some(conn.last_insert_rowid() as i32); } 
    Ok(factura) 
}
#[tauri::command] async fn get_clientes(state: State<'_, AppState>) -> Result<Vec<models::Cliente>, String> { 
    let conn = get_conn(&state)?; 
    let mut rows = conn.query("SELECT id, cedula, nombre, apellido, telefono, correo FROM clientes ORDER BY apellido, nombre", ()).await.map_err(|e| e.to_string())?;
    let mut res = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? { res.push(models::Cliente { id: row.get(0).ok(), cedula: row.get(1).map_err(|e| e.to_string())?, nombre: row.get(2).map_err(|e| e.to_string())?, apellido: row.get(3).map_err(|e| e.to_string())?, telefono: row.get(4).ok(), correo: row.get(5).ok() }); }
    Ok(res)
}
#[tauri::command] async fn get_cliente_by_cedula(state: State<'_, AppState>, cedula: String) -> Result<Option<models::Cliente>, String> { 
    let conn = get_conn(&state)?; 
    let mut rows = conn.query("SELECT id, cedula, nombre, apellido, telefono, correo FROM clientes WHERE cedula = ?", [cedula]).await.map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().await.map_err(|e| e.to_string())? { Ok(Some(models::Cliente { id: row.get(0).ok(), cedula: row.get(1).map_err(|e| e.to_string())?, nombre: row.get(2).map_err(|e| e.to_string())?, apellido: row.get(3).map_err(|e| e.to_string())?, telefono: row.get(4).ok(), correo: row.get(5).ok() })) } else { Ok(None) }
}
#[tauri::command] async fn upsert_cliente(state: State<'_, AppState>, mut cliente: models::Cliente) -> Result<models::Cliente, String> { 
    let conn = get_conn(&state)?; 
    if let Some(id) = cliente.id { conn.execute("UPDATE clientes SET cedula = ?, nombre = ?, apellido = ?, telefono = ?, correo = ? WHERE id = ?", (cliente.cedula.clone(), cliente.nombre.clone(), cliente.apellido.clone(), cliente.telefono.clone(), cliente.correo.clone(), id)).await.map_err(|e| e.to_string())?; } 
    else { conn.execute("INSERT INTO clientes (cedula, nombre, apellido, telefono, correo) VALUES (?, ?, ?, ?, ?)", (cliente.cedula.clone(), cliente.nombre.clone(), cliente.apellido.clone(), cliente.telefono.clone(), cliente.correo.clone())).await.map_err(|e| e.to_string())?; cliente.id = Some(conn.last_insert_rowid() as i32); } 
    Ok(cliente) 
}
#[tauri::command] async fn get_metodos_pago(state: State<'_, AppState>) -> Result<Vec<models::MetodoPago>, String> { 
    let conn = get_conn(&state)?; 
    let mut rows = conn.query("SELECT id, nombre FROM metodos_pago ORDER BY id", ()).await.map_err(|e| e.to_string())?;
    let mut res = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? { res.push(models::MetodoPago { id: row.get(0).ok(), nombre: row.get(1).map_err(|e| e.to_string())? }); }
    Ok(res)
}

#[derive(serde::Deserialize)]
struct VentaPayload { factura: Factura, items: Vec<Movimiento>, pagos: Vec<models::PagoFactura>, cliente_id: Option<i32> }

#[tauri::command]
async fn procesar_venta(state: State<'_, AppState>, payload: VentaPayload) -> Result<i32, String> {
    let conn = get_conn(&state)?;
    conn.execute("INSERT INTO facturas (numero, fecha, tipo, observaciones) VALUES (?, ?, 'VENTA', ?)", (payload.factura.numero.clone(), payload.factura.fecha.clone(), payload.factura.observaciones.clone())).await.map_err(|e| e.to_string())?;
    let factura_id = conn.last_insert_rowid() as i32;
    if let Some(cid) = payload.cliente_id { conn.execute("INSERT INTO factura_cliente (factura_id, cliente_id) VALUES (?, ?)", (factura_id, cid)).await.map_err(|e| e.to_string())?; }
    for mov in payload.items {
        let mut rows = conn.query("SELECT stock, nombre FROM productos WHERE id = ?", [mov.producto_id]).await.map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
            let current_stock: f64 = row.get(0).map_err(|e| e.to_string())?;
            let nombre_prod: String = row.get(1).map_err(|e| e.to_string())?;
            if current_stock < mov.cantidad { return Err(format!("Stock insuficiente para '{}'. Disponible: {}, Solicitado: {}", nombre_prod, current_stock, mov.cantidad)); }
        }
        conn.execute("INSERT INTO movimientos (producto_id, tipo, cantidad, precio_unitario, tasa_momento, total_usd, total_bs, price_per_dolar, fecha, factura_id) VALUES (?, 'SALIDA', ?, ?, ?, ?, ?, ?, ?, ?)", 
            (mov.producto_id, mov.cantidad, mov.precio_unitario, mov.tasa_momento, mov.total_usd, mov.total_bs, mov.price_per_dolar, payload.factura.fecha.clone(), factura_id)
        ).await.map_err(|e| e.to_string())?;
        conn.execute("UPDATE productos SET stock = stock - ? WHERE id = ?", (mov.cantidad, mov.producto_id)).await.map_err(|e| e.to_string())?;
    }
    for pago in payload.pagos { conn.execute("INSERT INTO pagos_factura (factura_id, metodo_id, monto, tasa_referencia, moneda) VALUES (?, ?, ?, ?, ?)", (factura_id, pago.metodo_id, pago.monto, pago.tasa_referencia, pago.moneda)).await.map_err(|e| e.to_string())?; }
    Ok(factura_id)
}

#[tauri::command]
async fn delete_factura(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    let conn = get_conn(&state)?;
    conn.execute("DELETE FROM movimientos WHERE factura_id = ?", [id]).await.map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM facturas WHERE id = ?", [id]).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(serde::Serialize)]
struct FacturaItem { id: i32, producto_id: i32, producto_nombre: String, producto_codigo: String, unidad: String, cantidad: f64, total_usd: f64, total_bs: f64, tipo: String, precio_unitario_usd: f64 }

#[tauri::command]
async fn get_factura_items(state: State<'_, AppState>, factura_id: i32) -> Result<Vec<FacturaItem>, String> {
    let conn = get_conn(&state)?;
    let mut rows = conn.query("SELECT m.id, m.producto_id, p.nombre as producto_nombre, p.codigo as producto_codigo, p.unidad, m.cantidad, m.total_usd, m.total_bs, m.tipo FROM movimientos m JOIN productos p ON p.id = m.producto_id WHERE m.factura_id = ? ORDER BY m.id DESC", [factura_id]).await.map_err(|e| e.to_string())?;
    let mut items = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        let total_usd: f64 = row.get(6).map_err(|e| e.to_string())?;
        let cantidad: f64 = row.get(5).map_err(|e| e.to_string())?;
        items.push(FacturaItem {
            id: row.get(0).map_err(|e| e.to_string())?,
            producto_id: row.get(1).map_err(|e| e.to_string())?,
            producto_nombre: row.get(2).map_err(|e| e.to_string())?,
            producto_codigo: row.get(3).map_err(|e| e.to_string())?,
            unidad: row.get(4).map_err(|e| e.to_string())?,
            cantidad,
            total_usd,
            total_bs: row.get(7).map_err(|e| e.to_string())?,
            tipo: row.get(8).map_err(|e| e.to_string())?,
            precio_unitario_usd: if cantidad > 0.0 { total_usd / cantidad } else { 0.0 }
        });
    }
    Ok(items)
}

#[tauri::command]
async fn get_machine_id() -> Result<String, String> {
    use std::process::Command;
    let output = if cfg!(target_os = "windows") { Command::new("wmic").args(["csproduct", "get", "uuid"]).output().map_err(|e| e.to_string())? } else { return Ok("dev-machine-id".to_string()); };
    let result = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = result.lines().collect();
    if lines.len() >= 2 { Ok(lines[1].trim().to_string()) } else { Ok("unknown-id".to_string()) }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState { 
            db: Mutex::new(None),
            license_active: Mutex::new(false)
        })
        .invoke_handler(tauri::generate_handler![
            init_database,
            get_tasa_actual,
            fetch_bcv_tasa,
            save_tasa,
            get_productos,
            upsert_producto,
            delete_producto,
            recalculate_prices,
            get_stats,
            get_movements,
            record_movement,
            delete_movement,
            save_export_file,
            export_data,
            import_data,
            clear_database,
            get_categorias,
            upsert_categoria,
            delete_categoria,
            get_subcategorias,
            upsert_subcategoria,
            delete_subcategoria,
            get_dashboard_stats,
            get_facturas,
            upsert_factura,
            delete_factura,
            get_factura_items,
            get_machine_id,
            get_clientes,
            get_cliente_by_cedula,
            upsert_cliente,
            get_metodos_pago,
            procesar_venta,
            validate_license
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
