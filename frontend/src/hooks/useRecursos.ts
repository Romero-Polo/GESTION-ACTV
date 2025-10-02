import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export enum TipoRecurso {
  OPERARIO = 'operario',
  MAQUINA = 'maquina'
}

export interface Recurso {
  id: number;
  codigo: string;
  nombre: string;
  tipo: TipoRecurso;
  agrCoste: string;
  telefono_movil?: string;
  activo: boolean;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export interface RecursoFilters {
  activo?: boolean;
  tipo?: TipoRecurso;
  search?: string;
  codigo?: string;
  nombre?: string;
}

export interface RecursoResponse {
  recursos: Recurso[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateRecursoData {
  codigo: string;
  nombre: string;
  tipo: TipoRecurso;
  agrCoste: string;
  telefono_movil?: string;
  activo?: boolean;
}

export interface UpdateRecursoData extends Partial<CreateRecursoData> {}

export const useRecursos = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };

  const getRecursos = useCallback(async (
    filters: RecursoFilters = {},
    page = 1,
    limit = 10
  ): Promise<RecursoResponse | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.activo !== undefined && { activo: filters.activo.toString() }),
        ...(filters.tipo && { tipo: filters.tipo }),
        ...(filters.search && { search: filters.search }),
        ...(filters.codigo && { codigo: filters.codigo }),
        ...(filters.nombre && { nombre: filters.nombre })
      });

      const response = await fetch(`${API_BASE_URL}/api/recursos?${queryParams}`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching recursos';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getRecursoById = useCallback(async (id: number): Promise<Recurso | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/recursos/${id}`, {
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Recurso no encontrado');
        } else {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return null;
      }

      const data = await response.json();
      return data.recurso;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching recurso';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getActiveRecursos = useCallback(async (): Promise<Recurso[]> => {
    if (!token) return [];

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/recursos/active`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.recursos;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching active recursos';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getOperarios = useCallback(async (activeOnly = true): Promise<Recurso[]> => {
    if (!token) return [];

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/recursos/operarios${!activeOnly ? '?activo=false' : ''}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.operarios;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching operarios';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getMaquinas = useCallback(async (activeOnly = true): Promise<Recurso[]> => {
    if (!token) return [];

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/recursos/maquinas${!activeOnly ? '?activo=false' : ''}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.maquinas;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching maquinas';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  const searchRecursos = useCallback(async (
    query: string,
    tipo?: TipoRecurso,
    limit = 10
  ): Promise<Recurso[]> => {
    if (!token || query.length < 2) return [];

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        ...(tipo && { tipo })
      });

      const response = await fetch(`${API_BASE_URL}/api/recursos/search?${queryParams}`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.recursos;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error searching recursos';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createRecurso = useCallback(async (recursoData: CreateRecursoData): Promise<Recurso | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/recursos`, {
        method: 'POST',
        headers,
        body: JSON.stringify(recursoData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.recurso;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creating recurso';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const updateRecurso = useCallback(async (id: number, updateData: UpdateRecursoData): Promise<Recurso | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/recursos/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.recurso;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating recurso';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const deleteRecurso = useCallback(async (id: number): Promise<boolean> => {
    if (!token) {
      setError('No authentication token');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/recursos/${id}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting recurso';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const restoreRecurso = useCallback(async (id: number): Promise<Recurso | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/recursos/${id}/restore`, {
        method: 'PUT',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.recurso;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error restoring recurso';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getRecursoStatistics = useCallback(async (id: number) => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/recursos/${id}/statistics`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching recurso statistics';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getAgrCosteTypes = useCallback(async (): Promise<string[]> => {
    if (!token) return [];

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/recursos/agr-coste-types`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.types;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching agr coste types';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    getRecursos,
    getRecursoById,
    getActiveRecursos,
    getOperarios,
    getMaquinas,
    searchRecursos,
    createRecurso,
    updateRecurso,
    deleteRecurso,
    restoreRecurso,
    getRecursoStatistics,
    getAgrCosteTypes,
    loading,
    error,
    clearError: () => setError(null)
  };
};
