const fs = require('fs');
const path = require('path');

// Lista de archivos HTML a actualizar (excluyendo agenda.html que ya está actualizado)
const htmlFiles = [
    'actividades.html',
    'configuracion.html',
    'equipos.html',
    'index.html',
    'nueva-actividad.html',
    'tipos-actividad.html',
    'usuarios.html',
    'obras.html',
    'logs.html',
    'changelog.html',
    'report-agenda.html'
];

// Nuevo footer HTML mejorado
const newFooterHTML = `
    <!-- Footer de información de conexión -->
    <footer style="position: fixed; bottom: 0; left: 0; right: 0; background-color: #1f2937; color: #9ca3af; padding: 8px 16px; font-size: 11px; border-top: 1px solid #374151; z-index: 1000;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; gap: 15px; align-items: center;">
                <span>Frontend: http://localhost:5173</span>
                <span>Backend: <span id="apiBaseUrl">http://localhost:3002</span></span>
            </div>
            <div style="display: flex; gap: 15px; align-items: center;">
                <span>Última llamada: <span id="lastApiCall">Ninguna</span></span>
                <span id="apiStatus" style="padding: 2px 6px; border-radius: 3px; background-color: #374151;">Esperando...</span>
            </div>
        </div>
    </footer>

    <!-- Script para monitorear llamadas API -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Actualizar la URL del API en el footer
            const apiBaseElement = document.getElementById('apiBaseUrl');
            if (apiBaseElement && typeof API_BASE !== 'undefined') {
                apiBaseElement.textContent = API_BASE;
            }

            // Interceptar llamadas fetch para mostrar actividad de API
            const originalFetch = window.fetch;
            const lastApiCallElement = document.getElementById('lastApiCall');
            const apiStatusElement = document.getElementById('apiStatus');

            window.fetch = async function(...args) {
                const [url, options] = args;

                // Solo mostrar llamadas que vayan al API backend
                if (typeof url === 'string' && (url.includes('localhost:300') || url.includes(API_BASE))) {
                    const method = options?.method || 'GET';
                    const endpoint = url.replace(API_BASE, '').split('?')[0];

                    // Mostrar llamada en progreso
                    lastApiCallElement.textContent = \`\${method} \${endpoint}\`;
                    apiStatusElement.textContent = 'Cargando...';
                    apiStatusElement.style.backgroundColor = '#f59e0b';

                    try {
                        const response = await originalFetch(...args);

                        // Mostrar resultado
                        const status = response.ok ? 'OK' : \`Error \${response.status}\`;
                        apiStatusElement.textContent = status;
                        apiStatusElement.style.backgroundColor = response.ok ? '#10b981' : '#ef4444';

                        // Resetear después de 2 segundos
                        setTimeout(() => {
                            if (apiStatusElement.textContent === status) {
                                apiStatusElement.textContent = 'Listo';
                                apiStatusElement.style.backgroundColor = '#374151';
                            }
                        }, 2000);

                        return response;
                    } catch (error) {
                        apiStatusElement.textContent = 'Error de red';
                        apiStatusElement.style.backgroundColor = '#ef4444';
                        setTimeout(() => {
                            apiStatusElement.textContent = 'Error';
                            apiStatusElement.style.backgroundColor = '#374151';
                        }, 3000);
                        throw error;
                    }
                }

                return originalFetch(...args);
            };
        });
    </script>
</body>
</html>`;

const frontendDir = './frontend';

// Función para actualizar footer en cada archivo
function updateFooterInFile(filename) {
    const filePath = path.join(frontendDir, filename);

    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
        console.log(`❌ Archivo no encontrado: ${filename}`);
        return;
    }

    // Leer el contenido del archivo
    let content = fs.readFileSync(filePath, 'utf8');

    // Buscar el footer existente para reemplazarlo
    const footerStartRegex = /<!-- Footer de información de conexión -->/;
    const bodyEndRegex = /<\/body>\s*<\/html>\s*$/;

    if (footerStartRegex.test(content)) {
        // Ya tiene footer, reemplazarlo
        const footerStart = content.search(footerStartRegex);
        const bodyEnd = content.search(bodyEndRegex);

        if (footerStart !== -1 && bodyEnd !== -1) {
            // Extraer el contenido antes del footer
            const beforeFooter = content.substring(0, footerStart);

            // Reemplazar con el nuevo footer
            content = beforeFooter + newFooterHTML;

            // Escribir el archivo actualizado
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Footer actualizado en ${filename}`);
        } else {
            console.log(`❌ No se pudo encontrar la estructura del footer en ${filename}`);
        }
    } else {
        // No tiene footer, añadirlo
        if (bodyEndRegex.test(content)) {
            content = content.replace(bodyEndRegex, newFooterHTML);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Footer añadido a ${filename}`);
        } else {
            console.log(`❌ No se encontró </body></html> en ${filename}`);
        }
    }
}

// Procesar todos los archivos
console.log('🚀 Comenzando a actualizar footers...');
htmlFiles.forEach(updateFooterInFile);
console.log('✅ Proceso de actualización completado!');