import { N8nClient, createN8nClient, N8nConfig } from '../../services/N8nClient';

// Mock axios
jest.mock('axios');

describe('N8nClient', () => {
  let mockConfig: N8nConfig;

  beforeEach(() => {
    mockConfig = {
      apiUrl: 'http://localhost:5678',
      apiKey: 'test-api-key',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    };

    // Reset environment variables
    delete process.env.N8N_API_URL;
    delete process.env.N8N_API_KEY;
    delete process.env.N8N_TIMEOUT;
    delete process.env.N8N_RETRY_ATTEMPTS;
    delete process.env.N8N_RETRY_DELAY;
  });

  describe('createN8nClient', () => {
    it('should create client with default config when env vars not set', () => {
      const client = createN8nClient();
      expect(client).toBeDefined();
    });

    it('should create client with env config when set', () => {
      process.env.N8N_API_URL = 'http://test.com';
      process.env.N8N_API_KEY = 'test-key';
      process.env.N8N_TIMEOUT = '60000';

      const client = createN8nClient();
      expect(client).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it('should return success response for valid connection', async () => {
      const axios = require('axios');
      const mockResponse = { data: { status: 'healthy' }, status: 200 };
      axios.create.mockReturnValue({
        request: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          response: { use: jest.fn() }
        }
      });

      const client = new (require('../../services/N8nClient').N8nClient)(mockConfig);
      const result = await client.testConnection();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ status: 'healthy' });
    });

    it('should return error response for failed connection', async () => {
      const axios = require('axios');
      const mockError = new Error('Connection failed');
      axios.create.mockReturnValue({
        request: jest.fn().mockRejectedValue(mockError),
        interceptors: {
          response: { use: jest.fn() }
        }
      });

      const client = new (require('../../services/N8nClient').N8nClient)(mockConfig);
      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
    });
  });

  describe('getObras', () => {
    it('should fetch obras successfully', async () => {
      const axios = require('axios');
      const mockObras = [
        {
          codigo: 'OB001',
          descripcion: 'Test Obra',
          fechaInicio: '2023-01-01',
          activa: true,
          lastModified: '2023-01-01T10:00:00Z'
        }
      ];
      const mockResponse = { data: mockObras, status: 200 };

      axios.create.mockReturnValue({
        request: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          response: { use: jest.fn() }
        }
      });

      const client = new (require('../../services/N8nClient').N8nClient)(mockConfig);
      const result = await client.getObras();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockObras);
    });

    it('should include since parameter when lastSyncDate provided', async () => {
      const axios = require('axios');
      const mockRequest = jest.fn().mockResolvedValue({ data: [], status: 200 });
      axios.create.mockReturnValue({
        request: mockRequest,
        interceptors: {
          response: { use: jest.fn() }
        }
      });

      const client = new (require('../../services/N8nClient').N8nClient)(mockConfig);
      const lastSyncDate = new Date('2023-01-01');
      await client.getObras(lastSyncDate);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { since: lastSyncDate.toISOString() }
        })
      );
    });
  });

  describe('getRecursos', () => {
    it('should fetch recursos successfully', async () => {
      const axios = require('axios');
      const mockRecursos = [
        {
          codigo: 'OP001',
          nombre: 'Test Operario',
          tipo: 'operario',
          activo: true,
          lastModified: '2023-01-01T10:00:00Z'
        }
      ];
      const mockResponse = { data: mockRecursos, status: 200 };

      axios.create.mockReturnValue({
        request: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          response: { use: jest.fn() }
        }
      });

      const client = new (require('../../services/N8nClient').N8nClient)(mockConfig);
      const result = await client.getRecursos();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecursos);
    });
  });

  describe('retry logic', () => {
    it('should retry on network errors', async () => {
      const axios = require('axios');
      const mockRequest = jest.fn()
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ data: { status: 'ok' }, status: 200 });

      axios.create.mockReturnValue({
        request: mockRequest,
        interceptors: {
          response: { use: jest.fn() }
        }
      });

      const client = new (require('../../services/N8nClient').N8nClient)(mockConfig);
      const result = await client.testConnection();

      expect(mockRequest).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });

    it('should fail after max retries', async () => {
      const axios = require('axios');
      const mockRequest = jest.fn().mockRejectedValue(new Error('Persistent Error'));

      axios.create.mockReturnValue({
        request: mockRequest,
        interceptors: {
          response: { use: jest.fn() }
        }
      });

      const client = new (require('../../services/N8nClient').N8nClient)(mockConfig);
      const result = await client.testConnection();

      expect(mockRequest).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Persistent Error');
    });

    it('should not retry on 4xx errors', async () => {
      const axios = require('axios');
      const error = new Error('Bad Request');
      (error as any).response = { status: 400 };
      const mockRequest = jest.fn().mockRejectedValue(error);

      axios.create.mockReturnValue({
        request: mockRequest,
        interceptors: {
          response: { use: jest.fn() }
        }
      });

      const client = new (require('../../services/N8nClient').N8nClient)(mockConfig);
      const result = await client.testConnection();

      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
    });
  });
});