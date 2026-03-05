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

    Ok(pool)
}
