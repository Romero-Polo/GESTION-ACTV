import React, { useState, useEffect } from 'react';
import { useRecursos, type Recurso, type RecursoFilters, TipoRecurso } from '../../hooks/useRecursos';
import { useAuth } from '../../hooks/useAuth';

interface RecursosListProps {
  onSelectRecurso?: (recurso: Recurso) => void;
  onEditRecurso?: (recurso: Recurso) => void;
  onDeleteRecurso?: (recurso: Recurso) => void;
  showActions?: boolean;
  tipoFilter?: TipoRecurso;
}

export const RecursosList: React.FC<RecursosListProps> = ({
  onSelectRecurso,
  onEditRecurso,
  onDeleteRecurso,
  showActions = true,
  tipoFilter
}) => {
  const { user, hasRole } = useAuth();
  const { getRecursos, loading, error } = useRecursos();

  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<RecursoFilters>({ tipo: tipoFilter });
  const [searchTerm, setSearchTerm] = useState('');

  const canEdit = hasRole(['tecnico_transporte', 'administrador']);
  const canDelete = hasRole(['administrador']);

  const loadRecursos = async (page = 1, currentFilters = filters) => {
    const response = await getRecursos(currentFilters, page, 10);
    if (response) {
      setRecursos(response.recursos);
      setTotalPages(response.totalPages);
      setTotal(response.total);
      setCurrentPage(response.page);
    }
  };

  useEffect(() => {
    loadRecursos();
  }, [tipoFilter]);

  useEffect(() => {
    if (tipoFilter) {
      setFilters(prev => ({ ...prev, tipo: tipoFilter }));
    }
  }, [tipoFilter]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const newFilters = { ...filters, search: term || undefined };
    setFilters(newFilters);
    setCurrentPage(1);
    loadRecursos(1, newFilters);
  };

  const handleFilterChange = (key: keyof RecursoFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    loadRecursos(1, newFilters);
  };

  const handlePageChange = (page: number) => {
    loadRecursos(page);
  };

  const getTipoLabel = (tipo: TipoRecurso) => {
    return tipo === TipoRecurso.OPERARIO ? 'Operario' : 'Máquina';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Por favor, inicia sesión para ver los recursos</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Código o nombre..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={filters.activo === undefined ? '' : filters.activo.toString()}
              onChange={(e) => {
                const value = e.target.value;
                handleFilterChange(
                  'activo',
                  value === '' ? undefined : value === 'true'
                );
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>

          {!tipoFilter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={filters.tipo || ''}
                onChange={(e) => handleFilterChange('tipo', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value={TipoRecurso.OPERARIO}>Operarios</option>
                <option value={TipoRecurso.MAQUINA}>Máquinas</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código
            </label>
            <input
              type="text"
              value={filters.codigo || ''}
              onChange={(e) => handleFilterChange('codigo', e.target.value || undefined)}
              placeholder="Filtrar por código..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                const newFilters = tipoFilter ? { tipo: tipoFilter } : {};
                setFilters(newFilters);
                setSearchTerm('');
                loadRecursos(1, newFilters);
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Limpiar filtros
            </button>
          </div>
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
          Mostrando {recursos.length} de {total} recursos
          {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
        </div>
      )}

      {/* Recursos Table */}
      {!loading && recursos.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agr. Coste
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono Móvil
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Creación
                </th>
                {showActions && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recursos.map((recurso) => (
                <tr
                  key={recurso.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelectRecurso?.(recurso)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {recurso.codigo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {recurso.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        recurso.tipo === TipoRecurso.OPERARIO
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {getTipoLabel(recurso.tipo)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {recurso.agrCoste}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {recurso.telefono_movil || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        recurso.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {recurso.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(recurso.fechaCreacion).toLocaleDateString()}
                  </td>
                  {showActions && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                        {canEdit && (
                          <button
                            onClick={() => onEditRecurso?.(recurso)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Editar
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => onDeleteRecurso?.(recurso)}
                            className="text-red-600 hover:text-red-900"
                          >
                            {recurso.activo ? 'Desactivar' : 'Activar'}
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && recursos.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500">
            {Object.keys(filters).length > 0 || searchTerm
              ? 'No se encontraron recursos con los filtros aplicados'
              : 'No hay recursos disponibles'
            }
          </div>
        </div>
      )}
    </div>
  );
};