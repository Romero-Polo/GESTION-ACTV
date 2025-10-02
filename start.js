#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Colores para la consola
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

class ProjectStarter {
    constructor() {
        this.config = null;
        this.processes = [];
    }

    log(message, color = 'white') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    async loadConfig() {
        try {
            if (!fs.existsSync('config.json')) {
                throw new Error('config.json no encontrado');
            }

            const configContent = fs.readFileSync('config.json', 'utf8');
            this.config = JSON.parse(configContent);

            const env = this.config.current_environment || 'development';
            const envConfig = this.config[env];

            if (!envConfig) {
                throw new Error(`Entorno '${env}' no encontrado en config.json`);
            }

            this.log(`✅ Configuración cargada para entorno: ${env}`, 'green');
            this.log(`📂 Backend: ${envConfig.backend.protocol}://${envConfig.backend.host}:${envConfig.backend.port}`, 'cyan');
            this.log(`🌐 Frontend: ${envConfig.frontend.protocol}://${envConfig.frontend.host}:${envConfig.frontend.port}`, 'cyan');

            return envConfig;

        } catch (error) {
            this.log(`❌ Error cargando configuración: ${error.message}`, 'red');
            process.exit(1);
        }
    }

    async checkDependencies() {
        this.log('\n🔍 Verificando dependencias...', 'blue');

        // Verificar archivos esenciales
        const requiredFiles = [
            'backend/server-sql-final.js',
            'frontend/src/config.js',
            'frontend/index.html'
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                this.log(`❌ Archivo requerido no encontrado: ${file}`, 'red');
                process.exit(1);
            }
        }

        this.log('✅ Todos los archivos esenciales están presentes', 'green');
    }

    startBackend(config) {
        return new Promise((resolve, reject) => {
            this.log(`\n🚀 Iniciando backend en puerto ${config.backend.port}...`, 'blue');

            const backendProcess = spawn('node', ['server-sql-final.js'], {
                cwd: 'backend',
                env: {
                    ...process.env,
                    PORT: config.backend.port.toString(),
                    HOST: config.backend.host
                },
                stdio: ['inherit', 'pipe', 'pipe']
            });

            let started = false;

            backendProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`${colors.green}[BACKEND]${colors.reset} ${output.trim()}`);

                // Detectar cuando el servidor está listo
                if (output.includes('ejecutándose en puerto') && !started) {
                    started = true;
                    resolve();
                }
            });

            backendProcess.stderr.on('data', (data) => {
                console.log(`${colors.red}[BACKEND ERROR]${colors.reset} ${data.toString().trim()}`);
            });

            backendProcess.on('close', (code) => {
                this.log(`Backend terminado con código ${code}`, code === 0 ? 'green' : 'red');
                if (!started) {
                    reject(new Error(`Backend falló al iniciar (código ${code})`));
                }
            });

            this.processes.push(backendProcess);

            // Timeout si el backend no inicia en 30 segundos
            setTimeout(() => {
                if (!started) {
                    reject(new Error('Backend tardó demasiado en iniciar'));
                }
            }, 30000);
        });
    }

    startFrontend(config) {
        return new Promise((resolve) => {
            this.log(`\n🌐 Iniciando servidor frontend en puerto ${config.frontend.port}...`, 'blue');

            const frontendProcess = spawn('node', ['server-static.cjs'], {
                cwd: 'frontend',
                env: {
                    ...process.env,
                    PORT: config.frontend.port.toString(),
                    HOST: config.frontend.host
                },
                stdio: ['inherit', 'pipe', 'pipe']
            });

            frontendProcess.stdout.on('data', (data) => {
                console.log(`${colors.cyan}[FRONTEND]${colors.reset} ${data.toString().trim()}`);
            });

            frontendProcess.stderr.on('data', (data) => {
                console.log(`${colors.red}[FRONTEND ERROR]${colors.reset} ${data.toString().trim()}`);
            });

            frontendProcess.on('close', (code) => {
                this.log(`Frontend terminado con código ${code}`, code === 0 ? 'green' : 'red');
            });

            this.processes.push(frontendProcess);

            // El frontend se considera iniciado inmediatamente
            setTimeout(resolve, 2000);
        });
    }

    setupGracefulShutdown() {
        const shutdown = (signal) => {
            this.log(`\n📴 Recibida señal ${signal}, cerrando servicios...`, 'yellow');

            this.processes.forEach((process, index) => {
                if (process && !process.killed) {
                    this.log(`Terminando proceso ${index + 1}...`, 'yellow');
                    process.kill('SIGTERM');
                }
            });

            setTimeout(() => {
                this.log('🔴 Servicios cerrados', 'red');
                process.exit(0);
            }, 2000);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    }

    showStartupInfo(config) {
        this.log('\n🎉 ¡Servicios iniciados exitosamente!', 'green');
        this.log('\n📋 Información de acceso:', 'blue');
        this.log(`🌐 Frontend: ${config.frontend.protocol}://${config.frontend.host}:${config.frontend.port}`, 'cyan');
        this.log(`📡 API Backend: ${config.backend.protocol}://${config.backend.host}:${config.backend.port}`, 'cyan');
        this.log(`🏥 Health Check: ${config.backend.protocol}://${config.backend.host}:${config.backend.port}/health`, 'cyan');
        this.log('\n💡 Presiona Ctrl+C para detener los servicios', 'yellow');
    }

    async start() {
        try {
            // Banner de inicio
            this.log('\n╔══════════════════════════════════════════════╗', 'magenta');
            this.log('║     🏗️  GESTIÓN DE ACTIVIDADES - OBRAS     ║', 'magenta');
            this.log('║           Sistema de Inicio v1.0            ║', 'magenta');
            this.log('╚══════════════════════════════════════════════╝\n', 'magenta');

            // Cargar configuración
            const config = await this.loadConfig();

            // Verificar dependencias
            await this.checkDependencies();

            // Configurar shutdown graceful
            this.setupGracefulShutdown();

            // Iniciar backend
            await this.startBackend(config);

            // Iniciar frontend
            await this.startFrontend(config);

            // Mostrar información final
            this.showStartupInfo(config);

        } catch (error) {
            this.log(`❌ Error durante el inicio: ${error.message}`, 'red');
            process.exit(1);
        }
    }
}

// Funciones de utilidad para uso directo
function showHelp() {
    console.log(`
🏗️  Sistema de Gestión de Actividades - Script de Inicio

📋 Uso:
  node start.js                    Iniciar todo el sistema
  node start.js --help            Mostrar esta ayuda
  node start.js --config          Mostrar configuración actual

📂 Archivos de configuración:
  config.json                     Configuración principal
  frontend/src/config.js          Configuración del frontend

🔧 Entornos disponibles:
  development                     Desarrollo local
  production                      Producción

⚙️  Para cambiar el entorno, edita 'current_environment' en config.json
`);
}

function showConfig() {
    try {
        const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
        console.log('\n📋 Configuración actual:');
        console.log(JSON.stringify(config, null, 2));
    } catch (error) {
        console.log(`❌ Error leyendo configuración: ${error.message}`);
    }
}

// Manejo de argumentos de línea de comandos
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
    } else if (args.includes('--config') || args.includes('-c')) {
        showConfig();
    } else {
        const starter = new ProjectStarter();
        starter.start();
    }
}

module.exports = ProjectStarter;