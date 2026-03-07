mod db;
mod models;
mod scraper;

use models::{Producto, Tasa, Movimiento, Factura};
use sqlx::SqlitePool;
use tauri::{Manager, State};
use base64::{Engine as _, engine::general_purpose};
use std::fs;
use tauri::path::BaseDirectory;

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

#[tauri::command]
async fn get_dashboard_stats(state: State<'_, AppState>) -> Result<DashboardStats, String> {
    let pool = &state.db;

    let total_productos: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM productos")
        .fetch_one(pool).await.map_err(|e| e.to_string())?;

    let stock_bajo: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM productos WHERE stock <= 5")
        .fetch_one(pool).await.map_err(|e| e.to_string())?;

    let tasa_actual = sqlx::query_scalar::<_, f64>("SELECT CAST(valor AS REAL) FROM tasas ORDER BY fecha DESC LIMIT 1")
        .fetch_one(pool).await.unwrap_or(0.0);

    // Totales financieros desde movimientos
    let total_inversion_usd: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(CAST(total_usd AS REAL)), 0.0) FROM movimientos WHERE tipo = 'ENTRADA'"
    ).fetch_one(pool).await.map_err(|e| e.to_string())?;

    let total_inversion_bs: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(CAST(total_bs AS REAL)), 0.0) FROM movimientos WHERE tipo = 'ENTRADA'"
    ).fetch_one(pool).await.map_err(|e| e.to_string())?;

    let total_ganancias_usd: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(CAST(total_usd AS REAL)), 0.0) FROM movimientos WHERE tipo = 'SALIDA'"
    ).fetch_one(pool).await.map_err(|e| e.to_string())?;

    let total_ganancias_bs: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(CAST(total_bs AS REAL)), 0.0) FROM movimientos WHERE tipo = 'SALIDA'"
    ).fetch_one(pool).await.map_err(|e| e.to_string())?;

    let total_perdidas_usd = (total_inversion_usd - total_ganancias_usd).max(0.0);
    let total_perdidas_bs = (total_inversion_bs - total_ganancias_bs).max(0.0);

    // Top 8 productos por cantidad en entradas
    let rows_entradas = sqlx::query(
        "SELECT p.nombre, p.unidad, SUM(m.cantidad) as cantidad, SUM(CAST(m.total_usd AS REAL)) as total_usd, SUM(CAST(m.total_bs AS REAL)) as total_bs
         FROM movimientos m
         JOIN productos p ON p.id = m.producto_id
         WHERE m.tipo = 'ENTRADA'
         GROUP BY m.producto_id
         ORDER BY cantidad DESC
         LIMIT 8"
    ).fetch_all(pool).await.map_err(|e| e.to_string())?;

    let top_entradas: Vec<ProductoChartItem> = rows_entradas.iter().map(|r| {
        use sqlx::Row;
        ProductoChartItem {
            nombre: r.get("nombre"),
            unidad: r.get("unidad"),
            cantidad: r.get("cantidad"),
            total_usd: r.get("total_usd"),
            total_bs: r.get("total_bs"),
        }
    }).collect();

    // Top 8 productos por cantidad en salidas
    let rows_salidas = sqlx::query(
        "SELECT p.nombre, p.unidad, SUM(m.cantidad) as cantidad, SUM(CAST(m.total_usd AS REAL)) as total_usd, SUM(CAST(m.total_bs AS REAL)) as total_bs
         FROM movimientos m
         JOIN productos p ON p.id = m.producto_id
         WHERE m.tipo = 'SALIDA'
         GROUP BY m.producto_id
         ORDER BY cantidad DESC
         LIMIT 8"
    ).fetch_all(pool).await.map_err(|e| e.to_string())?;

    let top_salidas: Vec<ProductoChartItem> = rows_salidas.iter().map(|r| {
        use sqlx::Row;
        ProductoChartItem {
            nombre: r.get("nombre"),
            unidad: r.get("unidad"),
            cantidad: r.get("cantidad"),
            total_usd: r.get("total_usd"),
            total_bs: r.get("total_bs"),
        }
    }).collect();

    Ok(DashboardStats {
        total_productos,
        stock_bajo,
        tasa_actual,
        total_inversion_usd,
        total_inversion_bs,
        total_ganancias_usd,
        total_ganancias_bs,
        total_perdidas_usd,
        total_perdidas_bs,
        top_entradas,
        top_salidas,
    })
}

