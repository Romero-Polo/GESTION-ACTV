// Configuración centralizada para el frontend
// Este archivo se genera automáticamente desde el config.json principal

class AppConfig {
    constructor() {
        this.config = null;
        this.API_BASE = null;
        this.FRONTEND_BASE = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) {
            return;
        }

        try {
            // Intentar cargar desde config.json en la raíz del proyecto
            const response = await fetch('../config.json');
            if (!response.ok) {
                throw new Error('Config file not found');
            }

            this.config = await response.json();

            // Usar el entorno actual
            const env = this.config.current_environment || 'development';
            const envConfig = this.config[env];

            if (!envConfig) {
                throw new Error(`Environment '${env}' not found in config`);
            }

            // Configurar URLs base
            const backendConfig = envConfig.backend;
            const frontendConfig = envConfig.frontend;

            this.API_BASE = `${backendConfig.protocol}://${backendConfig.host}:${backendConfig.port}`;
            this.FRONTEND_BASE = `${frontendConfig.protocol}://${frontendConfig.host}:${frontendConfig.port}`;

            // Establecer variable global para compatibilidad
            window.API_BASE = this.API_BASE;
            window.FRONTEND_BASE = this.FRONTEND_BASE;

            this.initialized = true;

            console.log('✅ Configuración cargada:', {
                environment: env,
                api_base: this.API_BASE,
                frontend_base: this.FRONTEND_BASE
            });

        } catch (error) {
            console.warn('⚠️  No se pudo cargar config.json, usando configuración por defecto:', error.message);
            this.useDefaultConfig();
        }
    }

    useDefaultConfig() {
        // Configuración por defecto si no se puede cargar el archivo
        this.API_BASE = 'http://localhost:3002';
        this.FRONTEND_BASE = 'http://localhost:8080';

        window.API_BASE = this.API_BASE;
        window.FRONTEND_BASE = this.FRONTEND_BASE;

        this.initialized = true;

        console.log('📝 Usando configuración por defecto:', {
            api_base: this.API_BASE,
            frontend_base: this.FRONTEND_BASE
        });
    }

    getApiUrl(endpoint = '') {
        if (!this.initialized) {
            console.warn('Config not initialized, using default');
            this.useDefaultConfig();
        }

        // Eliminar slash inicial si existe
        endpoint = endpoint.replace(/^\//, '');

        return endpoint ? `${this.API_BASE}/${endpoint}` : this.API_BASE;
    }

    getFrontendUrl(path = '') {
        if (!this.initialized) {
            console.warn('Config not initialized, using default');
            this.useDefaultConfig();
        }

        // Eliminar slash inicial si existe
        path = path.replace(/^\//, '');

        return path ? `${this.FRONTEND_BASE}/${path}` : this.FRONTEND_BASE;
    }

    // Método de conveniencia para hacer peticiones fetch con la URL correcta
    async apiRequest(endpoint, options = {}) {
        const url = this.getApiUrl(endpoint);

        // Configuración por defecto
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, finalOptions);
            return response;
        } catch (error) {
            console.error(`Error en petición a ${url}:`, error);
            throw error;
        }
    }
}

// Crear instancia global
window.appConfig = new AppConfig();

// Inicializar automáticamente cuando se carga el script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.appConfig.init();
    });
} else {
    window.appConfig.init();
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
}