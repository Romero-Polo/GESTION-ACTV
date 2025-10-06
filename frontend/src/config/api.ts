/**
 * API Configuration
 * En producción Docker, el nginx hace proxy de /api al backend
 * En desarrollo, se conecta directamente al backend
 */

// Determinar la URL base de la API según el entorno
const getApiBaseUrl = (): string => {
  // Si hay una variable de entorno de Vite, usarla
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // En producción (detectar si estamos en build), usar ruta relativa
  if (import.meta.env.PROD) {
    return '/api';
  }

  // En desarrollo, usar localhost
  return 'http://localhost:3002';
};

export const API_BASE_URL = getApiBaseUrl();

console.log('🔧 API Configuration:', {
  mode: import.meta.env.MODE,
  prod: import.meta.env.PROD,
  apiUrl: API_BASE_URL,
  viteApiUrl: import.meta.env.VITE_API_URL
});
