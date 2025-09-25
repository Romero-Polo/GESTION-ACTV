import React, { ReactNode } from 'react';
import { useAuthContext } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[];
  permissions?: string[];
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  roles = [],
  permissions = [],
  fallback = <UnauthorizedFallback />
}) => {
  const { isAuthenticated, isLoading, user, hasRole, hasPermission } = useAuthContext();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  // Check role requirements
  if (roles.length > 0 && !hasRole(roles)) {
    return fallback;
  }

  // Check permission requirements
  if (permissions.length > 0) {
    const hasRequiredPermission = permissions.some(permission => hasPermission(permission));
    if (!hasRequiredPermission) {
      return fallback;
    }
  }

  return <>{children}</>;
};

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    <span className="ml-3 text-gray-medium">Verificando autenticación...</span>
  </div>
);

const LoginPrompt: React.FC = () => {
  const { login, error } = useAuthContext();

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
      <div className="card max-w-md w-full mx-4">
        <div className="card-header">
          <h1 className="text-2xl font-bold text-gray-dark text-center">
            Iniciar Sesión
          </h1>
        </div>
        <div className="card-body text-center">
          <p className="text-gray-medium mb-6">
            Debes iniciar sesión con tu cuenta de Office365 para acceder al sistema.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-button text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={login}
            className="btn btn-primary w-full"
          >
            Iniciar Sesión con Office365
          </button>
        </div>
      </div>
    </div>
  );
};

const UnauthorizedFallback: React.FC = () => {
  const { user } = useAuthContext();

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
      <div className="card max-w-md w-full mx-4">
        <div className="card-header">
          <h1 className="text-2xl font-bold text-red-600 text-center">
            Acceso Denegado
          </h1>
        </div>
        <div className="card-body text-center">
          <p className="text-gray-medium mb-4">
            No tienes permisos suficientes para acceder a esta sección.
          </p>
          <p className="text-sm text-gray-medium">
            Usuario: <strong>{user?.nombre}</strong><br />
            Rol actual: <strong className="capitalize">{user?.rol.replace('_', ' ')}</strong>
          </p>

          <button
            onClick={() => window.history.back()}
            className="btn btn-secondary mt-6"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
};