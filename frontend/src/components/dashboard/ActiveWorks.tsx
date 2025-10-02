import React from 'react';
import { useTranslation } from 'react-i18next';

interface Work {
  id: number;
  codigo: string;
  descripcion: string;
  totalActividades: number;
  totalHoras: number;
  actividadesAbiertas: number;
  ultimaActividad: string;
}

interface ActiveWorksProps {
  statistics: any;
  loading?: boolean;
  onWorkClick?: (workId: number) => void;
}

export const ActiveWorks: React.FC<ActiveWorksProps> = ({
  statistics,
  loading = false,
  onWorkClick
}) => {
  const { t, i18n } = useTranslation();

  // Extract works data from statistics
  const works: Work[] = statistics?.workStats || [];

  const getWorkStatusColor = (work: Work) => {
    if (work.actividadesAbiertas > 0) {
      return 'bg-yellow-100 text-yellow-800';
    }
    if (work.totalActividades > 0) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getWorkStatusText = (work: Work) => {
    if (work.actividadesAbiertas > 0) {
      return `${work.actividadesAbiertas} abiertas`;
    }
    if (work.totalActividades > 0) {
      return 'Activa';
    }
    return 'Inactiva';
  };

  const formatLastActivity = (dateString: string) => {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;

    return new Intl.DateTimeFormat(i18n.language).format(date);
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {t('dashboard.activeWorks')}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Obras con mayor actividad este mes
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {works.length} obras activas
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-gray-500">
              {t('common.loading')}
            </div>
          </div>
        ) : works.length > 0 ? (
          <div className="overflow-hidden">
            {/* Desktop view */}
            <div className="hidden sm:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Obra
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actividades
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Horas Totales
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Última Actividad
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {works.slice(0, 10).map((work) => (
                    <tr
                      key={work.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                      onClick={() => onWorkClick && onWorkClick(work.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {work.codigo}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {work.descripcion}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getWorkStatusColor(work)}`}>
                          {getWorkStatusText(work)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {work.totalActividades}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {work.totalHoras.toFixed(1)}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatLastActivity(work.ultimaActividad)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile view */}
            <div className="sm:hidden">
              <ul className="divide-y divide-gray-200">
                {works.slice(0, 10).map((work) => (
                  <li
                    key={work.id}
                    className="py-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                    onClick={() => onWorkClick && onWorkClick(work.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {work.codigo}
                          </p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getWorkStatusColor(work)}`}>
                            {getWorkStatusText(work)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {work.descripcion}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                          <span>{work.totalActividades} actividades</span>
                          <span>•</span>
                          <span>{work.totalHoras.toFixed(1)}h</span>
                          <span>•</span>
                          <span>{formatLastActivity(work.ultimaActividad)}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {works.length > 10 && (
              <div className="mt-6 text-center">
                <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                  Ver todas las obras ({works.length})
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No hay obras activas
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No se encontraron obras con actividades este mes
            </p>
          </div>
        )}
      </div>
    </div>
  );
};