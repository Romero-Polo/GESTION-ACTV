import React from 'react';
import { useTranslation } from 'react-i18next';

interface QuickStatsProps {
  statistics: any;
  openShiftsCount: number;
  todaysActivitiesCount: number;
  loading?: boolean;
}

export const QuickStats: React.FC<QuickStatsProps> = ({
  statistics,
  openShiftsCount,
  todaysActivitiesCount,
  loading = false
}) => {
  const { t } = useTranslation();

  const stats = [
    {
      name: t('dashboard.todaysActivities'),
      value: loading ? '...' : todaysActivitiesCount,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      name: t('dashboard.openShifts'),
      value: loading ? '...' : openShiftsCount,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      name: t('dashboard.monthlyHours'),
      value: loading ? '...' : `${(statistics?.totalHours || 0).toFixed(1)}h`,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: t('dashboard.activeWorks'),
      value: loading ? '...' : statistics?.activeWorks || 0,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-md ${stat.bgColor}`}>
                <div className={stat.color}>
                  {stat.icon}
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {stat.name}
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};