// Servidor estático simple para frontend
const http = require('http');
const fs = require('fs');
const path = require('path');

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.tsx': 'text/javascript',
    '.ts': 'text/javascript'
};

const server = http.createServer((req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let filePath = req.url === '/' ? '/index.html' : req.url;

    // Remover query parameters
    filePath = filePath.split('?')[0];

    // Caso especial: servir config.json desde la raíz del proyecto
    let fullPath;
    if (filePath === '/config.json') {
        fullPath = path.join(__dirname, '..', 'config.json');
    } else {
        fullPath = path.join(__dirname, filePath);
    }

    // Verificar que el archivo esté dentro del directorio frontend o sea config.json
    if (!fullPath.startsWith(__dirname) && filePath !== '/config.json') {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Si no se encuentra el archivo, servir index.html (SPA)
                fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
                    if (err) {
                        res.writeHead(500);
                        res.end(`Server Error: ${err.code}`);
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            const extname = path.extname(fullPath).toLowerCase();
            const contentType = mimeTypes[extname] || 'application/octet-stream';

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const PORT = process.env.PORT || 5173;

// Leer configuración para mostrar el puerto del backend correcto
let backendPort = 3002; // Por defecto
try {
    const configPath = path.join(__dirname, '..', 'config.json');
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const env = config.current_environment || 'development';
        if (config[env] && config[env].backend) {
            backendPort = config[env].backend.port;
        }
    }
} catch (error) {
    console.warn('⚠️  No se pudo leer config.json, usando puerto backend por defecto');
}

server.listen(PORT, () => {
    console.log(`🌐 Frontend server ejecutándose en puerto ${PORT}`);
    console.log(`📂 Sirviendo archivos desde: ${__dirname}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`🔧 API Backend: http://localhost:${backendPort}`);
    console.log(`\n✅ Servidor frontend listo`);
});

server.on('error', (error) => {
    console.error('❌ Error del servidor:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Puerto ${PORT} ya está en uso. Intenta con otro puerto.`);
    }
});

process.on('SIGINT', () => {
    console.log('\n🔄 Cerrando servidor frontend...');
    server.close(() => {
        console.log('✅ Servidor frontend cerrado');
        process.exit(0);
    });
});