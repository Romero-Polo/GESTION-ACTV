import { Request, Response } from 'express';
import { AppDataSource } from '../utils/database';
import { ExportService, ExportFilters } from '../services/ExportService';
import { ExportFormat } from '../models/ExportLog';
import { RolUsuario } from '../models/Usuario';

export class ExportController {
  private exportService: ExportService;

  constructor() {
    this.exportService = new ExportService(AppDataSource);
  }

  /**
   * Export activities to ERP format
   * POST /api/export/erp
   */
  async exportToERP(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const {
        fechaInicio,
        fechaFin,
        empresa,
        tipoRecurso,
        obraIds,
        recursoIds,
        format = ExportFormat.JSON
      } = req.body;

      // Validate required fields
      if (!fechaInicio || !fechaFin) {
        res.status(400).json({
          success: false,
          message: 'fechaInicio y fechaFin son requeridos'
        });
        return;
      }

      // Validate format
      if (!Object.values(ExportFormat).includes(format)) {
        res.status(400).json({
          success: false,
          message: `Formato inválido. Formatos válidos: ${Object.values(ExportFormat).join(', ')}`
        });
        return;
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(fechaInicio) || !dateRegex.test(fechaFin)) {
        res.status(400).json({
          success: false,
          message: 'Formato de fecha inválido. Use YYYY-MM-DD'
        });
        return;
      }

      const filters: ExportFilters = {
        fechaInicio,
        fechaFin,
        empresa,
        tipoRecurso,
        obraIds: obraIds ? (Array.isArray(obraIds) ? obraIds : [obraIds]) : undefined,
        recursoIds: recursoIds ? (Array.isArray(recursoIds) ? recursoIds : [recursoIds]) : undefined
      };

      // Get client information for logging
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      const result = await this.exportService.exportToERP(
        filters,
        format,
        userId,
        clientIp,
        userAgent
      );

      if (result.success) {
        // Set response headers based on format
        this.setResponseHeaders(res, format, result.fileName);

        res.json({
          success: true,
          message: 'Exportación completada exitosamente',
          data: result.data,
          totalRecords: result.totalRecords,
          exportLogId: result.exportLogId,
          fileName: result.fileName,
          downloadUrl: result.downloadUrl
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Error en la exportación',
          error: result.error,
          exportLogId: result.exportLogId
        });
      }

    } catch (error: any) {
      console.error('Export error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Get preview of export data
   * POST /api/export/preview
   */
  async getExportPreview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const {
        fechaInicio,
        fechaFin,
        empresa,
        tipoRecurso,
        obraIds,
        recursoIds
      } = req.body;

      // Validate required fields
      if (!fechaInicio || !fechaFin) {
        res.status(400).json({
          success: false,
          message: 'fechaInicio y fechaFin son requeridos'
        });
        return;
      }

      const filters: ExportFilters = {
        fechaInicio,
        fechaFin,
        empresa,
        tipoRecurso,
        obraIds: obraIds ? (Array.isArray(obraIds) ? obraIds : [obraIds]) : undefined,
        recursoIds: recursoIds ? (Array.isArray(recursoIds) ? recursoIds : [recursoIds]) : undefined
      };

      const preview = await this.exportService.getExportPreview(filters, userId);

      res.json({
        success: true,
        data: preview
      });

    } catch (error: any) {
      console.error('Preview error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error generando preview'
      });
    }
  }

  /**
   * Get export logs for current user
   * GET /api/export/logs
   */
  async getExportLogs(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

      const result = await this.exportService.getExportLogs(userId, page, limit);

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      console.error('Get export logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo logs de exportación',
        error: error.message
      });
    }
  }

  /**
   * Get export log by ID
   * GET /api/export/logs/:id
   */
  async getExportLogById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.rol;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const logId = parseInt(req.params.id);
      if (isNaN(logId)) {
        res.status(400).json({
          success: false,
          message: 'ID de log inválido'
        });
        return;
      }

      const isAdmin = userRole === RolUsuario.ADMINISTRADOR;
      const log = await this.exportService.getExportLogById(logId, userId, isAdmin);

      if (!log) {
        res.status(404).json({
          success: false,
          message: 'Log de exportación no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: log
      });

    } catch (error: any) {
      console.error('Get export log error:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo log de exportación',
        error: error.message
      });
    }
  }

  /**
   * Get export statistics
   * GET /api/export/stats
   */
  async getExportStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.rol;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const { fechaInicio, fechaFin } = req.query;

      const stats = await this.exportService.getExportStatistics(
        userId,
        userRole === RolUsuario.ADMINISTRADOR,
        fechaInicio as string,
        fechaFin as string
      );

      res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      console.error('Export stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas de exportación',
        error: error.message
      });
    }
  }

  /**
   * Validate export request without executing
   * POST /api/export/validate
   */
  async validateExportRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const { fechaInicio, fechaFin, empresa, tipoRecurso, obraIds, recursoIds } = req.body;

      // Validate required fields
      if (!fechaInicio || !fechaFin) {
        res.status(400).json({
          success: false,
          message: 'fechaInicio y fechaFin son requeridos',
          valid: false
        });
        return;
      }

      const filters: ExportFilters = {
        fechaInicio,
        fechaFin,
        empresa,
        tipoRecurso,
        obraIds: obraIds ? (Array.isArray(obraIds) ? obraIds : [obraIds]) : undefined,
        recursoIds: recursoIds ? (Array.isArray(recursoIds) ? recursoIds : [recursoIds]) : undefined
      };

      const validation = await this.exportService.validateExportRequest(filters, userId);

      res.json({
        success: true,
        valid: validation.isValid,
        warnings: validation.warnings,
        estimatedRecords: validation.estimatedRecords,
        estimatedSize: validation.estimatedSize,
        dateRange: validation.dateRange
      });

    } catch (error: any) {
      console.error('Export validation error:', error);
      res.status(400).json({
        success: false,
        valid: false,
        message: error.message
      });
    }
  }

  /**
   * Download export file
   * GET /api/export/download/:id
   */
  async downloadExportFile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.rol;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const logId = parseInt(req.params.id);
      if (isNaN(logId)) {
        res.status(400).json({
          success: false,
          message: 'ID de log inválido'
        });
        return;
      }

      const isAdmin = userRole === RolUsuario.ADMINISTRADOR;
      const log = await this.exportService.getExportLogById(logId, userId, isAdmin);

      if (!log) {
        res.status(404).json({
          success: false,
          message: 'Log de exportación no encontrado'
        });
        return;
      }

      if (!log.isCompleted()) {
        res.status(400).json({
          success: false,
          message: 'La exportación no está completada'
        });
        return;
      }

      // In a real implementation, you would serve the file from storage
      // For now, we'll regenerate the export data
      const filters: ExportFilters = {
        fechaInicio: log.fechaInicio,
        fechaFin: log.fechaFin,
        empresa: log.empresa,
        tipoRecurso: log.tipoRecurso as any,
        ...(log.filterParams || {})
      };

      const result = await this.exportService.exportToERP(
        filters,
        log.format,
        userId
      );

      if (result.success && result.data) {
        this.setResponseHeaders(res, log.format, log.fileName);

        // Send data in requested format
        switch (log.format) {
          case ExportFormat.JSON:
            res.json(result.data);
            break;
          case ExportFormat.CSV:
            res.send(this.convertToCSV(result.data));
            break;
          case ExportFormat.XML:
            res.send(this.convertToXML(result.data));
            break;
          default:
            res.json(result.data);
        }
      } else {
        res.status(500).json({
          success: false,
          message: 'Error regenerando archivo de exportación'
        });
      }

    } catch (error: any) {
      console.error('Download export error:', error);
      res.status(500).json({
        success: false,
        message: 'Error descargando archivo',
        error: error.message
      });
    }
  }

  /**
   * Set response headers based on format
   */
  private setResponseHeaders(res: Response, format: ExportFormat, fileName?: string): void {
    const timestamp = new Date().toISOString().slice(0, 10);
    const defaultFileName = `export_${timestamp}`;

    switch (format) {
      case ExportFormat.JSON:
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName || defaultFileName}.json"`);
        break;
      case ExportFormat.CSV:
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName || defaultFileName}.csv"`);
        break;
      case ExportFormat.XML:
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName || defaultFileName}.xml"`);
        break;
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Convert data to XML format
   */
  private convertToXML(data: any[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<export>\n';

    data.forEach(item => {
      xml += '  <item>\n';
      Object.entries(item).forEach(([key, value]) => {
        xml += `    <${key}>${this.escapeXml(String(value))}</${key}>\n`;
      });
      xml += '  </item>\n';
    });

    xml += '</export>';
    return xml;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}