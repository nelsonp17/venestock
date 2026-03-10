# Reporte de Análisis del Sistema VeneStock

## 1. Resumen Ejecutivo
VeneStock es una aplicación de escritorio multiplataforma (enfocada en Windows) construida con **Tauri**, **Rust** y **React**. El sistema está diseñado para la gestión de inventarios con soporte para múltiples divisas (USD/VES), integrando una base de datos local SQLite y una capa de licencias sincronizada con Appwrite.

## 2. Análisis de Arquitectura
### 2.1. Backend (Rust/Tauri)
- **Base de Datos:** Utiliza SQLite mediante `sqlx`. La inicialización de la base de datos se maneja en `db.rs`, incluyendo migraciones manuales.
- **Scraping:** Implementa un raspador web para obtener la tasa oficial del Banco Central de Venezuela (BCV).
- **Integración de Sistema:** Utiliza comandos de shell (`wmic`) para obtener identificadores únicos de hardware.

### 2.2. Frontend (React/TypeScript)
- **Framework:** React 19 con Vite y Tailwind CSS 4.
- **Estado y Servicios:** Integración con Appwrite para la gestión de licencias en la nube.
- **UI/UX:** Uso de bibliotecas modernas como Framer Motion para animaciones y Lucide para iconografía.

## 3. Hallazgos Principales
### 3.1. Gestión de Licencias
El sistema implementa un `LicenseGuard` que bloquea el acceso si no se detecta una licencia válida en `localStorage`. La validación incluye el ID de la máquina para evitar la piratería simple.

### 3.2. Sincronización de Tasas
La aplicación permite automatizar la actualización de precios mediante el scraping de la tasa del BCV, lo cual es crítico dado el entorno económico de Venezuela.

### 3.3. Integridad de Datos
El esquema SQL utiliza claves foráneas y restricciones de unicidad, lo cual asegura una base de datos relacional robusta.

## 4. Vulnerabilidades Identificadas
### 4.1. Bypass de Licencia en el Cliente (Severidad: Alta)
- **Descripción:** La lógica de `LicenseGuard` reside enteramente en el frontend. Un usuario con conocimientos básicos de desarrollo web puede deshabilitar el componente o manipular el `localStorage` para saltarse la activación.
- **Impacto:** Posible uso no autorizado del software sin licencia.

### 4.2. Exposición de Identificadores de Appwrite (Severidad: Baja)
- **Descripción:** El `PROJECT_ID` y `COLLECTION_ID` de Appwrite están presentes en el frontend (`appwrite.ts`). Si bien esto es estándar en Appwrite, la seguridad depende totalmente de la configuración de permisos (ACL) en la consola de Appwrite.
- **Nota sobre Herramientas Internas:** El script `generate_licence.py` contiene una `API_KEY` administrativa, pero al ser una herramienta de uso exclusivo del desarrollador y no distribuirse con la aplicación, no representa un riesgo para el producto final. Se recomienda, no obstante, el uso de variables de entorno locales para evitar commits accidentales de secretos en repositorios privados.

### 4.3. Fragilidad del Scraper (Severidad: Baja)
- **Descripción:** El scraper en `scraper.rs` depende de selectores CSS específicos (`#dolar strong`). Si el BCV cambia su diseño web, la funcionalidad de actualización automática de la tasa fallará.

### 4.4. Identificación de Hardware Débil (Severidad: Media)
- **Descripción:** `wmic csproduct get uuid` puede devolver valores genéricos o ser fácilmente alterado mediante software de virtualización o cambios en la BIOS.

## 5. Sugerencias y Mejoras Propuestas

### 5.1. Refuerzo de Seguridad
- **Validación en Backend:** Mover la comprobación de la licencia al lado de Rust. Cada comando de base de datos (`tauri::command`) debería verificar que la licencia local es válida antes de ejecutarse.
- **Encriptación de Datos Locales:** Encriptar la información de la licencia guardada localmente utilizando una clave derivada del hardware.

### 5.2. Arquitectura de Software
- **Migraciones Formales:** Sustituir las migraciones manuales en `db.rs` por archivos de migración estándar de `sqlx-cli` para un mejor control de versiones de la base de datos.
- **Variables de Entorno:** Utilizar un archivo `.env` o el sistema de configuración de Tauri para manejar los IDs de Appwrite, evitando hardcoding.

### 5.3. Robustez y Funcionalidad
- **Múltiples Fuentes de Tasas:** Agregar fuentes alternativas (como APIs de terceros o Monitor Dólar) en caso de que el sitio del BCV no esté disponible o su estructura cambie.
- **Logs y Auditoría:** Implementar un sistema de logging en el backend para rastrear errores de base de datos y actividades críticas (como cambios masivos de precios).
- **Backup Automático:** Implementar una función que realice copias de seguridad de `sgm_database.sqlite` periódicamente o antes de operaciones críticas (como `clear_database`).

### 5.4. Mejoras en el Frontend
- **Abstracción de Servicios:** Mover las llamadas de Appwrite a un servicio centralizado en Rust para que el frontend solo interactúe con el backend de la aplicación, mejorando la seguridad y la mantenibilidad.
