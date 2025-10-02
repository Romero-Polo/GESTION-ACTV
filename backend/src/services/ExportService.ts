import { Repository, DataSource, Between, In } from 'typeorm';
import { Actividad } from '../models/Actividad';
import { ExportLog, ExportFormat, ExportStatus } from '../models/ExportLog';
import { Usuario, RolUsuario } from '../models/Usuario';
import { Obra } from '../models/Obra';
import { Recurso, TipoRecurso } from '../models/Recurso';

export interface ExportFilters {
  fechaInicio: string;
  fechaFin: string;
  empresa?: string;
  tipoRecurso?: 'operario' | 'maquina';
  obraIds?: number[];
  recursoIds?: number[];
}

export interface ERPExportItem {
  fecha: string;
  recurso: string;
  obra: string;
  cantidad: number;
  agr_coste: string;
  actividad: string;
  km_recorridos?: number;
}

export interface ExportResult {
  success: boolean;
  data?: ERPExportItem[];
  totalRecords: number;
  exportLogId: number;
  fileName?: string;
  downloadUrl?: string;
  error?: string;
}

export interface ExportPreview {
  totalRecords: number;
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
  summary: {
    totalHours: number;
    totalActivities: number;
    uniqueObras: number;
    uniqueRecursos: number;
    operariosCount: number;
    maquinasCount: number;
  };
  sampleData: ERPExportItem[];
}

export class ExportService {
  private actividadRepository: Repository<Actividad>;
  private exportLogRepository: Repository<ExportLog>;
  private obraRepository: Repository<Obra>;
  private recursoRepository: Repository<Recurso>;

  constructor(dataSource: DataSource) {
    this.actividadRepository = dataSource.getRepository(Actividad);
    this.exportLogRepository = dataSource.getRepository(ExportLog);
    this.obraRepository = dataSource.getRepository(Obra);
    this.recursoRepository = dataSource.getRepository(Recurso);
  }

  /**
   * Export activities to ERP format
   */
  async exportToERP(
    filters: ExportFilters,
    format: ExportFormat,
    userId: number,
    clientIp?: string,
    userAgent?: string
  ): Promise<ExportResult> {
    // Validate date range
    const dateValidationError = ExportLog.validateDateRange(
      filters.fechaInicio,
      filters.fechaFin,
      90 // 3 months max
    );

    if (dateValidationError) {
      throw new Error(dateValidationError);
    }

    // Create export log
    const exportLog = new ExportLog({
      format,
      fechaInicio: filters.fechaInicio,
      fechaFin: filters.fechaFin,
      empresa: filters.empresa,
      tipoRecurso: filters.tipoRecurso,
      usuarioId: userId,
      clientIp,
      userAgent,
      filterParams: filters
    });

    let savedExportLog: ExportLog;
    try {
      savedExportLog = await this.exportLogRepository.save(exportLog);
      savedExportLog.start();
      await this.exportLogRepository.save(savedExportLog);
    } catch (error) {
      throw new Error('Failed to initialize export');
    }

    try {
      // Get aggregated data
      const exportData = await this.getAggregatedActivities(filters, userId);

      // Generate file name
      const fileName = this.generateFileName(filters, format);

      // For now, we'll return the data directly
      // In a real implementation, you might save to a file and return a download URL
      savedExportLog.complete(exportData.length, this.calculateDataSize(exportData), fileName);
      await this.exportLogRepository.save(savedExportLog);

      return {
        success: true,
        data: exportData,
        totalRecords: exportData.length,
        exportLogId: savedExportLog.id,
        fileName
      };

    } catch (error: any) {
      savedExportLog.fail(error.message);
      await this.exportLogRepository.save(savedExportLog);

      return {
        success: false,
        totalRecords: 0,
        exportLogId: savedExportLog.id,
        error: error.message
      };
    }
  }

