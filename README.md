# venestock

## Descripción

**VenoStock** es una aplicación de escritorio desarrollada con **Tauri** y **React** diseñada para la gestión de inventario de productos farmacéuticos. Permite a los usuarios llevar un control detallado de sus productos, incluyendo precios, fechas de vencimiento y cantidades disponibles.

## Características Principales

- **Gestión de Productos**: CRUD completo para productos farmacéuticos.
- **Control de Inventario**: Seguimiento de stock y cantidades.
- **Precios**: Gestión de precios de venta y compra.
- **Fechas de Vencimiento**: Alertas y seguimiento de productos próximos a vencer.
- **Interfaz Moderna**: Diseño limpio y responsivo con Tailwind CSS.

## Requisitos Previos

- **Node.js** (v18 o superior)
- **Rust** (v1.70 o superior)
- **Tauri CLI** (opcional, para desarrollo)

## Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd venestock
   ```

2. **Instalar dependencias de React**
   ```bash
   cd frontend
   npm install
   ```

3. **Instalar dependencias de Rust**
   ```bash
   cd ../src-tauri
   cargo build
   ```

## Ejecución

Para ejecutar la aplicación en modo de desarrollo:

```bash
cd frontend
npm run dev
```

O desde el directorio raíz:

```bash
npm run tauri dev
```

## Construcción

Para generar un build de producción:

```bash
npm run tauri build
```

## Estructura del Proyecto

```
venestock/
├── frontend/          # Aplicación React
│   ├── src/
│   │   ├── components/  # Componentes reutilizables
│   │   ├── pages/       # Páginas de la aplicación
│   │   ├── services/    # Servicios de API
│   │   └── App.tsx      # Componente principal
│   ├── tailwind.config.js
│   └── package.json
├── src-tauri/         # Lógica de backend (Rust)
│   ├── src/
│   │   ├── main.rs      # Punto de entrada de la aplicación
│   │   └── models.rs    # Modelos de datos
│   ├── Cargo.toml
│   └── build.rs
└── README.md
```

## Tecnologías Utilizadas

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Rust, Tauri
- **Base de Datos**: SQLite (integrado con Tauri)
- **Gestión de Estado**: React Context API

## Contribuciones

Las contribuciones son bienvenidas. Por favor, sigue estos pasos:

1. Crea un branch para tu feature (`git checkout -b feature/AmazingFeature`)
2. Commitea tus cambios (`git commit -m 'Add some AmazingFeature'`)
3. Push al branch (`git push origin feature/AmazingFeature`)
4. Abre un Pull Request

## Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.
