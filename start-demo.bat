@echo off
echo ========================================
echo   Gestión de Actividad Laboral - DEMO
echo ========================================
echo.
echo 🚀 Iniciando servidor de demostración...
echo.

REM Verificar si Node.js está disponible
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js no está instalado o no está en el PATH
    echo 💡 Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

REM Verificar si el puerto 3000 está libre
netstat -an | find "3000" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Advertencia: El puerto 3000 parece estar en uso
    echo 💡 Si tienes problemas, cierra otras aplicaciones que usen este puerto
    echo.
)

REM Iniciar el servidor en segundo plano
echo ✅ Iniciando servidor en puerto 3000...
start "Gestion Actividad Demo Server" /min node demo-server.js

REM Esperar un momento para que el servidor inicie
timeout /t 3 /nobreak >nul

REM Abrir el navegador con la interfaz de demo
echo 🌐 Abriendo interfaz de demostración...
start "" "demo-frontend.html"

REM Abrir también la API principal
echo 📡 Abriendo información de la API...
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo ✅ ¡Demo iniciada correctamente!
echo.
echo 📋 URLs disponibles:
echo    • Interfaz Demo: file:///%CD%/demo-frontend.html
echo    • API Principal: http://localhost:3000
echo    • Health Check: http://localhost:3000/health
echo    • Métricas: http://localhost:3000/api/metrics/overview
echo    • Documentación: http://localhost:3000/api-docs
echo.
echo 💡 Para detener la demo:
echo    • Cierra la ventana del servidor
echo    • O ejecuta: taskkill /f /im node.exe
echo.
echo ⚠️  Nota: Esta es una demostración con datos simulados
echo    Para la versión completa, consulta el archivo DEPLOYMENT.md
echo.
pause