# AGENTS.md - VenoStock

## 📋 Información del Proyecto

**VenoStock** es una aplicación de escritorio para control administrativo de inventarios en entornos con múltiples divisas (USD/VES).

### Tecnologías
- **Backend**: Rust, Tauri, SQLx (SQLite), Reqwest/Scraper
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Utilidades**: Framer Motion, jsPDF, XLSX, bwip-js

### Estructura
```
venestock/
├── frontend/          # Aplicación React
├── src-tauri/         # Backend Rust (Tauri)
└── README.md          # Documentación principal
```

---

## ⚙️ Comandos de Desarrollo

### Frontend
```bash
cd frontend
npm install              # Instalar dependencias
npm run dev             # Desarrollo web
npm run tauri dev       # Desarrollo desktop
npm run build           # Build producción
```

### Tauri
```bash
npm run tauri dev       # Desarrollo
npm run tauri build     # Build producción
```

---

## 📐 Convenciones de Código

### TypeScript/React
- Componentes con `PascalCase`
- Hooks personalizados con `camelCase` preceded by `use`
- Props interfaces con nombre `ComponentNameProps`
- Archivos de componentes: `ComponentName.tsx`
- Utilidades: `utils/`, `hooks/`, `lib/`

### Rust
- Cargo conventions: snake_case para módulos y archivos
- Prefijo `cmd_` para comandos Tauri
- Prefijo `mod_` para módulos

### CSS/Tailwind
- Tailwind CSS v4 con configuración CSS-first
- Usar clases de Tailwind en lugar de CSS personalizado
- Colores del tema en CSS variables

### Git
- Commits descriptivos en español o inglés
- Ramas: `feature/`, `fix/`, `refactor/`

---

## 🔧 Reglas para la IA

### Generales
1. **NO modificar código de producción** sin consentimiento explícito del usuario
2. **Preguntar antes de ejecutar** comandos destructivos o que modifiquen archivos
3. **Mantener el código limpio**: sin comentarios innecesarios, código muerto, o console.log de debug
4. **Seguir las convenciones existentes** del proyecto

### Frontend
1. Usar **TypeScript** estrictamente - nunca `any` sin justificación
2. Componentes funcionales con hooks
3. Preferir `const` sobre `let`
4. Usar early returns para evitar anidación excesiva
5. Importaciones ordenadas: React → libs → componentes propios → utils

### Rust/Tauri
1. Manejo de errores con `Result` y `?`
2. Usar logging en lugar de prints de debug
3. Validar inputs en el backend, no solo frontend

### Base de Datos
1. Fechas en UTC
2. Nombres de tablas y columnas en snake_case
3. Nunca exponer datos sensibles en logs

### UI/UX
1. Seguir el diseño existente de la aplicación
2. Usar componentes de Lucide Icons
3. Animaciones con Framer Motion para transiciones suaves
4. Responsive design para escritorio (optimizado para 1366x768+)

---

## 🗂️ Rutas Importantes

- **DB SQLite**: `%APPDATA%\com.nelson.venestock\sgm_database.sqlite`
- **Frontend entry**: `frontend/src/main.tsx`
- **Tauri commands**: `src-tauri/src/commands/`

---

## ✅ Checklist antes de commits

- [ ] No hay `console.log` o prints de debug
- [ ] TypeScript compila sin errores (`npm run typecheck` si existe)
- [ ] Build completo funciona
- [ ] Commits con mensajes descriptivos
