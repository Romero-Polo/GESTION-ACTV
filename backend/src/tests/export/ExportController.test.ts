import { Request, Response } from 'express';
import { ExportController } from '../../controllers/ExportController';
import { ExportService } from '../../services/ExportService';
import { ExportFormat, ExportStatus } from '../../models/ExportLog';
import { RolUsuario } from '../../models/Usuario';

// Mock the ExportService
jest.mock('../../services/ExportService');
jest.mock('../../utils/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    isInitialized: true
  }
}));

describe('ExportController', () => {
  let exportController: ExportController;
  let mockExportService: jest.Mocked<ExportService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;
  let responseSetHeader: jest.Mock;
  let responseSend: jest.Mock;

  beforeEach(() => {
    // Create mocked response
    responseJson = jest.fn().mockReturnThis();
    responseStatus = jest.fn().mockReturnThis();
    responseSetHeader = jest.fn().mockReturnThis();
    responseSend = jest.fn().mockReturnThis();

    mockResponse = {
      json: responseJson,
      status: responseStatus,
      setHeader: responseSetHeader,
      send: responseSend
    } as Partial<Response>;

    // Create mocked request
    mockRequest = {
      user: { id: 1, rol: RolUsuario.ADMINISTRADOR },
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      connection: { remoteAddress: '127.0.0.1' }
    } as Partial<Request>;

    // Mock ExportService
    mockExportService = new ExportService(null as any) as jest.Mocked<ExportService>;
    exportController = new ExportController();
    (exportController as any).exportService = mockExportService;
  });

  describe('exportToERP', () => {
    const validExportData = {
      fechaInicio: '2024-01-01',
      fechaFin: '2024-01-31',
      format: ExportFormat.JSON
    };

    const mockExportResult = {
      success: true,
      data: [
        {
          fecha: '2024-01-15',
          recurso: 'OP001 - Juan Pérez',
          obra: 'OBR001 - Test Obra',
          cantidad: 8.0,
          agr_coste: 'MANO_OBRA_DIRECTA',
          actividad: 'Hormigonado'
        }
      ],
      totalRecords: 1,
      exportLogId: 123,
      fileName: 'export_test.json'
    };

    beforeEach(() => {
      mockRequest.body = validExportData;
    });

    it('should export successfully with valid data', async () => {
      mockExportService.exportToERP.mockResolvedValue(mockExportResult);

      await exportController.exportToERP(mockRequest as Request, mockResponse as Response);

      expect(mockExportService.exportToERP).toHaveBeenCalledWith(
        expect.objectContaining({
          fechaInicio: validExportData.fechaInicio,
          fechaFin: validExportData.fechaFin
        }),
        validExportData.format,
        1,
        '127.0.0.1',
        'test-user-agent'
      );

      expect(responseSetHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(responseSetHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="export_test.json"'
      );

      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: 'Exportación completada exitosamente',
        data: mockExportResult.data,
        totalRecords: mockExportResult.totalRecords,
        exportLogId: mockExportResult.exportLogId,
        fileName: mockExportResult.fileName,
        downloadUrl: mockExportResult.downloadUrl
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      mockRequest.user = undefined;

      await exportController.exportToERP(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Usuario no autenticado'
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = { fechaInicio: '2024-01-01' }; // Missing fechaFin

      await exportController.exportToERP(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'fechaInicio y fechaFin son requeridos'
      });
    });

    it('should return 400 for invalid format', async () => {
      mockRequest.body = {
        ...validExportData,
        format: 'invalid-format'
      };

      await exportController.exportToERP(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Formato inválido. Formatos válidos: json, csv, xml'
      });
    });

    it('should return 400 for invalid date format', async () => {
      mockRequest.body = {
        ...validExportData,
        fechaInicio: '01/01/2024' // Invalid format
      };

      await exportController.exportToERP(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    });

    it('should handle export service errors', async () => {
      const mockFailedResult = {
        success: false,
        totalRecords: 0,
        exportLogId: 124,
        error: 'Database connection failed'
      };

      mockExportService.exportToERP.mockResolvedValue(mockFailedResult);

      await exportController.exportToERP(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Error en la exportación',
        error: mockFailedResult.error,
        exportLogId: mockFailedResult.exportLogId
      });
    });

    it('should handle unexpected exceptions', async () => {
      mockExportService.exportToERP.mockRejectedValue(new Error('Unexpected error'));

      await exportController.exportToERP(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Error interno del servidor',
        error: 'Unexpected error'
      });
    });

    it('should set correct headers for CSV format', async () => {
      mockRequest.body = {
        ...validExportData,
        format: ExportFormat.CSV
      };

      const csvResult = { ...mockExportResult, fileName: 'export_test.csv' };
      mockExportService.exportToERP.mockResolvedValue(csvResult);

      await exportController.exportToERP(mockRequest as Request, mockResponse as Response);

      expect(responseSetHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(responseSetHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="export_test.csv"'
      );
    });

    it('should set correct headers for XML format', async () => {
      mockRequest.body = {
        ...validExportData,
        format: ExportFormat.XML
      };

      const xmlResult = { ...mockExportResult, fileName: 'export_test.xml' };
      mockExportService.exportToERP.mockResolvedValue(xmlResult);

      await exportController.exportToERP(mockRequest as Request, mockResponse as Response);

      expect(responseSetHeader).toHaveBeenCalledWith('Content-Type', 'application/xml');
      expect(responseSetHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="export_test.xml"'
      );
    });
  });

  describe('getExportPreview', () => {
    const validPreviewData = {
      fechaInicio: '2024-01-01',
      fechaFin: '2024-01-31'
    };

    const mockPreviewResult = {
      totalRecords: 100,
      dateRange: {
        start: '2024-01-01',
        end: '2024-01-31',
        days: 31
      },
      summary: {
        totalHours: 800.0,
        totalActivities: 100,
        uniqueObras: 5,
        uniqueRecursos: 10,
        operariosCount: 80,
        maquinasCount: 20
      },
      sampleData: []
    };

    beforeEach(() => {
      mockRequest.body = validPreviewData;
    });

    it('should return preview successfully', async () => {
      mockExportService.getExportPreview.mockResolvedValue(mockPreviewResult);

      await exportController.getExportPreview(mockRequest as Request, mockResponse as Response);

      expect(mockExportService.getExportPreview).toHaveBeenCalledWith(
        expect.objectContaining({
          fechaInicio: validPreviewData.fechaInicio,
          fechaFin: validPreviewData.fechaFin
        }),
        1
      );

      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: mockPreviewResult
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      mockRequest.user = undefined;

      await exportController.getExportPreview(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Usuario no autenticado'
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = { fechaInicio: '2024-01-01' }; // Missing fechaFin

      await exportController.getExportPreview(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'fechaInicio y fechaFin son requeridos'
      });
    });

    it('should handle preview service errors', async () => {
      mockExportService.getExportPreview.mockRejectedValue(new Error('Database error'));

      await exportController.getExportPreview(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });
  });

  describe('getExportLogs', () => {
    const mockLogsResult = {
      logs: [
        {
          id: 1,
          format: ExportFormat.JSON,
          status: ExportStatus.COMPLETED,
          fechaInicio: '2024-01-01',
          fechaFin: '2024-01-31',
          recordsCount: 100,
          fechaCreacion: new Date()
        }
      ],
      total: 1,
      page: 1,
      totalPages: 1
    };

    it('should return export logs successfully', async () => {
      mockRequest.query = { page: '1', limit: '10' };
      mockExportService.getExportLogs.mockResolvedValue(mockLogsResult);

      await exportController.getExportLogs(mockRequest as Request, mockResponse as Response);

      expect(mockExportService.getExportLogs).toHaveBeenCalledWith(1, 1, 10);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: mockLogsResult
      });
    });

    it('should use default pagination values', async () => {
      mockRequest.query = {};
      mockExportService.getExportLogs.mockResolvedValue(mockLogsResult);

      await exportController.getExportLogs(mockRequest as Request, mockResponse as Response);

      expect(mockExportService.getExportLogs).toHaveBeenCalledWith(1, 1, 10);
    });

    it('should limit maximum page size', async () => {
      mockRequest.query = { limit: '200' }; // Exceeds maximum of 100
      mockExportService.getExportLogs.mockResolvedValue(mockLogsResult);

      await exportController.getExportLogs(mockRequest as Request, mockResponse as Response);

      expect(mockExportService.getExportLogs).toHaveBeenCalledWith(1, 1, 100);
    });
  });

  describe('getExportLogById', () => {
    const mockExportLog = {
      id: 123,
      format: ExportFormat.JSON,
      status: ExportStatus.COMPLETED,
      fechaInicio: '2024-01-01',
      fechaFin: '2024-01-31',
      recordsCount: 100,
      fechaCreacion: new Date(),
      isCompleted: () => true
    };

    beforeEach(() => {
      mockRequest.params = { id: '123' };
    });

    it('should return export log successfully', async () => {
      mockExportService.getExportLogById.mockResolvedValue(mockExportLog as any);

      await exportController.getExportLogById(mockRequest as Request, mockResponse as Response);

      expect(mockExportService.getExportLogById).toHaveBeenCalledWith(123, 1, true);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: mockExportLog
      });
    });

    it('should return 400 for invalid ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await exportController.getExportLogById(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'ID de log inválido'
      });
    });

    it('should return 404 for non-existent log', async () => {
      mockExportService.getExportLogById.mockResolvedValue(null);

      await exportController.getExportLogById(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Log de exportación no encontrado'
      });
    });

    it('should apply admin role check', async () => {
      mockRequest.user = { id: 1, rol: RolUsuario.OPERARIO };
      mockExportService.getExportLogById.mockResolvedValue(mockExportLog as any);

      await exportController.getExportLogById(mockRequest as Request, mockResponse as Response);

      expect(mockExportService.getExportLogById).toHaveBeenCalledWith(123, 1, false);
    });
  });

  describe('downloadExportFile', () => {
    const mockExportLog = {
      id: 123,
      format: ExportFormat.JSON,
      status: ExportStatus.COMPLETED,
      fechaInicio: '2024-01-01',
      fechaFin: '2024-01-31',
      fileName: 'test_export.json',
      isCompleted: () => true
    };

    beforeEach(() => {
      mockRequest.params = { id: '123' };
    });

    it('should download completed export file successfully', async () => {
      mockExportService.getExportLogById.mockResolvedValue(mockExportLog as any);
      mockExportService.exportToERP.mockResolvedValue({
        success: true,
        data: [{ test: 'data' }],
        totalRecords: 1,
        exportLogId: 123
      });

      await exportController.downloadExportFile(mockRequest as Request, mockResponse as Response);

      expect(responseSetHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(responseJson).toHaveBeenCalledWith([{ test: 'data' }]);
    });

    it('should return 400 for incomplete export', async () => {
      const incompleteLog = {
        ...mockExportLog,
        status: ExportStatus.PROCESSING,
        isCompleted: () => false
      };

      mockExportService.getExportLogById.mockResolvedValue(incompleteLog as any);

      await exportController.downloadExportFile(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'La exportación no está completada'
      });
    });

    it('should handle CSV download', async () => {
      const csvLog = {
        ...mockExportLog,
        format: ExportFormat.CSV
      };

      mockExportService.getExportLogById.mockResolvedValue(csvLog as any);
      mockExportService.exportToERP.mockResolvedValue({
        success: true,
        data: [{ col1: 'value1', col2: 'value2' }],
        totalRecords: 1,
        exportLogId: 123
      });

      await exportController.downloadExportFile(mockRequest as Request, mockResponse as Response);

      expect(responseSetHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(responseSend).toHaveBeenCalledWith('col1,col2\nvalue1,value2');
    });

    it('should handle XML download', async () => {
      const xmlLog = {
        ...mockExportLog,
        format: ExportFormat.XML
      };

      mockExportService.getExportLogById.mockResolvedValue(xmlLog as any);
      mockExportService.exportToERP.mockResolvedValue({
        success: true,
        data: [{ item: 'test' }],
        totalRecords: 1,
        exportLogId: 123
      });

      await exportController.downloadExportFile(mockRequest as Request, mockResponse as Response);

      expect(responseSetHeader).toHaveBeenCalledWith('Content-Type', 'application/xml');
      expect(responseSend).toHaveBeenCalledWith(
        expect.stringContaining('<?xml version="1.0" encoding="UTF-8"?>')
      );
      expect(responseSend).toHaveBeenCalledWith(
        expect.stringContaining('<item>test</item>')
      );
    });

    it('should return 500 if regeneration fails', async () => {
      mockExportService.getExportLogById.mockResolvedValue(mockExportLog as any);
      mockExportService.exportToERP.mockResolvedValue({
        success: false,
        totalRecords: 0,
        exportLogId: 123,
        error: 'Regeneration failed'
      });

      await exportController.downloadExportFile(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Error regenerando archivo de exportación'
      });
    });
  });

  describe('Data conversion methods', () => {
    it('should convert to CSV correctly', () => {
      const testData = [
        { name: 'John', age: 30, city: 'New York' },
        { name: 'Jane', age: 25, city: 'Los Angeles' }
      ];

      // Test the private method indirectly through the download functionality
      const controller = exportController as any;
      const result = controller.convertToCSV(testData);

      expect(result).toBe('name,age,city\nJohn,30,New York\nJane,25,Los Angeles');
    });

    it('should escape CSV special characters', () => {
      const testData = [
        { name: 'John "Johnny" Doe', description: 'Contains, comma' }
      ];

      const controller = exportController as any;
      const result = controller.convertToCSV(testData);

      expect(result).toContain('"John ""Johnny"" Doe"');
      expect(result).toContain('"Contains, comma"');
    });

    it('should convert to XML correctly', () => {
      const testData = [
        { name: 'John', age: 30 }
      ];

      const controller = exportController as any;
      const result = controller.convertToXML(testData);

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<export>');
      expect(result).toContain('<item>');
      expect(result).toContain('<name>John</name>');
      expect(result).toContain('<age>30</age>');
      expect(result).toContain('</item>');
      expect(result).toContain('</export>');
    });

    it('should escape XML special characters', () => {
      const testData = [
        { description: 'Contains <tags> & "quotes"' }
      ];

      const controller = exportController as any;
      const result = controller.convertToXML(testData);

      expect(result).toContain('&lt;tags&gt; &amp; &quot;quotes&quot;');
    });

    it('should handle empty arrays', () => {
      const controller = exportController as any;

      expect(controller.convertToCSV([])).toBe('');

      const xmlResult = controller.convertToXML([]);
      expect(xmlResult).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<export>\n</export>');
    });
  });
});