@echo off
cd /d "%~dp0"

echo ===================================================
echo   GALGO - Laboratorio de seguridad (detener)
echo ===================================================
echo.
echo Deteniendo los contenedores (los datos se conservan)...
docker compose down

echo.
echo Listo. Para volver a levantarlo usa iniciar-laboratorio.bat
pause
