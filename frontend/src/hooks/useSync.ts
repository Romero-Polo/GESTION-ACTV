import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

import { API_BASE_URL } from '../config/api';

export interface SyncStats {
  obras: {
    lastSync: string | null;
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
  };
  recursos: {
    lastSync: string | null;
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
  };
  webhooks: {
    totalWebhooks: number;
    successfulWebhooks: number;
    failedWebhooks: number;
    recentWebhooks: SyncLog[];
  };
  scheduledTasks: {
    [key: string]: {
      running: boolean;
      nextRun?: string;
    };
  };
  enabled: {
    sync: boolean;
    obras: boolean;
    recursos: boolean;
  };
  schedules: {
    obras: string;
    recursos: string;
  };
}

export interface SyncLog {
  id: number;
  syncType: 'obras' | 'recursos' | 'webhook';
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  message: string;
  details: any;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsErrored: number;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  triggeredBy: string;
  userId: number | null;
  createdAt: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  syncLogId: number;
  stats: {
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsSkipped: number;
    recordsErrored: number;
  };
  errors: string[];
}

export const useSync = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };

  const testConnection = useCallback(async (): Promise<any> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/sync/test-connection`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error testing connection';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const syncObras = useCallback(async (): Promise<SyncResult | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/sync/obras`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error syncing obras';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const syncRecursos = useCallback(async (): Promise<SyncResult | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/sync/recursos`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error syncing recursos';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getSyncStats = useCallback(async (): Promise<SyncStats | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/sync/stats`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching sync stats';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getSyncLogs = useCallback(async (
    page = 1,
    limit = 10,
    syncType?: 'obras' | 'recursos' | 'webhook'
  ): Promise<{
    logs: SyncLog[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  } | null> => {
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
        ...(syncType && { syncType })
      });

      const response = await fetch(`${API_BASE_URL}/api/sync/logs?${queryParams}`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching sync logs';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const updateSchedule = useCallback(async (
    taskName: 'obras-sync' | 'recursos-sync',
    cronExpression: string
  ): Promise<boolean> => {
    if (!token) {
      setError('No authentication token');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/sync/schedule`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ taskName, cronExpression })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating schedule';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const controlTask = useCallback(async (
    taskName: 'obras-sync' | 'recursos-sync',
    action: 'start' | 'stop'
  ): Promise<boolean> => {
    if (!token) {
      setError('No authentication token');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/sync/task-control`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ taskName, action })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error controlling task';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    testConnection,
    syncObras,
    syncRecursos,
    getSyncStats,
    getSyncLogs,
    updateSchedule,
    controlTask,
    loading,
    error,
    clearError: () => setError(null)
  };
};
