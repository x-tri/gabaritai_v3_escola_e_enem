@echo off
REM Script para iniciar o servidor GabaritAI no Windows

echo Iniciando GabaritAI...
echo Diretorio do projeto: %CD%

REM Verifica se node_modules existe
if not exist "node_modules" (
    echo node_modules nao encontrado. Instalando dependencias...
    call npm install
)

REM Inicia o servidor
echo Iniciando servidor em http://localhost:8080
call npm run dev

pause
