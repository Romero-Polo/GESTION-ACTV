import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

import { API_BASE_URL } from '../config/api';

export interface Actividad {
  id: number;
  obra: {
    id: number;
    codigo: string;
    descripcion: string;
  };
  recurso: {
    id: number;
    codigo: string;
    nombre: string;
    tipo: 'operario' | 'maquina';
  };
  tipoActividad: {
    id: number;
    codigo: string;
    nombre: string;
  };
  fechaInicio: string;
  horaInicio: string;
  fechaFin?: string;
  horaFin?: string;
  observaciones?: string;
  usuarioCreacion: {
    id: number;
    name: string;
    email: string;
  };
  usuarioModificacion?: {
    id: number;
    name: string;
    email: string;
  };
  fechaCreacion: Date;
  fechaModificacion: Date;
}

export interface ActividadFilters {
  obraId?: number;
  recursoId?: number;
  tipoActividadId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  jornada?: 'abierta' | 'cerrada';
  usuarioId?: number;
}

export interface ActividadResponse {
  actividades: Actividad[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateActividadData {
  obraId: number;
  recursoId: number;
  tipoActividadId: number;
  fechaInicio: string;
  horaInicio: string;
  fechaFin?: string;
  horaFin?: string;
  observaciones?: string;
}

export interface UpdateActividadData extends Partial<CreateActividadData> {}

export interface ValidationResult {
  valid: boolean;
  hasOverlap: boolean;
  conflictingActivities: Actividad[];
  message?: string;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface JornadaCalculation {
  calculatedEndTime?: {
    fecha: string;
    hora: string;
  };
  affectedActivities: Actividad[];
}

export const useActividades = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };

  const getActividades = useCallback(async (
    filters: ActividadFilters = {},
    page = 1,
    limit = 10
  ): Promise<ActividadResponse | null> => {
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
        ...(filters.obraId && { obraId: filters.obraId.toString() }),
        ...(filters.recursoId && { recursoId: filters.recursoId.toString() }),
        ...(filters.tipoActividadId && { tipoActividadId: filters.tipoActividadId.toString() }),
        ...(filters.fechaDesde && { fechaDesde: filters.fechaDesde }),
        ...(filters.fechaHasta && { fechaHasta: filters.fechaHasta }),
        ...(filters.jornada && { jornada: filters.jornada }),
        ...(filters.usuarioId && { usuarioId: filters.usuarioId.toString() })
      });

      const response = await fetch(`${API_BASE_URL}/api/actividades?${queryParams}`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching actividades';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getActividadById = useCallback(async (id: number): Promise<Actividad | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/actividades/${id}`, {
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Actividad no encontrada');
        } else {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return null;
      }

      const data = await response.json();
      return data.actividad;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching actividad';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createActividad = useCallback(async (actividadData: CreateActividadData): Promise<Actividad | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/actividades`, {
        method: 'POST',
        headers,
        body: JSON.stringify(actividadData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.actividad;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creating actividad';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const updateActividad = useCallback(async (id: number, updateData: UpdateActividadData): Promise<Actividad | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/actividades/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.actividad;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating actividad';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const deleteActividad = useCallback(async (id: number): Promise<boolean> => {
    if (!token) {
      setError('No authentication token');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/actividades/${id}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting actividad';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getAccessibleRecursos = useCallback(async () => {
    if (!token) return [];

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/actividades/recursos`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.recursos;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching accessible recursos';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getActividadesAbiertas = useCallback(async (recursoId?: number): Promise<Actividad[]> => {
    if (!token) return [];

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (recursoId) {
        queryParams.set('recursoId', recursoId.toString());
      }

      const response = await fetch(`${API_BASE_URL}/api/actividades/abiertas?${queryParams}`, {
        headers
      });

      if (!response.ok) {
        // Para errores 503, intentar obtener el mensaje del servidor
        if (response.status === 503) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`);
          } catch (parseError) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
          }
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.actividades;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching actividades abiertas';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  const cerrarJornada = useCallback(async (id: number, fechaFin: string, horaFin: string): Promise<Actividad | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/actividades/${id}/cerrar`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ fechaFin, horaFin })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.actividad;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cerrando jornada';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getActividadStatistics = useCallback(async (fechaDesde?: string, fechaHasta?: string) => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (fechaDesde) queryParams.set('fechaDesde', fechaDesde);
      if (fechaHasta) queryParams.set('fechaHasta', fechaHasta);

      const response = await fetch(`${API_BASE_URL}/api/actividades/statistics?${queryParams}`, {
        headers
      });

      if (!response.ok) {
        // Para errores 503, intentar obtener el mensaje del servidor
        if (response.status === 503) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`);
          } catch (parseError) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
          }
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching actividad statistics';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Utility functions
  const isJornadaAbierta = (actividad: Actividad): boolean => {
    return !actividad.fechaFin || !actividad.horaFin;
  };

  const getDurationInHours = (actividad: Actividad): number | null => {
    if (isJornadaAbierta(actividad)) {
      return null;
    }

    const start = new Date(`${actividad.fechaInicio}T${actividad.horaInicio}`);
    const end = new Date(`${actividad.fechaFin}T${actividad.horaFin}`);

    const diffMs = end.getTime() - start.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  };

  const formatDateTime = (fecha: string, hora: string): string => {
    return new Date(`${fecha}T${hora}`).toLocaleString();
  };

  const validateActividad = useCallback(async (
    actividadData: CreateActividadData | UpdateActividadData,
    excludeId?: number
  ): Promise<ValidationResult | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (excludeId) {
        queryParams.set('excludeId', excludeId.toString());
      }

      const response = await fetch(`${API_BASE_URL}/api/actividades/validate?${queryParams}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(actividadData)
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error validating actividad';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getSuggestedTimeSlots = useCallback(async (
    recursoId: number,
    fecha: string,
    duration = 60
  ): Promise<TimeSlot[]> => {
    if (!token) return [];

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        recursoId: recursoId.toString(),
        fecha,
        duration: duration.toString()
      });

      const response = await fetch(`${API_BASE_URL}/api/actividades/suggest-slots?${queryParams}`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error getting suggested slots';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getActividadesByResourceDate = useCallback(async (
    recursoId: number,
    fecha: string
  ): Promise<Actividad[]> => {
    if (!token) return [];

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        recursoId: recursoId.toString(),
        fecha
      });

      const response = await fetch(`${API_BASE_URL}/api/actividades/by-resource-date?${queryParams}`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.actividades;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error getting activities by resource date';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  const calculateEndTime = useCallback(async (id: number): Promise<JornadaCalculation | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/actividades/${id}/calculate-end`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error calculating end time';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    getActividades,
    getActividadById,
    createActividad,
    updateActividad,
    deleteActividad,
    getAccessibleRecursos,
    getActividadesAbiertas,
    cerrarJornada,
    getActividadStatistics,
    validateActividad,
    getSuggestedTimeSlots,
    getActividadesByResourceDate,
    calculateEndTime,
    isJornadaAbierta,
    getDurationInHours,
    formatDateTime,
    loading,
    error,
    clearError: () => setError(null)
  };
};