import React from 'react';
import { useAuthContext } from '../contexts/AuthContext';

export const AuthButton: React.FC = () => {
  const { isAuthenticated, user, login, logout, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-light rounded-button h-10 w-32"></div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-4">
        <UserInfo user={user} />
        <button
          onClick={logout}
          className="btn btn-secondary"
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="btn btn-primary"
      disabled={isLoading}
    >
      {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
    </button>
  );
};

interface UserInfoProps {
  user: {
    nombre: string;
    rol: string;
    email: string;
  };
}

const UserInfo: React.FC<UserInfoProps> = ({ user }) => {
  const getRoleDisplayName = (rol: string): string => {
    const roleNames: Record<string, string> = {
      'operario': 'Operario',
      'jefe_equipo': 'Jefe de Equipo',
      'tecnico_transporte': 'Técnico de Transporte',
      'administrador': 'Administrador'
    };
    return roleNames[rol] || rol;
  };

  const getRoleColor = (rol: string): string => {
    const roleColors: Record<string, string> = {
      'operario': 'bg-blue-100 text-blue-800',
      'jefe_equipo': 'bg-green-100 text-green-800',
      'tecnico_transporte': 'bg-yellow-100 text-yellow-800',
      'administrador': 'bg-red-100 text-red-800'
    };
    return roleColors[rol] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex items-center space-x-3">
      <div className="flex flex-col text-right">
        <span className="text-sm font-medium text-gray-dark">
          {user.nombre}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full ${getRoleColor(user.rol)}`}>
          {getRoleDisplayName(user.rol)}
        </span>
      </div>
      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
        {user.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
      </div>
    </div>
  );
};