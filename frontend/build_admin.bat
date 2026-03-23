@echo off
echo ==========================================
echo   VenoStock Admin Tool - Build System
echo ==========================================

:: 1. Verificar si existe el entorno virtual
if exist venv goto SKIP_VENV
echo [1/5] Creando entorno virtual (venv)...
python -m venv venv
:SKIP_VENV
echo [1/5] El entorno virtual esta listo.

:: 2. Activar el entorno virtual
echo [2/5] Activando entorno virtual...
call venv\Scripts\activate

:: 3. Instalar dependencias
echo [3/5] Instalando dependencias necesarias...
python -m pip install --upgrade pip
pip install appwrite python-dotenv pyinstaller

:: 4. Generar requirements.txt
echo [4/5] Generando requirements.txt...
pip freeze > requirements.txt

:: 5. Compilar
echo [5/5] Iniciando compilacion...
:: Verificamos si existe el .env antes de compilar
if not exist ".env" (
    echo [ERROR] No existe el archivo .env en esta carpeta.
    goto END
)

:: 6. Abrir la carpeta de salida
if exist "dist" (
    echo [OK] Abriendo carpeta del ejecutable...
    start explorer "dist"
)

pyinstaller --noconfirm --onefile --console --name "venestock" --add-data ".env;." --clean venestock.py

:END
echo.
echo ==========================================
echo   PROCESO FINALIZADO
echo ==========================================
pause