@echo off
cd /d "%~dp0"
rem En el primer arranque la base local esta vacia y se crea el superadministrador con esta contrasena.
if not exist "datos\pglite" if "%CREDILOCAL_CLAVE_INICIAL%"=="" set /p CREDILOCAL_CLAVE_INICIAL=Primer arranque. Contrasena inicial del superadministrador (8 a 64 caracteres, letras y numeros): 
node servidor-dist/main.mjs
pause
