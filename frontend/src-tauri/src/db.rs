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
