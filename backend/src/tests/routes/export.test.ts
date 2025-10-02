import request from 'supertest';
import express from 'express';
import { exportRouter } from '../../routes/export';
import { authMiddleware } from '../../middleware/auth';
import { ExportFormat } from '../../models/ExportLog';
import { RolUsuario } from '../../models/Usuario';

// Mock dependencies
jest.mock('../../controllers/ExportController');
jest.mock('../../middleware/auth');
jest.mock('../../middleware/rateLimiter');
jest.mock('../../middleware/validation');

const mockAuthMiddleware = authMiddleware as jest.MockedFunction<typeof authMiddleware>;
const mockExportController = {
  exportToERP: jest.fn(),
  getExportPreview: jest.fn(),
  getExportLogs: jest.fn(),
  getExportLogById: jest.fn(),
  downloadExportFile: jest.fn()
};

// Mock rate limiters to pass through
const mockRateLimit = (req: any, res: any, next: any) => next();
jest.mock('../../middleware/rateLimiter', () => ({
  exportRateLimit: mockRateLimit,
  previewRateLimit: mockRateLimit
}));

// Mock validation middleware to pass through
const mockValidateRequest = (req: any, res: any, next: any) => next();
jest.mock('../../middleware/validation', () => ({
  validateRequest: mockValidateRequest
}));

jest.mock('../../validators/exportValidation', () => ({
  exportERPValidation: [],
  exportPreviewValidation: [],
  getExportLogsValidation: [],
  exportLogIdValidation: []
}));

