# VenoStock - Sistema de Gestión Multimoneda (SGM)

VenoStock es una aplicación de escritorio diseñada para el control administrativo de inventarios en entornos con múltiples divisas (USD/VES). Construida con **Tauri**, **Rust** y **React**, ofrece una experiencia fluida con persistencia local y sincronización de tasas en tiempo real.

## 🚀 Características Críticas

- **Inventario Multimoneda**: Gestión de productos con precios de referencia en USD y cálculo automático en Bolívares (VES).
- **Módulo POS (Punto de Venta)**: Interfaz ultra-rápida optimizada para teclado y escáner de códigos de barras.
- **Gestión de Clientes**: Registro rápido de clientes (Cédula, Nombre, Apellido) con soporte para ventas anónimas.
- **Pagos Multimetodo**: Soporte para pagos mixtos en Efectivo (USD/VES), Pago Móvil, Zelle, Punto de Venta, PayPal, BioPago y Binance.
- **Scraping del BCV**: Módulo integrado para obtener la tasa oficial del Banco Central de Venezuela con un solo clic.
- **Movimientos de Stock**: Registro histórico de entradas y salidas que afecta automáticamente las existencias.
- **Etiquetado e Impresión**: Generación de etiquetas con códigos de barras y precios actualizados listos para su uso.
- **Reportes Profesionales**: Exportación de inventario y movimientos a formatos PDF y Excel.

## ⌨️ Atajos de Teclado (POS)

| Tecla | Acción |
|-------|--------|
| `F1` | Buscar Producto manualmente |
| `F2` | Buscar/Registrar Cliente |
| `F12` | Procesar Pago / Cobrar |
| `Esc` | Cancelar Venta / Limpiar |
| `+` / `-` | Ajustar cantidades en el carrito |
| `Supr` | Eliminar item seleccionado |

## 🛠️ Tecnologías Utilizadas

- **Backend**: Rust, Tauri, SQLx (SQLite), Reqwest/Scraper (Web Scraping).
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Librerías de Utilidad**: Framer Motion, jsPDF, XLSX, bwip-js.

## 📁 Ubicación de los Datos

El sistema utiliza una base de datos local SQLite para garantizar la privacidad y portabilidad.
- **Ruta del Archivo**: `%APPDATA%\com.nelson.venestock\sgm_database.sqlite`
- **Cómo encontrarlo**: 
  1. Presiona las teclas `Explorador de archivos` o `Win + R`.
  2. Pega `%APPDATA%\com.nelson.venestock` en la barra de direcciones.
  3. Verás el archivo `sgm_database.sqlite`. Puedes abrirlo con herramientas como [DB Browser for SQLite](https://sqlitebrowser.org/).

## ⚙️ Configuración para Desarrolladores

### Requisitos
- **Rust Toolchain**: [Instalar Rust](https://rustup.rs/)
- **Node.js**: v18+

### Pasos de Instalación
1. Clonar el repositorio.
2. Navegar a la carpeta `frontend/`.
3. Ejecutar `npm install`.
4. Iniciar el entorno de desarrollo:
   ```bash
   npm run tauri dev
   ```

## 📝 Notas de Implementación
- Las fechas en la base de datos se almacenan en formato UTC para mayor precisión entre zonas horarias.
- El sistema de estilos utiliza Tailwind CSS v4 con configuración CSS-first en `src/index.css`.

---
Desarrollado con ❤️ para Nelson Venestock.
