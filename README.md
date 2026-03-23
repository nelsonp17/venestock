# VenoStock - Sistema de Gestión Multimoneda (SGM)

VenoStock es una aplicación de escritorio diseñada para el control administrativo de inventarios en entornos con múltiples divisas (USD/VES). Construida con **Tauri**, **Rust** y **React**, ofrece una experiencia fluida con persistencia local y sincronización híbrida opcional.

## 🚀 Características Críticas

- **Inventario Multimoneda**: Gestión de productos con precios de referencia en USD y cálculo automático en Bolívares (VES).
- **Módulo POS (Punto de Venta)**: Interfaz ultra-rápida optimizada para teclado y escáner de códigos de barras.
- **Seguridad Robusta**: Validación de licencias en el backend (Rust) y ofuscación de código frontend.
- **VeneStock Cloud (PRO)**: Sincronización en tiempo real entre múltiples instancias utilizando Turso (libSQL).
- **Pagos Multimetodo**: Soporte para pagos mixtos (Efectivo, Pago Móvil, Zelle, etc.).
- **Scraping del BCV**: Actualización automática de la tasa oficial del Banco Central de Venezuela.
- **Control de Acceso por Roles**: Sistema de permisos basado en perfiles (`ADMIN`, `OPERADOR_POS`, `ALMACENISTA`, `GERENTE`).
- **Gestión de Sesiones**: Botón de cierre de sesión para liberar o cambiar licencias en un equipo.
- **Reportes Profesionales**: Exportación a PDF y Excel.

## 👥 Roles y Permisos

El sistema ahora soporta diferentes perfiles de usuario según el campo `role` definido en Appwrite:

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `ADMIN` | Dueño del negocio | Acceso total, incluyendo Base de Datos. |
| `GERENTE` | Administrador de tienda | Dashboard, Ventas, Inventario y Facturas. |
| `ALMACENISTA` | Control de stock | Inventario, Movimientos y Categorías. |
| `OPERADOR_POS` | Cajero | Únicamente módulo de Punto de Venta (POS). |

> **Nota:** Para habilitar esta función, asegúrese de que la colección de Appwrite tenga el atributo `role` (String). Por defecto se asigna `ADMIN`.

## ☁️ Sincronización Híbrida (PRO)

VeneStock utiliza una arquitectura de **Réplica Embebida**. La base de datos vive localmente para garantizar velocidad offline, pero se sincroniza automáticamente con la nube de Turso cuando hay internet.

### Configuración de Turso para Nuevos Clientes
1.  Crear una base de datos en [Turso](https://turso.tech/): `turso db create cliente-nombre`.
2.  Obtener la URL: `turso db show cliente-nombre --url`.
3.  Generar un Token: `turso db tokens create cliente-nombre`.
4.  Vincular a la licencia usando `python venestock.py` (Opción 4).

## ⌨️ Atajos de Teclado (POS)

| Tecla | Acción |
|-------|--------|
| `F1` | Buscar Producto manualmente |
| `F2` | Buscar/Registrar Cliente |
| `F12` | Procesar Pago / Cobrar |
| `Esc` | Cancelar Venta / Limpiar |

## 🛠️ Tecnologías Utilizadas

- **Backend**: Rust, Tauri, SQLx (SQLite), **libSQL (Turso Sync)**.
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Seguridad**: `vite-plugin-javascript-obfuscator`, Validación Mutex en Rust.

## 📁 Ubicación de los Datos

- **Ruta del Archivo**: `%APPDATA%\com.nelson.venestock\sgm_database.sqlite`

## ⚙️ Configuración para Desarrolladores

### Requisitos
- **Rust Toolchain**: [Instalar Rust](https://rustup.rs/)
- **Node.js**: v18+

### Pasos de Instalación
1. Clonar el repositorio.
2. `cd frontend && npm install`.
3. Ejecutar `npm run tauri dev`.

---
Desarrollado con ❤️ para Nelson Venestock.