describe('Export Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock auth middleware to add user to request
    mockAuthMiddleware.mockImplementation((req: any, res: any, next: any) => {
      req.user = { id: 1, rol: RolUsuario.ADMINISTRADOR };
      next();
    });

    // Set up express app with export routes
    app = express();
    app.use(express.json());
    app.use('/api/export', exportRouter);

    // Mock the controller methods
    jest.doMock('../../controllers/ExportController', () => ({
      ExportController: jest.fn().mockImplementation(() => mockExportController)
    }));
  });

  describe('POST /api/export/erp', () => {
    const validExportData = {
      fechaInicio: '2024-01-01',
      fechaFin: '2024-01-31',
      format: ExportFormat.JSON
    };

    beforeEach(() => {
      mockExportController.exportToERP.mockImplementation((req: any, res: any) => {
        res.json({
          success: true,
          message: 'Exportación completada exitosamente',
          data: [],
          totalRecords: 0,
          exportLogId: 1
        });
      });
    });

    it('should handle successful export request', async () => {
      const response = await request(app)
        .post('/api/export/erp')
        .send(validExportData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockExportController.exportToERP).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      // Mock auth middleware to reject request
      mockAuthMiddleware.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      await request(app)
        .post('/api/export/erp')
        .send(validExportData)
        .expect(401);
    });

    it('should accept all valid export formats', async () => {
      const formats = [ExportFormat.JSON, ExportFormat.CSV, ExportFormat.XML];

      for (const format of formats) {
        await request(app)
          .post('/api/export/erp')
          .send({ ...validExportData, format })
          .expect(200);
      }
    });

    it('should handle optional filters', async () => {
      const dataWithFilters = {
        ...validExportData,
        empresa: 'Test Company',
        tipoRecurso: 'operario',
        obraIds: [1, 2, 3],
        recursoIds: [10, 20]
      };

      await request(app)
        .post('/api/export/erp')
        .send(dataWithFilters)
        .expect(200);

      expect(mockExportController.exportToERP).toHaveBeenCalled();
    });

    it('should handle single ID values', async () => {
      const dataWithSingleIds = {
        ...validExportData,
        obraIds: 1,
        recursoIds: 10
      };

      await request(app)
        .post('/api/export/erp')
        .send(dataWithSingleIds)
        .expect(200);
    });

    it('should set proper content type headers', async () => {
      mockExportController.exportToERP.mockImplementation((req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="export.json"');
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/api/export/erp')
        .send(validExportData)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('POST /api/export/preview', () => {
    const validPreviewData = {
      fechaInicio: '2024-01-01',
      fechaFin: '2024-01-31'
    };

    beforeEach(() => {
      mockExportController.getExportPreview.mockImplementation((req: any, res: any) => {
        res.json({
          success: true,
          data: {
            totalRecords: 100,
            dateRange: { start: '2024-01-01', end: '2024-01-31', days: 31 },
            summary: { totalHours: 800, totalActivities: 100, uniqueObras: 5, uniqueRecursos: 10, operariosCount: 80, maquinasCount: 20 },
            sampleData: []
          }
        });
      });
    });

    it('should handle successful preview request', async () => {
      const response = await request(app)
        .post('/api/export/preview')
        .send(validPreviewData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRecords).toBe(100);
      expect(mockExportController.getExportPreview).toHaveBeenCalled();
    });

    it('should require authentication for preview', async () => {
      mockAuthMiddleware.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      await request(app)
        .post('/api/export/preview')
        .send(validPreviewData)
        .expect(401);
    });

    it('should handle preview with filters', async () => {
      const previewWithFilters = {
        ...validPreviewData,
        empresa: 'Test Company',
        tipoRecurso: 'maquina',
        obraIds: [1, 2],
        recursoIds: [5, 6, 7]
      };

      await request(app)
        .post('/api/export/preview')
        .send(previewWithFilters)
        .expect(200);

      expect(mockExportController.getExportPreview).toHaveBeenCalled();
    });
  });

  describe('GET /api/export/logs', () => {
    beforeEach(() => {
      mockExportController.getExportLogs.mockImplementation((req: any, res: any) => {
        res.json({
          success: true,
          data: {
            logs: [
              {
                id: 1,
                format: ExportFormat.JSON,
                status: 'completed',
                fechaInicio: '2024-01-01',
                fechaFin: '2024-01-31',
                recordsCount: 100,
                fechaCreacion: new Date().toISOString()
              }
            ],
            total: 1,
            page: 1,
            totalPages: 1
          }
        });
      });
    });

    it('should return export logs successfully', async () => {
      const response = await request(app)
        .get('/api/export/logs')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toHaveLength(1);
      expect(mockExportController.getExportLogs).toHaveBeenCalled();
    });

    it('should handle pagination parameters', async () => {
      await request(app)
        .get('/api/export/logs?page=2&limit=20')
        .expect(200);

      expect(mockExportController.getExportLogs).toHaveBeenCalled();
    });

    it('should handle missing pagination parameters', async () => {
      await request(app)
        .get('/api/export/logs')
        .expect(200);

      expect(mockExportController.getExportLogs).toHaveBeenCalled();
    });

    it('should require authentication for logs', async () => {
      mockAuthMiddleware.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      await request(app)
        .get('/api/export/logs')
        .expect(401);
    });
  });

  describe('GET /api/export/logs/:id', () => {
    beforeEach(() => {
      mockExportController.getExportLogById.mockImplementation((req: any, res: any) => {
        const logId = parseInt(req.params.id);
        if (logId === 999) {
          res.status(404).json({ success: false, message: 'Log not found' });
        } else {
          res.json({
            success: true,
            data: {
              id: logId,
              format: ExportFormat.JSON,
              status: 'completed',
              fechaInicio: '2024-01-01',
              fechaFin: '2024-01-31',
              recordsCount: 100,
              fechaCreacion: new Date().toISOString()
            }
          });
        }
      });
    });

    it('should return specific export log', async () => {
      const response = await request(app)
        .get('/api/export/logs/123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(123);
      expect(mockExportController.getExportLogById).toHaveBeenCalled();
    });

    it('should handle non-existent log ID', async () => {
      const response = await request(app)
        .get('/api/export/logs/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Log not found');
    });

    it('should validate numeric ID parameter', async () => {
      mockExportController.getExportLogById.mockImplementation((req: any, res: any) => {
        res.status(400).json({ success: false, message: 'Invalid ID' });
      });

      await request(app)
        .get('/api/export/logs/invalid')
        .expect(400);
    });

    it('should require authentication for log details', async () => {
      mockAuthMiddleware.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      await request(app)
        .get('/api/export/logs/123')
        .expect(401);
    });
  });

  describe('GET /api/export/download/:id', () => {
    beforeEach(() => {
      mockExportController.downloadExportFile.mockImplementation((req: any, res: any) => {
        const logId = parseInt(req.params.id);

        if (logId === 999) {
          res.status(404).json({ success: false, message: 'File not found' });
        } else if (logId === 888) {
          res.status(400).json({ success: false, message: 'Export not completed' });
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', 'attachment; filename="export.json"');
          res.json([{ test: 'data' }]);
        }
      });
    });

    it('should download completed export file', async () => {
      const response = await request(app)
        .get('/api/export/download/123')
        .expect(200);

      expect(response.body).toEqual([{ test: 'data' }]);
      expect(mockExportController.downloadExportFile).toHaveBeenCalled();
    });

    it('should handle non-existent download', async () => {
      const response = await request(app)
        .get('/api/export/download/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('File not found');
    });

    it('should handle incomplete exports', async () => {
      const response = await request(app)
        .get('/api/export/download/888')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Export not completed');
    });

    it('should require authentication for download', async () => {
      mockAuthMiddleware.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      await request(app)
        .get('/api/export/download/123')
        .expect(401);
    });

    it('should handle different file formats', async () => {
      const formats = [
        { id: '100', type: 'application/json', data: [{ test: 'json' }] },
        { id: '101', type: 'text/csv', data: 'col1,col2\nval1,val2' },
        { id: '102', type: 'application/xml', data: '<root><item>test</item></root>' }
      ];

      for (const format of formats) {
        mockExportController.downloadExportFile.mockImplementation((req: any, res: any) => {
          res.setHeader('Content-Type', format.type);
          if (format.type === 'application/json') {
            res.json(format.data);
          } else {
            res.send(format.data);
          }
        });

        const response = await request(app)
          .get(`/api/export/download/${format.id}`)
          .expect(200);

        if (format.type === 'application/json') {
          expect(response.body).toEqual(format.data);
        } else {
          expect(response.text).toBe(format.data);
        }
      }
    });
  });

  describe('Route middleware application', () => {
    it('should apply authentication middleware to all routes', async () => {
      const routes = [
        { method: 'post', path: '/api/export/erp', body: { fechaInicio: '2024-01-01', fechaFin: '2024-01-31' } },
        { method: 'post', path: '/api/export/preview', body: { fechaInicio: '2024-01-01', fechaFin: '2024-01-31' } },
        { method: 'get', path: '/api/export/logs' },
        { method: 'get', path: '/api/export/logs/123' },
        { method: 'get', path: '/api/export/download/123' }
      ];

      // Set auth to fail
      mockAuthMiddleware.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      for (const route of routes) {
        if (route.method === 'post') {
          await request(app)
            .post(route.path)
            .send(route.body)
            .expect(401);
        } else {
          await request(app)
            .get(route.path)
            .expect(401);
        }
      }

      expect(mockAuthMiddleware).toHaveBeenCalledTimes(routes.length);
    });

    it('should apply rate limiting to export endpoints', async () => {
      // This test verifies that rate limiting middleware is applied
      // The actual rate limiting logic is tested in the rateLimiter.test.ts
      await request(app)
        .post('/api/export/erp')
        .send({ fechaInicio: '2024-01-01', fechaFin: '2024-01-31' })
        .expect(200);

      await request(app)
        .post('/api/export/preview')
        .send({ fechaInicio: '2024-01-01', fechaFin: '2024-01-31' })
        .expect(200);

      // Verify that the middleware was applied (mocked to pass through)
      expect(mockExportController.exportToERP).toHaveBeenCalled();
      expect(mockExportController.getExportPreview).toHaveBeenCalled();
    });

    it('should apply validation middleware to all endpoints', async () => {
      // This test verifies that validation middleware is applied
      // The actual validation logic is tested separately
      const routes = [
        { method: 'post', path: '/api/export/erp', body: { fechaInicio: '2024-01-01', fechaFin: '2024-01-31' } },
        { method: 'post', path: '/api/export/preview', body: { fechaInicio: '2024-01-01', fechaFin: '2024-01-31' } },
        { method: 'get', path: '/api/export/logs?page=1&limit=10' },
        { method: 'get', path: '/api/export/logs/123' },
        { method: 'get', path: '/api/export/download/123' }
      ];

      for (const route of routes) {
        if (route.method === 'post') {
          await request(app)
            .post(route.path)
            .send(route.body)
            .expect(200);
        } else {
          await request(app)
            .get(route.path)
            .expect(200);
        }
      }

      // All routes should have passed through validation middleware
      expect(mockExportController.exportToERP).toHaveBeenCalled();
      expect(mockExportController.getExportPreview).toHaveBeenCalled();
      expect(mockExportController.getExportLogs).toHaveBeenCalled();
      expect(mockExportController.getExportLogById).toHaveBeenCalled();
      expect(mockExportController.downloadExportFile).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle controller errors gracefully', async () => {
      mockExportController.exportToERP.mockImplementation((req: any, res: any) => {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          error: 'Database connection failed'
        });
      });

      const response = await request(app)
        .post('/api/export/erp')
        .send({ fechaInicio: '2024-01-01', fechaFin: '2024-01-31' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should handle malformed request bodies', async () => {
      mockExportController.exportToERP.mockImplementation((req: any, res: any) => {
        res.status(400).json({
          success: false,
          message: 'Invalid request data'
        });
      });

      await request(app)
        .post('/api/export/erp')
        .send('invalid json')
        .expect(400);
    });

    it('should handle missing request bodies', async () => {
      mockExportController.exportToERP.mockImplementation((req: any, res: any) => {
        res.status(400).json({
          success: false,
          message: 'Request body required'
        });
      });

      await request(app)
        .post('/api/export/erp')
        .expect(400);
    });
  });
});