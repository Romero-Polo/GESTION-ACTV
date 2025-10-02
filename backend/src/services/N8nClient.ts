import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface N8nConfig {
  apiUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface N8nResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ExternalObra {
  codigo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin?: string;
  activa: boolean;
  cliente?: string;
  ubicacion?: string;
  presupuesto?: number;
  lastModified: string;
}

export interface ExternalRecurso {
  codigo: string;
  nombre: string;
  tipo: 'operario' | 'maquina';
  activo: boolean;
  empresa?: string;
  categoria?: string;
  costeHora?: number;
  lastModified: string;
}

class N8nClient {
  private client: AxiosInstance;
  private config: N8nConfig;

  constructor(config: N8nConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'GestionActividad/1.0'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('N8n API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generic method to make requests with retry logic
   */
  private async makeRequest<T>(
    requestConfig: AxiosRequestConfig,
    attempt: number = 1
  ): Promise<N8nResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.client.request(requestConfig);

      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      const isLastAttempt = attempt >= this.config.retryAttempts;

      if (!isLastAttempt && this.shouldRetry(error)) {
        console.warn(`N8n request failed (attempt ${attempt}/${this.config.retryAttempts}), retrying...`);
        await this.delay(this.config.retryDelay * attempt);
        return this.makeRequest<T>(requestConfig, attempt + 1);
      }

      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      console.error(`N8n request failed after ${attempt} attempts:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if error is retryable
   */
  private shouldRetry(error: any): boolean {
    if (!error.response) {
      return true; // Network errors are retryable
    }

    const status = error.response.status;
    return status >= 500 || status === 429; // Server errors and rate limits
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test connection to n8n
   */
  async testConnection(): Promise<N8nResponse<{ status: string }>> {
    return this.makeRequest({
      method: 'GET',
      url: '/health'
    });
  }

  /**
   * Get obras from n8n
   */
  async getObras(lastSyncDate?: Date): Promise<N8nResponse<ExternalObra[]>> {
    const params: any = {};
    if (lastSyncDate) {
      params.since = lastSyncDate.toISOString();
    }

    return this.makeRequest({
      method: 'GET',
      url: process.env.N8N_OBRAS_ENDPOINT || '/api/obras',
      params
    });
  }

  /**
   * Get recursos from n8n
   */
  async getRecursos(lastSyncDate?: Date): Promise<N8nResponse<ExternalRecurso[]>> {
    const params: any = {};
    if (lastSyncDate) {
      params.since = lastSyncDate.toISOString();
    }

    return this.makeRequest({
      method: 'GET',
      url: process.env.N8N_RECURSOS_ENDPOINT || '/api/recursos',
      params
    });
  }

  /**
   * Send notification to n8n about local changes
   */
  async notifyChange(entityType: 'obra' | 'recurso', entityId: number, action: 'created' | 'updated' | 'deleted'): Promise<N8nResponse<any>> {
    return this.makeRequest({
      method: 'POST',
      url: '/api/notifications',
      data: {
        entityType,
        entityId,
        action,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Create singleton instance
let n8nClientInstance: N8nClient | null = null;

export const createN8nClient = (): N8nClient => {
  if (!n8nClientInstance) {
    const config: N8nConfig = {
      apiUrl: process.env.N8N_API_URL || 'http://localhost:5678',
      apiKey: process.env.N8N_API_KEY || '',
      timeout: parseInt(process.env.N8N_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.N8N_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.N8N_RETRY_DELAY || '1000')
    };

    n8nClientInstance = new N8nClient(config);
  }

  return n8nClientInstance;
};

export const getN8nClient = (): N8nClient => {
  if (!n8nClientInstance) {
    throw new Error('N8n client not initialized. Call createN8nClient() first.');
  }
  return n8nClientInstance;
};