use std::fs;
use tauri::{AppHandle, Manager};
use libsql::{Builder, Database};
use std::sync::Arc;
use tokio::time::{sleep, Duration};

pub async fn init_db(
    app_handle: &AppHandle, 
    turso_url: Option<String>, 
    turso_token: Option<String>
) -> Result<Arc<Database>, Box<dyn std::error::Error>> {
    let app_dir = app_handle.path().app_data_dir()?;
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)?;
    }
    let db_path = app_dir.join("sgm_database.sqlite");
    let db_path_str = db_path.to_str().unwrap().to_string();

    let db = if let (Some(url), Some(token)) = (turso_url, turso_token) {
        // --- CONFIGURACIÓN DE SINCRONIZACIÓN (TURSO) ---
        let db = Builder::new_remote_replica(&db_path_str, url, token)
            .build()
            .await?;
        
        let db_arc = Arc::new(db);
        let db_for_sync = Arc::clone(&db_arc);
        
        // Hilo de sincronización en segundo plano
        tokio::spawn(async move {
            loop {
                if let Err(e) = db_for_sync.sync().await {
                    eprintln!("Error sincronizando con Turso: {}", e);
                }
                sleep(Duration::from_secs(30)).await;
            }
        });

        // Sincronización inicial
        let _ = db_arc.sync().await;
        db_arc
    } else {
        // --- MODO LOCAL ÚNICAMENTE ---
        let db = Builder::new_local(&db_path_str).build().await?;
        Arc::new(db)
    };

    let conn = db.connect()?;

    // Run migrations (schema)
    let schema = include_str!("../schema.sql");
    conn.execute_batch(schema).await?;

    // --- MIGRACIONES MANUALES ---
    let _ = conn.execute("ALTER TABLE productos ADD COLUMN price_per_dolar REAL NOT NULL DEFAULT 1.0", ()).await;
    let _ = conn.execute("ALTER TABLE movimientos ADD COLUMN price_per_dolar REAL NOT NULL DEFAULT 1.0", ()).await;
    let _ = conn.execute("ALTER TABLE productos ADD COLUMN unidad TEXT NOT NULL DEFAULT 'UNID'", ()).await;
    let _ = conn.execute("ALTER TABLE movimientos ADD COLUMN precio_unitario REAL NOT NULL DEFAULT 0.0", ()).await;
    let _ = conn.execute("ALTER TABLE facturas ADD COLUMN tipo TEXT NOT NULL DEFAULT 'COMPRA'", ()).await;

    // Asegurar que existan los métodos de pago iniciales
    let metodos = vec![
        "Efectivo USD", "Efectivo BS", "Pago Móvil", "Zelle", 
        "Punto de Venta", "PayPal", "BioPago"
    ];
    for metodo in metodos {
        let _ = conn.execute("INSERT OR IGNORE INTO metodos_pago (nombre) VALUES (?)", [metodo]).await;
    }

    let _ = conn.execute("DELETE FROM metodos_pago WHERE nombre = 'Binance'", ()).await;

    // Categorias y Subcategorias
    let _ = conn.execute("CREATE TABLE IF NOT EXISTS categorias (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE NOT NULL)", ()).await;
    let _ = conn.execute("CREATE TABLE IF NOT EXISTS subcategorias (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, categoria_id INTEGER NOT NULL, FOREIGN KEY(categoria_id) REFERENCES categorias(id) ON DELETE CASCADE, UNIQUE(nombre, categoria_id))", ()).await;

    Ok(db)
}
