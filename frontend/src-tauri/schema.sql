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
    stock INTEGER NOT NULL DEFAULT 0,
    price_per_dolar REAL NOT NULL DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS subcategorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    categoria_id INTEGER NOT NULL,
    FOREIGN KEY(categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
    UNIQUE(nombre, categoria_id)
);

CREATE TABLE IF NOT EXISTS facturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT UNIQUE NOT NULL,
    fecha DATE NOT NULL,
    proveedor TEXT,
    observaciones TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL,
    tipo TEXT NOT NULL, -- 'ENTRADA', 'SALIDA'
    cantidad INTEGER NOT NULL,
    tasa_momento REAL NOT NULL,
    total_usd REAL NOT NULL,
    total_bs REAL NOT NULL,
    price_per_dolar REAL NOT NULL DEFAULT 1.0,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    factura_id INTEGER,
    FOREIGN KEY(producto_id) REFERENCES productos(id),
    FOREIGN KEY(factura_id) REFERENCES facturas(id)
);

-- Insert an initial rate if none exists
INSERT INTO tasas (valor, fecha, fuente) 
SELECT 1.0, '2000-01-01 00:00:00', 'SISTEMA'
WHERE NOT EXISTS (SELECT 1 FROM tasas);
