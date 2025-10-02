import React, { useState, useEffect } from 'react';
import { useActividades, type Actividad, type ActividadFilters } from '../../hooks/useActividades';
import { useObras } from '../../hooks/useObras';
import { useRecursos } from '../../hooks/useRecursos';
import { useAuth } from '../../hooks/useAuth';

interface ActividadesListProps {
  onSelectActividad?: (actividad: Actividad) => void;
  onEditActividad?: (actividad: Actividad) => void;
  onDeleteActividad?: (actividad: Actividad) => void;
  onCerrarJornada?: (actividad: Actividad) => void;
  showActions?: boolean;
}

export const ActividadesList: React.FC<ActividadesListProps> = ({
  onSelectActividad,
  onEditActividad,
  onDeleteActividad,
  onCerrarJornada,
  showActions = true
}) => {
  const { user, hasRole } = useAuth();
  const { getActividades, loading, error, isJornadaAbierta, getDurationInHours } = useActividades();
  const { getActiveObras } = useObras();
  const { getActiveRecursos } = useRecursos();

  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<ActividadFilters>({});

  const [obras, setObras] = useState<any[]>([]);
  const [recursos, setRecursos] = useState<any[]>([]);

  const canEdit = hasRole(['jefe_equipo', 'tecnico_transporte', 'administrador']);
  const canDelete = hasRole(['jefe_equipo', 'tecnico_transporte', 'administrador']);
  const canCreate = hasRole(['operario', 'jefe_equipo', 'tecnico_transporte', 'administrador']);

  const loadData = async () => {
    const [actividadesResult, obrasData, recursosData] = await Promise.all([
      getActividades(filters, currentPage, 10),
      getActiveObras(),
      getActiveRecursos()
    ]);

    if (actividadesResult) {
      setActividades(actividadesResult.actividades);
      setTotalPages(actividadesResult.totalPages);
      setTotal(actividadesResult.total);
    }

    setObras(obrasData);
    setRecursos(recursosData);
  };

  useEffect(() => {
    loadData();
  }, [filters, currentPage]);

  const handleFilterChange = (key: keyof ActividadFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusBadge = (actividad: Actividad) => {
    if (isJornadaAbierta(actividad)) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          Jornada Abierta
        </span>
      );
    }
    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        Completada
      </span>
    );
  };

  const formatDuration = (actividad: Actividad) => {
    const hours = getDurationInHours(actividad);
    if (hours === null) {
      return 'En progreso';
    }
    return `${hours}h`;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Por favor, inicia sesión para ver las actividades</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Obra
            </label>
            <select
              value={filters.obraId || ''}
              onChange={(e) => handleFilterChange('obraId', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las obras</option>
              {obras.map(obra => (
                <option key={obra.id} value={obra.id}>
                  {obra.codigo} - {obra.descripcion}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recurso
            </label>
            <select
              value={filters.recursoId || ''}
              onChange={(e) => handleFilterChange('recursoId', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los recursos</option>
              {recursos.map(recurso => (
                <option key={recurso.id} value={recurso.id}>
                  {recurso.codigo} - {recurso.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado Jornada
            </label>
            <select
              value={filters.jornada || ''}
              onChange={(e) => handleFilterChange('jornada', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              <option value="abierta">Jornadas Abiertas</option>
              <option value="cerrada">Jornadas Cerradas</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={filters.fechaDesde || ''}
              onChange={(e) => handleFilterChange('fechaDesde', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={filters.fechaHasta || ''}
              onChange={(e) => handleFilterChange('fechaHasta', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => {
              setFilters({});
              setCurrentPage(1);
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Results Info */}
      {!loading && (
        <div className="text-sm text-gray-600">
          Mostrando {actividades.length} de {total} actividades
          {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
        </div>
      )}

      {/* Actividades Table */}
      {!loading && actividades.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Obra
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recurso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo Actividad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha/Hora Inicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha/Hora Fin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duración
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                {showActions && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {actividades.map((actividad) => (
                <tr
                  key={actividad.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelectActividad?.(actividad)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{actividad.obra.codigo}</div>
                      <div className="text-gray-500 text-xs">{actividad.obra.descripcion}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{actividad.recurso.codigo}</div>
                      <div className="text-gray-500 text-xs">{actividad.recurso.nombre}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{actividad.tipoActividad.codigo}</div>
                      <div className="text-gray-500 text-xs">{actividad.tipoActividad.nombre}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{actividad.fechaInicio}</div>
                      <div className="text-gray-500">{actividad.horaInicio}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {actividad.fechaFin && actividad.horaFin ? (
                      <div>
                        <div>{actividad.fechaFin}</div>
                        <div className="text-gray-500">{actividad.horaFin}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDuration(actividad)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(actividad)}
                  </td>
                  {showActions && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                        {canEdit && (
                          <button
                            onClick={() => onEditActividad?.(actividad)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Editar
                          </button>
                        )}
                        {isJornadaAbierta(actividad) && (canEdit || user.id === actividad.usuarioCreacion.id) && (
                          <button
                            onClick={() => onCerrarJornada?.(actividad)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Cerrar
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => onDeleteActividad?.(actividad)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando página <span className="font-medium">{currentPage}</span> de{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                  let page;
                  if (totalPages <= 10) {
                    page = i + 1;
                  } else if (currentPage <= 5) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 4) {
                    page = totalPages - 9 + i;
                  } else {
                    page = currentPage - 5 + i;
                  }

                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        page === currentPage
                          ? 'z-10 bg-blue-600 text-white focus:z-20'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20'
                      } focus:outline-offset-0`}
                    >
                      {page}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && actividades.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500">
            {Object.keys(filters).length > 0
              ? 'No se encontraron actividades con los filtros aplicados'
              : 'No hay actividades disponibles'
            }
          </div>
        </div>
      )}
    </div>
  );
};