CREATE TABLE IF NOT EXISTS tasas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    valor REAL NOT NULL,
    fecha DATETIME NOT NULL,
    fuente TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    barras TEXT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio_ref_usd REAL NOT NULL DEFAULT 0.0,
    precio_bs REAL NOT NULL DEFAULT 0.0,
    categoria TEXT,
    subcategoria TEXT,
    stock INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL,
    tipo TEXT NOT NULL, -- 'ENTRADA', 'SALIDA'
    cantidad INTEGER NOT NULL,
    tasa_momento REAL NOT NULL,
    total_usd REAL NOT NULL,
    total_bs REAL NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(producto_id) REFERENCES productos(id)
);

-- Insert an initial rate if none exists
INSERT INTO tasas (valor, fecha, fuente) 
SELECT 1.0, datetime('now'), 'SISTEMA'
WHERE NOT EXISTS (SELECT 1 FROM tasas);
