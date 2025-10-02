import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export interface Obra {
  id: number;
  codigo: string;
  descripcion: string;
  observaciones?: string;
  activo: boolean;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export interface ObraFilters {
  activo?: boolean;
  search?: string;
  codigo?: string;
  descripcion?: string;
}

export interface ObraResponse {
  obras: Obra[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateObraData {
  codigo: string;
  descripcion: string;
  observaciones?: string;
  activo?: boolean;
}

export interface UpdateObraData extends Partial<CreateObraData> {}

export const useObras = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };

  const getObras = useCallback(async (
    filters: ObraFilters = {},
    page = 1,
    limit = 10
  ): Promise<ObraResponse | null> => {
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
        ...(filters.search && { search: filters.search }),
        ...(filters.codigo && { codigo: filters.codigo }),
        ...(filters.descripcion && { descripcion: filters.descripcion })
      });

      const response = await fetch(`${API_BASE_URL}/api/obras?${queryParams}`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching obras';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getObraById = useCallback(async (id: number): Promise<Obra | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/obras/${id}`, {
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Obra no encontrada');
        } else {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return null;
      }

      const data = await response.json();
      return data.obra;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching obra';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getActiveObras = useCallback(async (): Promise<Obra[]> => {
    if (!token) return [];

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/obras/active`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.obras;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching active obras';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createObra = useCallback(async (obraData: CreateObraData): Promise<Obra | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/obras`, {
        method: 'POST',
        headers,
        body: JSON.stringify(obraData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.obra;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creating obra';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const updateObra = useCallback(async (id: number, updateData: UpdateObraData): Promise<Obra | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/obras/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.obra;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating obra';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const deleteObra = useCallback(async (id: number): Promise<boolean> => {
    if (!token) {
      setError('No authentication token');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/obras/${id}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting obra';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const restoreObra = useCallback(async (id: number): Promise<Obra | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/obras/${id}/restore`, {
        method: 'PUT',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.obra;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error restoring obra';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getObraStatistics = useCallback(async (id: number) => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/obras/${id}/statistics`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching obra statistics';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    getObras,
    getObraById,
    getActiveObras,
    createObra,
    updateObra,
    deleteObra,
    restoreObra,
    getObraStatistics,
    loading,
    error,
    clearError: () => setError(null)
  };
};