  /**
   * Get preview of export data
   */
  async getExportPreview(filters: ExportFilters, userId: number): Promise<ExportPreview> {
    // Validate date range
    const dateValidationError = ExportLog.validateDateRange(
      filters.fechaInicio,
      filters.fechaFin,
      90
    );

    if (dateValidationError) {
      throw new Error(dateValidationError);
    }

    // Get aggregated data (limited for preview)
    const previewFilters = { ...filters };
    const fullData = await this.getAggregatedActivities(previewFilters, userId);

    // Calculate summary statistics
    const totalHours = fullData.reduce((sum, item) => sum + item.cantidad, 0);
    const uniqueObras = new Set(fullData.map(item => item.obra)).size;
    const uniqueRecursos = new Set(fullData.map(item => item.recurso)).size;

    // Count by resource type
    const operariosCount = fullData.filter(item =>
      item.agr_coste === 'MANO_OBRA_DIRECTA' || item.agr_coste.includes('OPERARIO')
    ).length;
    const maquinasCount = fullData.filter(item =>
      item.agr_coste === 'MAQUINARIA' || item.agr_coste.includes('MAQUINA')
    ).length;

    // Calculate date range
    const startDate = new Date(filters.fechaInicio);
    const endDate = new Date(filters.fechaFin);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      totalRecords: fullData.length,
      dateRange: {
        start: filters.fechaInicio,
        end: filters.fechaFin,
        days: diffDays
      },
      summary: {
        totalHours,
        totalActivities: fullData.length,
        uniqueObras,
        uniqueRecursos,
        operariosCount,
        maquinasCount
      },
      sampleData: fullData.slice(0, 10) // First 10 records for preview
    };
  }

  /**
   * Get aggregated activities for ERP export
   */
  private async getAggregatedActivities(filters: ExportFilters, userId: number): Promise<ERPExportItem[]> {
    const user = await this.getUserWithRole(userId);

    // Build query with filters and role-based access control
    const queryBuilder = this.actividadRepository
      .createQueryBuilder('actividad')
      .innerJoin('actividad.obra', 'obra')
      .innerJoin('actividad.recurso', 'recurso')
      .innerJoin('actividad.tipoActividad', 'tipoActividad')
      .where('actividad.fechaInicio BETWEEN :fechaInicio AND :fechaFin', {
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin
      });

    // Apply role-based filtering
    if (user.rol === RolUsuario.OPERARIO) {
      // Operarios only see their own activities
      queryBuilder.andWhere('actividad.usuarioCreacionId = :userId', { userId });
    } else if (user.rol === RolUsuario.JEFE_EQUIPO || user.rol === RolUsuario.TECNICO_TRANSPORTE) {
      // Jefes and Técnicos see activities of their assigned resources
      const accessibleRecursoIds = await this.getAccessibleRecursoIds(userId);
      if (accessibleRecursoIds.length > 0) {
        queryBuilder.andWhere('recurso.id IN (:...accessibleRecursoIds)', { accessibleRecursoIds });
      } else {
        // No accessible resources, return empty result
        return [];
      }
    }
    // Administrators see all activities (no additional filter)

    // Apply additional filters
    if (filters.empresa) {
      queryBuilder.andWhere(
        '(obra.cliente LIKE :empresa OR recurso.empresa LIKE :empresa)',
        { empresa: `%${filters.empresa}%` }
      );
    }

    if (filters.tipoRecurso) {
      queryBuilder.andWhere('recurso.tipo = :tipoRecurso', { tipoRecurso: filters.tipoRecurso });
    }

    if (filters.obraIds && filters.obraIds.length > 0) {
      queryBuilder.andWhere('obra.id IN (:...obraIds)', { obraIds: filters.obraIds });
    }

    if (filters.recursoIds && filters.recursoIds.length > 0) {
      queryBuilder.andWhere('recurso.id IN (:...recursoIds)', { recursoIds: filters.recursoIds });
    }

    // Select fields for aggregation
    queryBuilder
      .select([
        'actividad.fechaInicio',
        'actividad.horaInicio',
        'actividad.fechaFin',
        'actividad.horaFin',
        'obra.codigo',
        'obra.descripcion',
        'recurso.codigo',
        'recurso.nombre',
        'recurso.tipo',
        'recurso.agrCoste',
        'tipoActividad.codigo',
        'tipoActividad.nombre'
      ])
      .orderBy('actividad.fechaInicio', 'ASC')
      .addOrderBy('recurso.codigo', 'ASC')
      .addOrderBy('obra.codigo', 'ASC');

    const actividades = await queryBuilder.getMany();

    // Group and aggregate activities
    return this.aggregateActivitiesForERP(actividades);
  }

  /**
   * Aggregate activities by date, resource, work, and type
   */
  private aggregateActivitiesForERP(actividades: Actividad[]): ERPExportItem[] {
    const aggregationMap = new Map<string, ERPExportItem>();

    for (const actividad of actividades) {
      // Create aggregation key
      const key = `${actividad.fechaInicio}_${actividad.recurso.codigo}_${actividad.obra.codigo}_${actividad.tipoActividad.codigo}`;

      // Calculate duration in hours
      const duration = this.calculateActivityDuration(actividad);

      if (aggregationMap.has(key)) {
        // Add to existing aggregation
        const existing = aggregationMap.get(key)!;
        existing.cantidad += duration;
      } else {
        // Create new aggregation
        const erpItem: ERPExportItem = {
          fecha: actividad.fechaInicio,
          recurso: `${actividad.recurso.codigo} - ${actividad.recurso.nombre}`,
          obra: `${actividad.obra.codigo} - ${actividad.obra.descripcion}`,
          cantidad: duration,
          agr_coste: this.getAgrCoste(actividad.recurso),
          actividad: actividad.tipoActividad.nombre
        };

        // Add km_recorridos if available (for future GPS integration)
        if (actividad.recurso.tipo === TipoRecurso.MAQUINA && (actividad as any).kmRecorridos) {
          erpItem.km_recorridos = (actividad as any).kmRecorridos;
        }

        aggregationMap.set(key, erpItem);
      }
    }

    return Array.from(aggregationMap.values()).sort((a, b) => {
      // Sort by date, then by resource, then by work
      const dateCompare = a.fecha.localeCompare(b.fecha);
      if (dateCompare !== 0) return dateCompare;

      const resourceCompare = a.recurso.localeCompare(b.recurso);
      if (resourceCompare !== 0) return resourceCompare;

      return a.obra.localeCompare(b.obra);
    });
  }

  /**
   * Calculate activity duration in hours
   */
  private calculateActivityDuration(actividad: Actividad): number {
    if (!actividad.fechaFin || !actividad.horaFin) {
      // Open shift - use default 8 hours
      return 8.0;
    }

    const start = new Date(`${actividad.fechaInicio}T${actividad.horaInicio}`);
    const end = new Date(`${actividad.fechaFin}T${actividad.horaFin}`);

    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get aggregation cost category for resource
   */
  private getAgrCoste(recurso: Recurso): string {
    if (recurso.agrCoste) {
      return recurso.agrCoste;
    }

    // Default mapping based on resource type
    switch (recurso.tipo) {
      case TipoRecurso.OPERARIO:
        return 'MANO_OBRA_DIRECTA';
      case TipoRecurso.MAQUINA:
        return 'MAQUINARIA';
      default:
        return 'OTROS';
    }
  }

  /**
   * Get user with role information
   */
  private async getUserWithRole(userId: number): Promise<Usuario> {
    const user = await this.actividadRepository.manager
      .getRepository(Usuario)
      .findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return user;
  }

  /**
   * Get accessible resource IDs for a user
   */
  private async getAccessibleRecursoIds(userId: number): Promise<number[]> {
    // This should be implemented based on your business logic
    // For now, return all resources (to be implemented with proper access control)
    const recursos = await this.recursoRepository.find({ select: ['id'] });
    return recursos.map(r => r.id);
  }

  /**
   * Generate file name for export
   */
  private generateFileName(filters: ExportFilters, format: ExportFormat): string {
    const startDate = filters.fechaInicio.replace(/-/g, '');
    const endDate = filters.fechaFin.replace(/-/g, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    let baseName = `export_erp_${startDate}_${endDate}_${timestamp}`;

    if (filters.empresa) {
      baseName += `_${filters.empresa.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }

    if (filters.tipoRecurso) {
      baseName += `_${filters.tipoRecurso}`;
    }

    return `${baseName}.${format}`;
  }

  /**
   * Calculate approximate data size in bytes
   */
  private calculateDataSize(data: ERPExportItem[]): number {
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  }

  /**
   * Get export logs for user
   */
  async getExportLogs(userId: number, page = 1, limit = 10): Promise<{
    logs: ExportLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const [logs, total] = await this.exportLogRepository.findAndCount({
      where: { usuarioId: userId },
      order: { fechaCreacion: 'DESC' },
      skip: (page - 1) * limit,
      take: limit
    });

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get export log by ID (with user access control)
   */
  async getExportLogById(logId: number, userId: number, isAdmin = false): Promise<ExportLog | null> {
    const where: any = { id: logId };

    if (!isAdmin) {
      where.usuarioId = userId;
    }

    return await this.exportLogRepository.findOne({ where });
  }

  /**
   * Get export statistics
   */
  async getExportStatistics(
    userId: number,
    isAdmin: boolean,
    fechaInicio?: string,
    fechaFin?: string
  ): Promise<any> {
    const queryBuilder = this.exportLogRepository.createQueryBuilder('export_log')
      .leftJoinAndSelect('export_log.usuario', 'usuario');

    // Apply user filter if not admin
    if (!isAdmin) {
      queryBuilder.andWhere('export_log.usuarioId = :userId', { userId });
    }

    // Apply date filter if provided
    if (fechaInicio && fechaFin) {
      queryBuilder.andWhere('export_log.fechaCreacion BETWEEN :fechaInicio AND :fechaFin', {
        fechaInicio: `${fechaInicio} 00:00:00`,
        fechaFin: `${fechaFin} 23:59:59`
      });
    }

    const logs = await queryBuilder.getMany();

    // Calculate statistics
    const totalExports = logs.length;
    const completedExports = logs.filter(log => log.status === ExportStatus.COMPLETED).length;
    const failedExports = logs.filter(log => log.status === ExportStatus.FAILED).length;
    const inProgressExports = logs.filter(log => log.status === ExportStatus.PROCESSING).length;

    const formatStats = {
      json: logs.filter(log => log.format === ExportFormat.JSON).length,
      csv: logs.filter(log => log.format === ExportFormat.CSV).length,
      xml: logs.filter(log => log.format === ExportFormat.XML).length
    };

    const totalRecords = logs.reduce((sum, log) => sum + log.recordsCount, 0);
    const totalSize = logs
      .filter(log => log.fileSizeBytes)
      .reduce((sum, log) => sum + (log.fileSizeBytes || 0), 0);

    const avgDuration = logs
      .filter(log => log.durationMs)
      .reduce((sum, log, _, arr) => sum + (log.durationMs || 0) / arr.length, 0);

    // Top users (if admin)
    let topUsers: any[] = [];
    if (isAdmin) {
      const userExports = logs.reduce((acc, log) => {
        const userName = log.usuario?.nombre || 'Unknown';
        acc[userName] = (acc[userName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      topUsers = Object.entries(userExports)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
    }

    // Recent exports
    const recentExports = logs
      .sort((a, b) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime())
      .slice(0, 5)
      .map(log => ({
        id: log.id,
        format: log.format,
        status: log.status,
        recordsCount: log.recordsCount,
        fechaCreacion: log.fechaCreacion,
        dateRange: `${log.fechaInicio} - ${log.fechaFin}`,
        usuario: isAdmin ? log.usuario?.nombre : undefined
      }));

    return {
      overview: {
        totalExports,
        completedExports,
        failedExports,
        inProgressExports,
        successRate: totalExports > 0 ? Math.round((completedExports / totalExports) * 100) : 0
      },
      formats: formatStats,
      volume: {
        totalRecords,
        avgRecordsPerExport: totalExports > 0 ? Math.round(totalRecords / totalExports) : 0,
        totalSizeBytes: totalSize,
        avgSizeMB: totalSize > 0 ? Math.round((totalSize / (1024 * 1024)) * 100) / 100 : 0
      },
      performance: {
        avgDurationMs: Math.round(avgDuration),
        avgDurationSeconds: Math.round(avgDuration / 1000)
      },
      ...(isAdmin && { topUsers }),
      recentExports
    };
  }

  /**
   * Validate export request
   */
  async validateExportRequest(filters: ExportFilters, userId: number): Promise<{
    isValid: boolean;
    warnings: string[];
    estimatedRecords: number;
    estimatedSize: number;
    dateRange: { days: number; start: string; end: string };
  }> {
    const warnings: string[] = [];

    // Validate date range
    const dateValidationError = ExportLog.validateDateRange(
      filters.fechaInicio,
      filters.fechaFin,
      90
    );

    if (dateValidationError) {
      return {
        isValid: false,
        warnings: [dateValidationError],
        estimatedRecords: 0,
        estimatedSize: 0,
        dateRange: { days: 0, start: filters.fechaInicio, end: filters.fechaFin }
      };
    }

    // Calculate date range
    const startDate = new Date(filters.fechaInicio);
    const endDate = new Date(filters.fechaFin);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Get estimated record count
    const queryBuilder = this.actividadRepository
      .createQueryBuilder('actividad')
      .innerJoin('actividad.obra', 'obra')
      .innerJoin('actividad.recurso', 'recurso')
      .innerJoin('actividad.tipoActividad', 'tipoActividad')
      .where('actividad.fechaInicio BETWEEN :fechaInicio AND :fechaFin', {
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin
      });

    // Apply role-based filtering
    const user = await this.getUserWithRole(userId);
    if (user.rol === RolUsuario.OPERARIO) {
      queryBuilder.andWhere('actividad.usuarioCreacionId = :userId', { userId });
    }

    // Apply filters
    if (filters.empresa) {
      queryBuilder.andWhere(
        '(obra.cliente LIKE :empresa OR recurso.empresa LIKE :empresa)',
        { empresa: `%${filters.empresa}%` }
      );
    }

    if (filters.tipoRecurso) {
      queryBuilder.andWhere('recurso.tipo = :tipoRecurso', { tipoRecurso: filters.tipoRecurso });
    }

    if (filters.obraIds && filters.obraIds.length > 0) {
      queryBuilder.andWhere('obra.id IN (:...obraIds)', { obraIds: filters.obraIds });
    }

    if (filters.recursoIds && filters.recursoIds.length > 0) {
      queryBuilder.andWhere('recurso.id IN (:...recursoIds)', { recursoIds: filters.recursoIds });
    }

    const estimatedRecords = await queryBuilder.getCount();

    // Estimate size (rough calculation based on JSON format)
    const avgRecordSize = 250; // bytes per record (estimated)
    const estimatedSize = estimatedRecords * avgRecordSize;

    // Generate warnings
    if (diffDays > 60) {
      warnings.push('Rango de fechas superior a 2 meses, la exportación puede tardar más tiempo');
    }

    if (estimatedRecords > 10000) {
      warnings.push(`Estimadas ${estimatedRecords.toLocaleString()} actividades, considere usar filtros más específicos`);
    }

    if (estimatedRecords === 0) {
      warnings.push('No se encontraron actividades con los filtros especificados');
    }

    if (estimatedSize > 50 * 1024 * 1024) { // 50MB
      warnings.push('El tamaño estimado del archivo es superior a 50MB');
    }

    // Check for recent similar exports
    const recentSimilarExport = await this.exportLogRepository
      .createQueryBuilder('export_log')
      .where('export_log.usuarioId = :userId', { userId })
      .andWhere('export_log.fechaInicio = :fechaInicio', { fechaInicio: filters.fechaInicio })
      .andWhere('export_log.fechaFin = :fechaFin', { fechaFin: filters.fechaFin })
      .andWhere('export_log.fechaCreacion > :recentTime', {
        recentTime: new Date(Date.now() - 60 * 60 * 1000) // Last hour
      })
      .orderBy('export_log.fechaCreacion', 'DESC')
      .getOne();

    if (recentSimilarExport) {
      warnings.push('Ya existe una exportación similar reciente, considere reutilizarla');
    }

    return {
      isValid: true,
      warnings,
      estimatedRecords,
      estimatedSize,
      dateRange: {
        days: diffDays,
        start: filters.fechaInicio,
        end: filters.fechaFin
      }
    };
  }
}