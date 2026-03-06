# SGM VeneStock - Sistema de Gestión de Inventario

SGM VeneStock es una solución integral para el control de inventario y gestión de facturas, construida con una arquitectura moderna y segura utilizando **Tauri, React y Rust**.

---

## 🔐 Sistema de Privatización y Licenciamiento

VeneStock cuenta con un sistema de licenciamiento híbrido (Local + Nube) diseñado para proteger el software y permitir su comercialización de forma privada.

### 1. Arquitectura de Seguridad
El sistema utiliza **Appwrite Cloud** como servidor de licencias centralizado. Esto permite gestionar el acceso de los clientes sin necesidad de mantener un servidor propio, manteniendo los datos del inventario de forma segura y privada en una base de datos **SQLite local** en cada equipo.

### 2. Reglas de Negocio
*   **1 Licencia = 1 Equipo:** Cada licencia se vincula permanentemente al hardware de la computadora mediante un identificador único (Machine ID) obtenido de la BIOS/Placa base.
*   **Modo Offline:** Una vez activado, el software puede funcionar sin conexión a internet. Realiza verificaciones silenciosas en segundo plano cuando detecta conexión para validar el estado de la licencia (si ha sido bloqueada o ha expirado).
*   **Fecha de Expiración:** Soporta licencias vitalicias o temporales (ej. suscripciones de 30, 90 o 365 días).

### 3. Configuración de Appwrite (Licences)
Para que el sistema funcione, se requiere una base de datos en Appwrite llamada `licences` con una colección `venestock` que contenga los siguientes atributos:

| Atributo | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `key` | String | Sí | Llave de producto (VENE-XXXX-XXXX). |
| `machine_id` | String | No | ID único del hardware (se vincula al activar). |
| `owner_name` | String | Sí | Nombre del cliente o empresa. |
| `status` | String | Sí | Estado (`active`, `blocked`, `expired`). |
| `expiration_date` | Datetime | No | Fecha límite de uso (opcional). |
| `activated_at` | Datetime | No | Fecha de la primera activación. |

### 4. Gestión de Licencias (Administrador)
Se incluye un script de automatización en Python (`generate_licence.py`) para el desarrollador:
*   **Generar Licencias:** Permite crear nuevas llaves de producto asignadas a un cliente, definiendo si es vitalicia o temporal.
*   **Listar Clientes:** Muestra un reporte de todas las licencias emitidas, su estado y si ya han sido activadas en alguna PC.
*   **Resetear Licencias:** Para mover una licencia de una PC a otra, simplemente borra el campo `machine_id` desde el panel de Appwrite; la llave quedará disponible para una nueva activación única.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React + TypeScript + Vite.
- **Backend Nativo:** Rust (Tauri) para alto rendimiento y acceso a APIs del sistema.
- **Base de Datos Local:** SQLite (vía SQLx en Rust).
- **Estilos:** Tailwind CSS + Lucide Icons.
- **Licenciamiento:** Appwrite Cloud (Database & Queries).

## 🚀 Instalación y Desarrollo

1.  **Instalar dependencias de Node:**
    ```bash
    npm install
    ```
2.  **Configurar Appwrite:**
    Actualiza las credenciales en `src/lib/appwrite.ts` con tu `Project ID`.
3.  **Ejecutar en modo desarrollo:**
    ```bash
    npm run tauri dev
    ```
4.  **Compilar versión final (Producción):**
    ```bash
    npm run tauri build
    ```

---
© 2026 SGM VeneStock. Desarrollado por Nelson Portillo.
