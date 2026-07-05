@echo off
setlocal
cd /d "%~dp0"

echo ===================================================
echo   GALO - Laboratorio de seguridad (inicio)
echo ===================================================
echo.

echo Verificando si Docker esta disponible...
docker info >nul 2>&1
if %errorlevel%==0 goto docker_ready

echo Docker no esta activo todavia. Iniciando Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

echo Esperando a que Docker Desktop inicie (puede tardar 1-3 minutos la primera vez)...
:wait_loop
ping -n 6 127.0.0.1 >nul
docker info >nul 2>&1
if %errorlevel%==0 goto docker_ready
echo   ...todavia esperando a Docker...
goto wait_loop

:docker_ready
echo.
echo Docker listo. Levantando el laboratorio (postgres + api + nginx)...
docker compose up -d
if not %errorlevel%==0 (
  echo.
  echo Hubo un error levantando los contenedores. Revisa el mensaje de arriba.
  pause
  exit /b 1
)

echo.
echo Laboratorio arriba. Abriendo el dashboard en el navegador...
ping -n 4 127.0.0.1 >nul
start https://localhost:8443/

echo.
echo ===================================================
echo Listo. Usuario: admin
echo (la contrasena esta en el archivo .credentials.local.txt)
echo ===================================================
pause