struct AppState {
    db: SqlitePool,
}

#[tauri::command]
async fn get_tasa_actual(state: State<'_, AppState>) -> Result<Tasa, String> {
    sqlx::query_as::<_, Tasa>("SELECT * FROM tasas ORDER BY fecha DESC LIMIT 1")
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn fetch_bcv_tasa() -> Result<scraper::TasaBCV, String> {
    scraper::scrape_bcv().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_tasa(state: State<'_, AppState>, valor: f64, fuente: String) -> Result<Tasa, String> {
    let now = chrono::Utc::now().naive_utc();
    sqlx::query("INSERT INTO tasas (valor, fecha, fuente) VALUES (?, ?, ?)")
        .bind(valor)
        .bind(now)
        .bind(fuente.clone())
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Tasa>("SELECT * FROM tasas WHERE valor = ? AND fuente = ? ORDER BY id DESC LIMIT 1")
        .bind(valor)
        .bind(fuente)
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_productos(state: State<'_, AppState>) -> Result<Vec<Producto>, String> {
    sqlx::query_as::<_, Producto>("SELECT * FROM productos")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn upsert_producto(state: State<'_, AppState>, mut producto: Producto) -> Result<Producto, String> {
    if let Some(id) = producto.id {
        sqlx::query("UPDATE productos SET codigo=?, barras=?, nombre=?, descripcion=?, precio_ref_usd=?, precio_bs=?, categoria=?, subcategoria=?, stock=?, unidad=?, price_per_dolar=? WHERE id=?")
            .bind(&producto.codigo)
            .bind(&producto.barras)
            .bind(&producto.nombre)
            .bind(&producto.descripcion)
            .bind(producto.precio_ref_usd)
            .bind(producto.precio_bs)
            .bind(&producto.categoria)
            .bind(&producto.subcategoria)
            .bind(producto.stock)
            .bind(&producto.unidad)
            .bind(producto.price_per_dolar)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
    } else {
        let result = sqlx::query("INSERT INTO productos (codigo, barras, nombre, descripcion, precio_ref_usd, precio_bs, categoria, subcategoria, stock, unidad, price_per_dolar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&producto.codigo)
            .bind(&producto.barras)
            .bind(&producto.nombre)
            .bind(&producto.descripcion)
            .bind(producto.precio_ref_usd)
            .bind(producto.precio_bs)
            .bind(&producto.categoria)
            .bind(&producto.subcategoria)
            .bind(producto.stock)
            .bind(&producto.unidad)
            .bind(producto.price_per_dolar)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
        
        producto.id = Some(result.last_insert_rowid() as i32);
    }
    Ok(producto)
}

#[tauri::command]
async fn delete_producto(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    // Delete associated movements first to avoid foreign key constraints
    sqlx::query("DELETE FROM movimientos WHERE producto_id = ?")
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // Delete the product
    sqlx::query("DELETE FROM productos WHERE id = ?")
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn recalculate_prices(state: State<'_, AppState>, tasa: f64, ids: Option<Vec<i32>>) -> Result<(), String> {
    match ids {
        Some(list) => {
            for id in list {
                sqlx::query("UPDATE productos SET precio_bs = precio_ref_usd * ?, price_per_dolar = ? WHERE id = ?")
                    .bind(tasa)
                    .bind(tasa)
                    .bind(id)
                    .execute(&state.db)
                    .await
                    .map_err(|e| e.to_string())?;
            }
        }
        None => {
            sqlx::query("UPDATE productos SET precio_bs = precio_ref_usd * ?, price_per_dolar = ?")
                .bind(tasa)
                .bind(tasa)
                .execute(&state.db)
                .await
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn get_movements(state: State<'_, AppState>) -> Result<Vec<Movimiento>, String> {
    sqlx::query_as::<_, Movimiento>("SELECT * FROM movimientos ORDER BY fecha DESC")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn record_movement(state: State<'_, AppState>, mut mov: Movimiento) -> Result<(), String> {
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().naive_utc();
    let final_fecha = mov.fecha.unwrap_or(now);
    mov.fecha = Some(final_fecha);

    sqlx::query("INSERT INTO movimientos (producto_id, tipo, cantidad, tasa_momento, total_usd, total_bs, price_per_dolar, fecha, factura_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(mov.producto_id)
        .bind(&mov.tipo)
        .bind(mov.cantidad)
        .bind(mov.tasa_momento)
        .bind(mov.total_usd)
        .bind(mov.total_bs)
        .bind(mov.price_per_dolar)
        .bind(final_fecha)
        .bind(mov.factura_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let modifier = if mov.tipo == "ENTRADA" { 1.0 } else { -1.0 };
    sqlx::query("UPDATE productos SET stock = stock + ? WHERE id = ?")
        .bind(mov.cantidad * modifier)
        .bind(mov.producto_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn delete_movement(state: State<'_, AppState>, id: i32, producto_id: i32, cantidad: f64, tipo: String) -> Result<(), String> {
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    let modifier = if tipo == "ENTRADA" { -1.0 } else { 1.0 };
    sqlx::query("UPDATE productos SET stock = stock + ? WHERE id = ?")
        .bind(cantidad * modifier)
        .bind(producto_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM movimientos WHERE id = ?")
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(serde::Serialize)]
struct Stats {
    total_productos: i64,
    stock_bajo: i64,
    tasa_actual: f64,
}

#[tauri::command]
async fn get_stats(state: State<'_, AppState>) -> Result<Stats, String> {
    let total_productos: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM productos")
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let stock_bajo: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM productos WHERE stock <= 5")
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let tasa_actual_res: Result<f64, sqlx::Error> = sqlx::query_scalar("SELECT valor FROM tasas ORDER BY fecha DESC LIMIT 1")
        .fetch_one(&state.db)
        .await;
    
    let tasa_actual = match tasa_actual_res {
        Ok(v) => v,
        Err(_) => 0.0,
    };

    Ok(Stats { total_productos, stock_bajo, tasa_actual })
}

#[tauri::command]
async fn save_export_file(app: tauri::AppHandle, filename: String, base64_data: String) -> Result<String, String> {
    let downloads_dir = app.path().resolve(filename, BaseDirectory::Download)
        .map_err(|e| e.to_string())?;

    let bytes = general_purpose::STANDARD.decode(base64_data)
        .map_err(|e| e.to_string())?;

    fs::write(&downloads_dir, bytes).map_err(|e| e.to_string())?;

    Ok(downloads_dir.to_string_lossy().to_string())
}

#[tauri::command]
async fn export_data(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let pool = &state.db;

    let productos: Vec<Producto> = sqlx::query_as("SELECT * FROM productos")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let movimientos: Vec<Movimiento> = sqlx::query_as("SELECT * FROM movimientos")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let tasas: Vec<Tasa> = sqlx::query_as("SELECT * FROM tasas")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let categorias: Vec<models::Categoria> = sqlx::query_as("SELECT * FROM categorias")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let subcategorias: Vec<models::Subcategoria> = sqlx::query_as("SELECT * FROM subcategorias")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "productos": productos,
        "movimientos": movimientos,
        "tasas": tasas,
        "categorias": categorias,
        "subcategorias": subcategorias
    }))
}

#[tauri::command]
async fn import_data(
    state: State<'_, AppState>,
    productos: Vec<Producto>,
    movimientos: Vec<Movimiento>,
    categorias: Vec<models::Categoria>,
    subcategorias: Vec<models::Subcategoria>,
) -> Result<(), String> {
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    for cat in categorias {
        sqlx::query("INSERT OR REPLACE INTO categorias (id, nombre) VALUES (?, ?)")
            .bind(cat.id)
            .bind(cat.nombre)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    for sub in subcategorias {
        sqlx::query("INSERT OR REPLACE INTO subcategorias (id, nombre, categoria_id) VALUES (?, ?, ?)")
            .bind(sub.id)
            .bind(sub.nombre)
            .bind(sub.categoria_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    for prod in productos {
        sqlx::query("INSERT OR REPLACE INTO productos (id, codigo, barras, nombre, descripcion, precio_ref_usd, precio_bs, categoria, subcategoria, stock, unidad, price_per_dolar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(prod.id)
            .bind(prod.codigo)
            .bind(prod.barras)
            .bind(prod.nombre)
            .bind(prod.descripcion)
            .bind(prod.precio_ref_usd)
            .bind(prod.precio_bs)
            .bind(prod.categoria)
            .bind(prod.subcategoria)
            .bind(prod.stock)
            .bind(prod.unidad)
            .bind(prod.price_per_dolar)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    for mov in movimientos {
         sqlx::query("INSERT OR REPLACE INTO movimientos (id, producto_id, tipo, cantidad, tasa_momento, total_usd, total_bs, price_per_dolar, fecha, factura_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(mov.id)
            .bind(mov.producto_id)
            .bind(mov.tipo)
            .bind(mov.cantidad)
            .bind(mov.tasa_momento)
            .bind(mov.total_usd)
            .bind(mov.total_bs)
            .bind(mov.price_per_dolar)
            .bind(mov.fecha)
            .bind(mov.factura_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn clear_database(state: State<'_, AppState>) -> Result<(), String> {
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM movimientos").execute(&mut *tx).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM productos").execute(&mut *tx).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM tasas").execute(&mut *tx).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM subcategorias").execute(&mut *tx).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM categorias").execute(&mut *tx).await.map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// ── Categorias CRUD ────────────────────────────────────────────────────────────

#[tauri::command]
async fn get_categorias(state: State<'_, AppState>) -> Result<Vec<models::Categoria>, String> {
    sqlx::query_as::<_, models::Categoria>("SELECT * FROM categorias ORDER BY nombre")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn upsert_categoria(state: State<'_, AppState>, mut categoria: models::Categoria) -> Result<models::Categoria, String> {
    if let Some(id) = categoria.id {
        sqlx::query("UPDATE categorias SET nombre = ? WHERE id = ?")
            .bind(&categoria.nombre)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
    } else {
        let result = sqlx::query("INSERT INTO categorias (nombre) VALUES (?)")
            .bind(&categoria.nombre)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
        categoria.id = Some(result.last_insert_rowid() as i32);
    }
    Ok(categoria)
}

#[tauri::command]
async fn delete_categoria(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    // Cascade: delete subcategories first
    sqlx::query("DELETE FROM subcategorias WHERE categoria_id = ?")
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // Delete the category
    sqlx::query("DELETE FROM categorias WHERE id = ?")
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// ── Subcategorias CRUD ─────────────────────────────────────────────────────────

#[tauri::command]
async fn get_subcategorias(state: State<'_, AppState>, categoria_id: Option<i32>) -> Result<Vec<models::Subcategoria>, String> {
    match categoria_id {
        Some(cid) => sqlx::query_as::<_, models::Subcategoria>("SELECT * FROM subcategorias WHERE categoria_id = ? ORDER BY nombre")
            .bind(cid)
            .fetch_all(&state.db)
            .await
            .map_err(|e| e.to_string()),
        None => sqlx::query_as::<_, models::Subcategoria>("SELECT * FROM subcategorias ORDER BY nombre")
            .fetch_all(&state.db)
            .await
            .map_err(|e| e.to_string()),
    }
}

#[tauri::command]
async fn upsert_subcategoria(state: State<'_, AppState>, mut subcategoria: models::Subcategoria) -> Result<models::Subcategoria, String> {
    if let Some(id) = subcategoria.id {
        sqlx::query("UPDATE subcategorias SET nombre = ?, categoria_id = ? WHERE id = ?")
            .bind(&subcategoria.nombre)
            .bind(subcategoria.categoria_id)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
    } else {
        let result = sqlx::query("INSERT INTO subcategorias (nombre, categoria_id) VALUES (?, ?)")
            .bind(&subcategoria.nombre)
            .bind(subcategoria.categoria_id)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
        subcategoria.id = Some(result.last_insert_rowid() as i32);
    }
    Ok(subcategoria)
}

#[tauri::command]
async fn delete_subcategoria(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    sqlx::query("DELETE FROM subcategorias WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Facturas CRUD ────────────────────────────────────────────────────────────

#[tauri::command]
async fn get_facturas(state: State<'_, AppState>) -> Result<Vec<Factura>, String> {
    sqlx::query_as::<_, Factura>("SELECT * FROM facturas ORDER BY fecha DESC")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn upsert_factura(state: State<'_, AppState>, mut factura: Factura) -> Result<Factura, String> {
    if let Some(id) = factura.id {
        sqlx::query("UPDATE facturas SET numero = ?, fecha = ?, proveedor = ?, observaciones = ? WHERE id = ?")
            .bind(&factura.numero)
            .bind(&factura.fecha)
            .bind(&factura.proveedor)
            .bind(&factura.observaciones)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
    } else {
        let result = sqlx::query("INSERT INTO facturas (numero, fecha, proveedor, observaciones) VALUES (?, ?, ?, ?)")
            .bind(&factura.numero)
            .bind(&factura.fecha)
            .bind(&factura.proveedor)
            .bind(&factura.observaciones)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
        factura.id = Some(result.last_insert_rowid() as i32);
    }
    Ok(factura)
}

#[tauri::command]
async fn delete_factura(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    // Cascade: delete associated movements first
    sqlx::query("DELETE FROM movimientos WHERE factura_id = ?")
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // Delete the factura
    sqlx::query("DELETE FROM facturas WHERE id = ?")
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(serde::Serialize)]
struct FacturaItem {
    id: i32,
    producto_id: i32,
    producto_nombre: String,
    producto_codigo: String,
    unidad: String,
    cantidad: f64,
    total_usd: f64,
    total_bs: f64,
    tipo: String,
    precio_unitario_usd: f64,
}

#[tauri::command]
async fn get_factura_items(state: State<'_, AppState>, factura_id: i32) -> Result<Vec<FacturaItem>, String> {
    let rows = sqlx::query(
        "SELECT m.id, m.producto_id, p.nombre as producto_nombre, p.codigo as producto_codigo, p.unidad,
                m.cantidad, m.total_usd, m.total_bs, m.tipo
         FROM movimientos m
         JOIN productos p ON p.id = m.producto_id
         WHERE m.factura_id = ?
         ORDER BY m.id DESC"
    )
    .bind(factura_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let items = rows.iter().map(|r| {
        use sqlx::Row;
        let total_usd: f64 = r.get("total_usd");
        let cantidad: f64 = r.get("cantidad");
        FacturaItem {
            id: r.get("id"),
            producto_id: r.get("producto_id"),
            producto_nombre: r.get("producto_nombre"),
            producto_codigo: r.get("producto_codigo"),
            unidad: r.get("unidad"),
            cantidad,
            total_usd,
            total_bs: r.get("total_bs"),
            tipo: r.get("tipo"),
            precio_unitario_usd: if cantidad > 0.0 { total_usd / cantidad } else { 0.0 },
        }
    }).collect();

    Ok(items)
}

#[tauri::command]
async fn get_machine_id() -> Result<String, String> {
    use std::process::Command;
    
    // En Windows obtenemos el UUID de la BIOS/Sistema
    let output = if cfg!(target_os = "windows") {
        Command::new("wmic")
            .args(["csproduct", "get", "uuid"])
            .output()
            .map_err(|e| e.to_string())?
    } else {
        // Fallback para otros sistemas o si wmic falla
        return Ok("dev-machine-id".to_string());
    };

    let result = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = result.lines().collect();
    if lines.len() >= 2 {
        Ok(lines[1].trim().to_string())
    } else {
        Ok("unknown-id".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let pool = db::init_db(&handle).await.expect("Failed to init database");
                handle.manage(AppState { db: pool });
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
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
            get_machine_id
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
