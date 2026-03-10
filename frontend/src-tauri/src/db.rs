use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::fs;
use tauri::{AppHandle, Manager};
use std::str::FromStr;

pub async fn init_db(app_handle: &AppHandle) -> Result<SqlitePool, Box<dyn std::error::Error>> {
    let app_dir = app_handle.path().app_data_dir()?;
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)?;
    }
    let db_path = app_dir.join("sgm_database.sqlite");
    
    let options = SqliteConnectOptions::from_str(&format!("sqlite:{}", db_path.to_str().unwrap()))?
        .create_if_missing(true);

    let pool = SqlitePool::connect_with(options).await?;

    // Enable foreign keys
    sqlx::query("PRAGMA foreign_keys = ON").execute(&pool).await?;

    // Run migrations (schema)
    let schema = include_str!("../schema.sql");
    sqlx::query(schema).execute(&pool).await?;

    // Manual migration for price_per_dolar if it doesn't exist
    let _ = sqlx::query("ALTER TABLE productos ADD COLUMN price_per_dolar REAL NOT NULL DEFAULT 1.0")
        .execute(&pool)
        .await;

    let _ = sqlx::query("ALTER TABLE movimientos ADD COLUMN price_per_dolar REAL NOT NULL DEFAULT 1.0")
        .execute(&pool)
        .await;

    let _ = sqlx::query("ALTER TABLE productos ADD COLUMN unidad TEXT NOT NULL DEFAULT 'UNID'")
        .execute(&pool)
        .await;

    let _ = sqlx::query("ALTER TABLE movimientos ADD COLUMN precio_unitario REAL NOT NULL DEFAULT 0.0")
        .execute(&pool)
        .await;

    // Migración para POS: Añadir columna 'tipo' a facturas si no existe
    let _ = sqlx::query("ALTER TABLE facturas ADD COLUMN tipo TEXT NOT NULL DEFAULT 'COMPRA'")
        .execute(&pool)
        .await;

    // Asegurar que existan los métodos de pago iniciales
    let _ = sqlx::query("INSERT OR IGNORE INTO metodos_pago (nombre) VALUES 
        ('Efectivo USD'), ('Efectivo BS'), ('Pago Móvil'), ('Zelle'), 
        ('Punto de Venta'), ('PayPal'), ('BioPago')")
        .execute(&pool)
        .await;

    // Eliminar Binance si existía anteriormente
    let _ = sqlx::query("DELETE FROM metodos_pago WHERE nombre = 'Binance'")
        .execute(&pool)
        .await;

    // Manual migration: create categorias table if it doesn't exist
    let _ = sqlx::query(
        "CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        )"
    ).execute(&pool).await;

    // Manual migration: create subcategorias table if it doesn't exist
    let _ = sqlx::query(
        "CREATE TABLE IF NOT EXISTS subcategorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            categoria_id INTEGER NOT NULL,
            FOREIGN KEY(categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
            UNIQUE(nombre, categoria_id)
        )"
    ).execute(&pool).await;

    Ok(pool)
}
