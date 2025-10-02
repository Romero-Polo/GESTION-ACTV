import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export interface TipoActividad {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export const useTiposActividad = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };

  const getTiposActividad = useCallback(async (activeOnly = true): Promise<TipoActividad[]> => {
    if (!token) return [];

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (activeOnly !== undefined) {
        queryParams.set('activo', activeOnly.toString());
      }

      const response = await fetch(`${API_BASE_URL}/api/tipos-actividad?${queryParams}`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.tiposActividad || data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching tipos actividad';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getTipoActividadById = useCallback(async (id: number): Promise<TipoActividad | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/tipos-actividad/${id}`, {
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Tipo de actividad no encontrado');
        } else {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return null;
      }

      const data = await response.json();
      return data.tipoActividad || data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching tipo actividad';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    getTiposActividad,
    getTipoActividadById,
    loading,
    error,
    clearError: () => setError(null)
  };
};
