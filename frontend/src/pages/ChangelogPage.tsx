import React from 'react';
import { VERSION, getVersionInfo } from '../config/version';

const ChangelogPage: React.FC = () => {
  const versionInfo = getVersionInfo();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                📋 Registro de Cambios
              </h1>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {versionInfo.fullVersion}
              </span>
            </div>
            <p className="mt-2 text-gray-600">
              Historial de cambios y mejoras del Sistema de Gestión de Actividades
            </p>
          </div>

          <div className="px-6 py-6">
            {/* Version 0.1.1 beta */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 mr-3">
                    v0.1.1 beta
                  </span>
                  <span className="text-sm text-gray-500">28 de Septiembre, 2025</span>
                </div>
                <div className="ml-auto">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-50 text-orange-700">
                    📈 Mejoras y nuevas funciones
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  🆕 Nuevas funcionalidades
                </h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">📊 Sistema de Logs y Monitoreo</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                      <li>Nueva página de logs y monitoreo de llamadas API</li>
                      <li>Visualización de estadísticas en tiempo real</li>
                      <li>Filtros avanzados por método HTTP, estado, endpoint y tiempo</li>
                      <li>Auto-actualización opcional cada 5 segundos</li>
                      <li>Exportación de logs en formato JSON</li>
                      <li>Interfaz moderna y responsive</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">📱 Campo Teléfono Móvil en Recursos</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                      <li>Nuevo campo telefono_movil en la tabla de recursos</li>
                      <li>Migración automática de base de datos</li>
                      <li>Actualización de interfaces TypeScript</li>
                      <li>Nueva columna en la lista de recursos</li>
                      <li>Soporte completo en backend y frontend</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">⚙️ Mejoras en Configuración</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                      <li>Nueva sección "Logs y Monitoreo" en configuración</li>
                      <li>Acceso directo desde el menú de configuración</li>
                      <li>Función de exportación integrada</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2">🔧 Mejoras técnicas</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                    <li>Optimización de la página de logs para uso pasivo</li>
                    <li>Eliminación de llamadas automáticas innecesarias</li>
                    <li>Mejora en el manejo de request body en backend</li>
                    <li>Actualización de consultas SQL para incluir nuevos campos</li>
                    <li>Interfaces TypeScript actualizadas</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Version 0.1.0 beta */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mr-3">
                    v0.1.0 beta
                  </span>
                  <span className="text-sm text-gray-500">28 de Septiembre, 2025</span>
                </div>
                <div className="ml-auto">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    🎉 Lanzamiento inicial
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  ✨ Funcionalidades iniciales
                </h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">🔐 Sistema de Autenticación</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                      <li>Login seguro con JWT</li>
                      <li>Registro de nuevos usuarios</li>
                      <li>Gestión de sesiones</li>
                      <li>Protección de rutas privadas</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">🏗️ Gestión de Obras</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                      <li>Visualización de obras activas</li>
                      <li>Detalles completos de cada obra</li>
                      <li>Estados y seguimiento</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">🚛 Gestión de Recursos</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                      <li>Listado de recursos disponibles</li>
                      <li>Información de vehículos y equipos</li>
                      <li>Estados de disponibilidad</li>
                      <li>Creación y edición de recursos</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">👥 Gestión de Equipos</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                      <li>Creación y gestión de equipos</li>
                      <li>Asignación de recursos a equipos</li>
                      <li>Visualización de equipos activos</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">📊 Gestión de Actividades</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                      <li>Creación de nuevas actividades</li>
                      <li>Seguimiento de actividades en curso</li>
                      <li>Tipos de actividad predefinidos</li>
                      <li>Asignación de recursos y equipos</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">🔧 Infraestructura Técnica</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                      <li>Conexión a base de datos SQL Server</li>
                      <li>API REST completa</li>
                      <li>Frontend React con TypeScript</li>
                      <li>Sistema de rutas y navegación</li>
                      <li>Interfaz responsive con Tailwind CSS</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-blue-400">ℹ️</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        <strong>Nota:</strong> Esta es la primera versión beta del sistema.
                        Algunas funcionalidades pueden estar en desarrollo o requerir mejoras adicionales.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Próximas versiones placeholder */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🚀 Próximas actualizaciones
              </h3>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Las próximas versiones incluirán nuevas funcionalidades,
                      mejoras de rendimiento y correcciones de errores.
                      Este registro se actualizará con cada nueva versión.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangelogPage;