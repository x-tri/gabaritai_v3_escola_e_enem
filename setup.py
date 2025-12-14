#!/usr/bin/env python3
"""
GabaritAI Setup Script
Automatiza a instalação e inicialização do projeto
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.END}")

def run_command(cmd, description=""):
    """Execute a shell command"""
    if description:
        print_info(f"Executando: {description}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            print_error(f"Falha: {result.stderr}")
            return False
        if result.stdout:
            print(f"{Colors.CYAN}{result.stdout}{Colors.END}")
        return True
    except subprocess.TimeoutExpired:
        print_error(f"Timeout ao executar: {cmd}")
        return False
    except Exception as e:
        print_error(f"Erro: {str(e)}")
        return False

def check_prerequisites():
    """Verifica se Node.js e npm estão instalados"""
    print_header("1️⃣  VERIFICANDO PRÉ-REQUISITOS")

    # Check Node.js
    try:
        result = subprocess.run("node --version", shell=True, capture_output=True, text=True, timeout=5)
        node_version = result.stdout.strip()
        print_success(f"Node.js encontrado: {node_version}")
    except:
        print_error("Node.js não encontrado. Instale em: https://nodejs.org")
        return False

    # Check npm
    try:
        result = subprocess.run("npm --version", shell=True, capture_output=True, text=True, timeout=5)
        npm_version = result.stdout.strip()
        print_success(f"npm encontrado: {npm_version}")
    except:
        print_error("npm não encontrado")
        return False

    return True

def check_project_directory():
    """Verifica se está no diretório correto"""
    print_header("2️⃣  VERIFICANDO DIRETÓRIO DO PROJETO")

    cwd = os.getcwd()
    print_info(f"Diretório atual: {cwd}")

    required_files = ["package.json", "vite.config.ts", "server/index.ts", "client/src/main.tsx"]
    missing = []

    for file in required_files:
        if os.path.exists(file):
            print_success(f"Encontrado: {file}")
        else:
            print_error(f"Faltando: {file}")
            missing.append(file)

    if missing:
        print_error(f"Faltam arquivos! Você está no diretório correto?")
        return False

    return True

def clean_cache():
    """Remove caches antigos"""
    print_header("3️⃣  LIMPANDO CACHES")

    dirs_to_remove = [
        "node_modules",
        "dist",
        ".vite",
        ".turbo",
        ".next",
        ".eslintcache"
    ]

    for dir_name in dirs_to_remove:
        if os.path.exists(dir_name):
            try:
                shutil.rmtree(dir_name)
                print_success(f"Removido: {dir_name}")
            except Exception as e:
                print_warning(f"Não foi possível remover {dir_name}: {str(e)}")

    files_to_remove = [
        "package-lock.json",
        "yarn.lock",
        "tsconfig.tsbuildinfo",
        "npm-debug.log"
    ]

    for file_name in files_to_remove:
        if os.path.exists(file_name):
            try:
                os.remove(file_name)
                print_success(f"Removido: {file_name}")
            except Exception as e:
                print_warning(f"Não foi possível remover {file_name}: {str(e)}")

    print_info("Limpando cache npm...")
    run_command("npm cache clean --force", "Limpeza de cache npm")

    return True

def install_dependencies():
    """Instala dependências npm"""
    print_header("4️⃣  INSTALANDO DEPENDÊNCIAS")

    print_info("Isso pode demorar 3-5 minutos. Aguarde...")

    if run_command("npm install", "Instalação de dependências"):
        print_success("Dependências instaladas com sucesso!")
        return True
    else:
        print_warning("Tentando com --legacy-peer-deps...")
        if run_command("npm install --legacy-peer-deps", "Instalação com legacy peer deps"):
            print_success("Dependências instaladas com sucesso!")
            return True
        else:
            print_error("Falha na instalação de dependências")
            return False

def check_typescript():
    """Verifica se TypeScript compila sem erros"""
    print_header("5️⃣  VERIFICANDO COMPILAÇÃO TYPESCRIPT")

    if run_command("npm run check", "Verificação TypeScript"):
        print_success("TypeScript compilado sem erros!")
        return True
    else:
        print_warning("TypeScript tem erros (isso pode ser ok se forem apenas type hints)")
        return True  # Continua mesmo com warnings

def start_dev_server():
    """Inicia o servidor de desenvolvimento"""
    print_header("6️⃣  INICIANDO SERVIDOR DE DESENVOLVIMENTO")

    print_info("Iniciando npm run dev...")
    print_warning("O servidor vai rodar em http://localhost:8080")
    print_info("Pressione Ctrl+C para parar\n")

    try:
        subprocess.run("npm run dev", shell=True, timeout=None)
    except KeyboardInterrupt:
        print_info("\nServidor parado pelo usuário")
        return True
    except Exception as e:
        print_error(f"Erro ao iniciar servidor: {str(e)}")
        return False

def main():
    """Função principal"""
    print(f"\n{Colors.BOLD}{Colors.GREEN}")
    print("╔════════════════════════════════════════════╗")
    print("║          GabaritAI - Setup Script          ║")
    print("║       Flexible Exam Configuration          ║")
    print("╚════════════════════════════════════════════╝")
    print(f"{Colors.END}\n")

    # 1. Check prerequisites
    if not check_prerequisites():
        print_error("Instale Node.js e npm antes de continuar")
        sys.exit(1)

    # 2. Check project directory
    if not check_project_directory():
        print_error("Execute este script no diretório raiz do projeto")
        sys.exit(1)

    # 3. Clean cache
    if not clean_cache():
        print_warning("Limpeza incompleta, continuando...")

    # 4. Install dependencies
    if not install_dependencies():
        print_error("Falha ao instalar dependências")
        sys.exit(1)

    # 5. Check TypeScript
    check_typescript()

    # 6. Start dev server
    print_header("✨ TUDO PRONTO! INICIANDO SERVIDOR...")
    start_dev_server()

if __name__ == "__main__":
    main()
