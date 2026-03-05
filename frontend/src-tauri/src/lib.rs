mod db;
mod models;
mod scraper;

use models::{Producto, Tasa, Movimiento};
use sqlx::SqlitePool;
use tauri::{Manager, State};
use base64::{Engine as _, engine::general_purpose};
use std::fs;
use tauri::path::BaseDirectory;

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
        sqlx::query("UPDATE productos SET codigo=?, barras=?, nombre=?, descripcion=?, precio_ref_usd=?, precio_bs=?, categoria=?, subcategoria=?, stock=?, price_per_dolar=? WHERE id=?")
            .bind(&producto.codigo)
            .bind(&producto.barras)
            .bind(&producto.nombre)
            .bind(&producto.descripcion)
            .bind(producto.precio_ref_usd)
            .bind(producto.precio_bs)
            .bind(&producto.categoria)
            .bind(&producto.subcategoria)
            .bind(producto.stock)
            .bind(producto.price_per_dolar)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
    } else {
        let result = sqlx::query("INSERT INTO productos (codigo, barras, nombre, descripcion, precio_ref_usd, precio_bs, categoria, subcategoria, stock, price_per_dolar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&producto.codigo)
            .bind(&producto.barras)
            .bind(&producto.nombre)
            .bind(&producto.descripcion)
            .bind(producto.precio_ref_usd)
            .bind(producto.precio_bs)
            .bind(&producto.categoria)
            .bind(&producto.subcategoria)
            .bind(producto.stock)
            .bind(producto.price_per_dolar)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
        
        producto.id = Some(result.last_insert_rowid() as i32);
    }
    Ok(producto)
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

    // Insert movement
    sqlx::query("INSERT INTO movimientos (producto_id, tipo, cantidad, tasa_momento, total_usd, total_bs, price_per_dolar, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(mov.producto_id)
        .bind(&mov.tipo)
        .bind(mov.cantidad)
        .bind(mov.tasa_momento)
        .bind(mov.total_usd)
        .bind(mov.total_bs)
        .bind(mov.price_per_dolar)
        .bind(final_fecha)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // Update product stock
    let modifier = if mov.tipo == "ENTRADA" { 1 } else { -1 };
    sqlx::query("UPDATE productos SET stock = stock + ? WHERE id = ?")
        .bind(mov.cantidad * modifier)
        .bind(mov.producto_id)
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

    Ok(serde_json::json!({
        "productos": productos,
        "movimientos": movimientos,
        "tasas": tasas
    }))
}

#[tauri::command]
async fn import_data(state: State<'_, AppState>, productos: Vec<Producto>, movimientos: Vec<Movimiento>) -> Result<(), String> {
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    for prod in productos {
        sqlx::query("INSERT OR REPLACE INTO productos (id, codigo, barras, nombre, descripcion, precio_ref_usd, precio_bs, categoria, subcategoria, stock, price_per_dolar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
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
            .bind(prod.price_per_dolar)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    for mov in movimientos {
         sqlx::query("INSERT OR REPLACE INTO movimientos (id, producto_id, tipo, cantidad, tasa_momento, total_usd, total_bs, price_per_dolar, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(mov.id)
            .bind(mov.producto_id)
            .bind(mov.tipo)
            .bind(mov.cantidad)
            .bind(mov.tasa_momento)
            .bind(mov.total_usd)
            .bind(mov.total_bs)
            .bind(mov.price_per_dolar)
            .bind(mov.fecha)
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

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
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
            recalculate_prices,
            get_stats,
            get_movements,
            record_movement,
            save_export_file,
            export_data,
            import_data,
            clear_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
