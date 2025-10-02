const fs = require('fs');
const path = require('path');

// Lista de archivos HTML a actualizar
const htmlFiles = [
    'frontend/agenda.html',
    'frontend/actividades.html',
    'frontend/configuracion.html',
    'frontend/equipos.html',
    'frontend/index.html',
    'frontend/nueva-actividad.html',
    'frontend/tipos-actividad.html',
    'frontend/usuarios.html',
    'frontend/obras.html',
    'frontend/logs.html',
    'frontend/changelog.html',
    'frontend/report-agenda.html'
];

function updateHtmlFile(filePath) {
    console.log(`\n🔄 Procesando: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.log(`❌ Archivo no encontrado: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Agregar script de configuración antes del primer <script> existente
    const scriptConfigTag = '<script src="src/config.js"></script>';

    if (!content.includes(scriptConfigTag)) {
        const firstScriptMatch = content.match(/<script(?:\s[^>]*)?>/);
        if (firstScriptMatch) {
            const firstScriptIndex = content.indexOf(firstScriptMatch[0]);
            content = content.substring(0, firstScriptIndex) +
                     `    <!-- Configuración centralizada -->\n    ${scriptConfigTag}\n\n    ` +
                     content.substring(firstScriptIndex);
            modified = true;
            console.log('✅ Agregado script de configuración');
        }
    }

    // 2. Reemplazar definiciones hardcodeadas de API_BASE
    const apiBaseRegex = /const\s+API_BASE\s*=\s*['"](https?:\/\/[^'"]+)['"];?/g;
    const apiBaseMatches = content.match(apiBaseRegex);

    if (apiBaseMatches) {
        content = content.replace(apiBaseRegex,
            '// API_BASE se carga automáticamente desde config.js\n        let API_BASE = window.API_BASE || \'http://localhost:3002\';'
        );
        modified = true;
        console.log(`✅ Reemplazadas ${apiBaseMatches.length} definiciones de API_BASE`);
    }

    // 3. Buscar y reemplazar URLs hardcodeadas comunes
    const urlPatterns = [
        { pattern: /(['"])http:\/\/localhost:3001(['"])/g, replacement: '${API_BASE}' },
        { pattern: /(['"])http:\/\/localhost:3002(['"])/g, replacement: '${API_BASE}' },
        { pattern: /(['"])http:\/\/localhost:3000(['"])/g, replacement: '${API_BASE}' }
    ];

    urlPatterns.forEach(({ pattern, replacement }) => {
        const matches = content.match(pattern);
        if (matches) {
            // Solo reemplazar si no están dentro de comentarios
            content = content.replace(pattern, (match, quote1, quote2) => {
                return `\${window.appConfig?.getApiUrl('') || 'http://localhost:3002'}`;
            });
            modified = true;
            console.log(`✅ Reemplazadas ${matches.length} URLs hardcodeadas`);
        }
    });

    // 4. Agregar inicialización de configuración al final del body si no existe
    const configInitScript = `
    <script>
        // Inicializar configuración si no está disponible
        document.addEventListener('DOMContentLoaded', async function() {
            if (!window.appConfig || !window.appConfig.initialized) {
                console.warn('⚠️ Sistema de configuración no disponible, usando valores por defecto');
                if (!window.API_BASE) {
                    window.API_BASE = 'http://localhost:3002';
                }
            } else {
                await window.appConfig.init();
                // Actualizar API_BASE local si existe
                if (typeof API_BASE !== 'undefined') {
                    API_BASE = window.API_BASE;
                }
            }
        });
    </script>`;

    if (!content.includes('window.appConfig') && !content.includes('API_BASE se carga automáticamente')) {
        const bodyEndIndex = content.lastIndexOf('</body>');
        if (bodyEndIndex !== -1) {
            content = content.substring(0, bodyEndIndex) +
                     configInitScript + '\n' +
                     content.substring(bodyEndIndex);
            modified = true;
            console.log('✅ Agregado script de inicialización de configuración');
        }
    }

    // Guardar archivo si se modificó
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Archivo actualizado: ${filePath}`);
    } else {
        console.log(`📝 Sin cambios necesarios: ${filePath}`);
    }
}

function main() {
    console.log('🚀 Iniciando actualización del sistema de configuración...\n');

    // Verificar que existe el archivo de configuración
    if (!fs.existsSync('config.json')) {
        console.log('❌ No se encontró config.json en la raíz del proyecto');
        process.exit(1);
    }

    if (!fs.existsSync('frontend/src/config.js')) {
        console.log('❌ No se encontró frontend/src/config.js');
        process.exit(1);
    }

    console.log('✅ Archivos de configuración encontrados');

    // Procesar cada archivo HTML
    let processed = 0;
    let errors = 0;

    htmlFiles.forEach(filePath => {
        try {
            updateHtmlFile(filePath);
            processed++;
        } catch (error) {
            console.log(`❌ Error procesando ${filePath}: ${error.message}`);
            errors++;
        }
    });

    console.log(`\n📊 Resumen:`);
    console.log(`✅ Archivos procesados: ${processed}`);
    console.log(`❌ Errores: ${errors}`);

    if (errors === 0) {
        console.log('\n🎉 ¡Actualización completada exitosamente!');
        console.log('\n📝 Pasos siguientes:');
        console.log('1. Verificar que config.json tiene la configuración correcta');
        console.log('2. Probar las páginas web para asegurar que funcionan');
        console.log('3. Usar el script start.js para iniciar el proyecto');
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = { updateHtmlFile, main };