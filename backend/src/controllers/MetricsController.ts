import { Request, Response } from 'express';
import { AppDataSource } from '../utils/database';
import { Actividad } from '../models/Actividad';
import { Usuario, RolUsuario } from '../models/Usuario';
import { Obra } from '../models/Obra';
import { Recurso } from '../models/Recurso';
import { ExportLog } from '../models/ExportLog';
import { SyncLog } from '../models/SyncLog';
import { cacheService } from '../services/CacheService';
import { logger, LogCategory, LogLevel } from '../services/LoggerService';
import { Repository, Between } from 'typeorm';

export class MetricsController {
  private actividadRepository: Repository<Actividad>;
  private usuarioRepository: Repository<Usuario>;
  private obraRepository: Repository<Obra>;
  private recursoRepository: Repository<Recurso>;
  private exportLogRepository: Repository<ExportLog>;
  private syncLogRepository: Repository<SyncLog>;

  constructor() {
    this.actividadRepository = AppDataSource.getRepository(Actividad);
    this.usuarioRepository = AppDataSource.getRepository(Usuario);
    this.obraRepository = AppDataSource.getRepository(Obra);
    this.recursoRepository = AppDataSource.getRepository(Recurso);
    this.exportLogRepository = AppDataSource.getRepository(ExportLog);
    this.syncLogRepository = AppDataSource.getRepository(SyncLog);
  }

  /**
   * Get system overview metrics
   * GET /api/metrics/overview
   */
  async getSystemOverview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.rol;

      if (!userId || userRole !== RolUsuario.ADMINISTRADOR) {
        res.status(403).json({
          success: false,
          message: 'Acceso restringido a administradores'
        });
        return;
      }

      // Try to get from cache first
      const cacheKey = 'metrics:overview';
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        res.json({
          success: true,
          data: cachedData,
          cached: true
        });
        return;
      }

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay.getTime() - (startOfDay.getDay() * 24 * 60 * 60 * 1000));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      const [
        totalUsers,
        activeUsers,
        totalObras,
        activeObras,
        totalRecursos,
        activeRecursos,
        totalActivities,
        todayActivities,
        weekActivities,
        monthActivities,
        openActivities,
        avgDailyActivities,
        exportCount,
        syncCount
      ] = await Promise.all([
        this.usuarioRepository.count(),
        this.usuarioRepository.count({ where: { activo: true } }),
        this.obraRepository.count(),
        this.obraRepository.count({ where: { activo: true } }),
        this.recursoRepository.count(),
        this.recursoRepository.count({ where: { activo: true } }),
        this.actividadRepository.count(),
        this.actividadRepository.count({
          where: {
            fechaInicio: startOfDay.toISOString().split('T')[0]
          }
        }),
        this.actividadRepository.count({
          where: {
            fechaInicio: Between(startOfWeek.toISOString().split('T')[0], now.toISOString().split('T')[0])
          }
        }),
        this.actividadRepository.count({
          where: {
            fechaInicio: Between(startOfMonth.toISOString().split('T')[0], now.toISOString().split('T')[0])
          }
        }),
        this.actividadRepository.count({
          where: {
            fechaFin: null
          }
        }),
        this.calculateAvgDailyActivities(),
        this.exportLogRepository.count(),
        this.syncLogRepository.count()
      ]);

      const overview = {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        works: {
          total: totalObras,
          active: activeObras,
          inactive: totalObras - activeObras
        },
        resources: {
          total: totalRecursos,
          active: activeRecursos,
          inactive: totalRecursos - activeRecursos
        },
        activities: {
          total: totalActivities,
          today: todayActivities,
          thisWeek: weekActivities,
          thisMonth: monthActivities,
          open: openActivities,
          avgDaily: avgDailyActivities
        },
        integrations: {
          exports: exportCount,
          syncs: syncCount
        },
        timestamp: new Date().toISOString()
      };

      // Cache for 5 minutes
      await cacheService.set(cacheKey, overview, 300);

      logger.logAPI('System overview metrics accessed', LogLevel.INFO, {
        userId,
        clientIp: req.ip
      });

      res.json({
        success: true,
        data: overview
      });

    } catch (error: any) {
      logger.error('Error getting system overview', error, LogCategory.API, {
        userId: req.user?.id,
        clientIp: req.ip
      });

      res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas del sistema',
        error: error.message
      });
    }
  }

  /**
   * Get activity metrics
   * GET /api/metrics/activities
   */
  async getActivityMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.rol;

      if (!userId || userRole !== RolUsuario.ADMINISTRADOR) {
        res.status(403).json({
          success: false,
          message: 'Acceso restringido a administradores'
        });
        return;
      }

      const { period = '30d', groupBy = 'day' } = req.query;

      const cacheKey = `metrics:activities:${period}:${groupBy}`;
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        res.json({
          success: true,
          data: cachedData,
          cached: true
        });
        return;
      }

      const { startDate, endDate } = this.getDateRange(period as string);

      // Get activity trends
      const activityTrends = await this.getActivityTrends(startDate, endDate, groupBy as string);

      // Get resource utilization
      const resourceUtilization = await this.getResourceUtilization(startDate, endDate);

      // Get work distribution
      const workDistribution = await this.getWorkDistribution(startDate, endDate);

      // Get hourly patterns
      const hourlyPatterns = await this.getHourlyPatterns(startDate, endDate);

      const metrics = {
        period: { start: startDate, end: endDate },
        trends: activityTrends,
        resourceUtilization,
        workDistribution,
        hourlyPatterns,
        timestamp: new Date().toISOString()
      };

      // Cache for 10 minutes
      await cacheService.set(cacheKey, metrics, 600);

      res.json({
        success: true,
        data: metrics
      });

    } catch (error: any) {
      logger.error('Error getting activity metrics', error, LogCategory.API, {
        userId: req.user?.id,
        clientIp: req.ip
      });

      res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas de actividades',
        error: error.message
      });
    }
  }

  /**
   * Get performance metrics
   * GET /api/metrics/performance
   */
  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.rol;

      if (!userId || userRole !== RolUsuario.ADMINISTRADOR) {
        res.status(403).json({
          success: false,
          message: 'Acceso restringido a administradores'
        });
        return;
      }

      // Get database metrics
      const dbMetrics = await this.getDatabaseMetrics();

      // Get cache metrics
      const cacheMetrics = await cacheService.getStats();

      // Get API performance metrics (would be collected by monitoring)
      const apiMetrics = await this.getAPIMetrics();

      // System health
      const systemHealth = await this.getSystemHealth();

      const performance = {
        database: dbMetrics,
        cache: cacheMetrics,
        api: apiMetrics,
        system: systemHealth,
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: performance
      });

    } catch (error: any) {
      logger.error('Error getting performance metrics', error, LogCategory.API, {
        userId: req.user?.id,
        clientIp: req.ip
      });

      res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas de performance',
        error: error.message
      });
    }
  }

  /**
   * Get user activity metrics
   * GET /api/metrics/users
   */
  async getUserMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.rol;

      if (!userId || userRole !== RolUsuario.ADMINISTRADOR) {
        res.status(403).json({
          success: false,
          message: 'Acceso restringido a administradores'
        });
        return;
      }

      const { period = '30d' } = req.query;
      const cacheKey = `metrics:users:${period}`;
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        res.json({
          success: true,
          data: cachedData,
          cached: true
        });
        return;
      }

      const { startDate, endDate } = this.getDateRange(period as string);

      // User activity stats
      const userStats = await this.getUserActivityStats(startDate, endDate);

      // Role distribution
      const roleStats = await this.getRoleStats();

      // Most active users
      const topUsers = await this.getTopActiveUsers(startDate, endDate);

      const metrics = {
        period: { start: startDate, end: endDate },
        userStats,
        roleStats,
        topUsers,
        timestamp: new Date().toISOString()
      };

      // Cache for 15 minutes
      await cacheService.set(cacheKey, metrics, 900);

      res.json({
        success: true,
        data: metrics
      });

    } catch (error: any) {
      logger.error('Error getting user metrics', error, LogCategory.API, {
        userId: req.user?.id,
        clientIp: req.ip
      });

      res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas de usuarios',
        error: error.message
      });
    }
  }

  /**
   * Get system health check
   * GET /api/metrics/health
   */
  async getSystemHealth(req?: Request, res?: Response): Promise<any> {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: await this.checkDatabaseHealth(),
          cache: await cacheService.healthCheck(),
          logger: logger.healthCheck()
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      };

      // Determine overall health
      const hasUnhealthyService = Object.values(health.services).some(
        (service: any) => service.connected === false || service.status === 'unhealthy'
      );

      if (hasUnhealthyService) {
        health.status = 'degraded';
      }

      if (res) {
        res.json({
          success: true,
          data: health
        });
      }

      return health;

    } catch (error: any) {
      const unhealthyResponse = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };

      if (res) {
        res.status(503).json({
          success: false,
          data: unhealthyResponse
        });
      }

      return unhealthyResponse;
    }
  }

  // Helper methods
  private async calculateAvgDailyActivities(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const count = await this.actividadRepository.count({
      where: {
        fechaInicio: Between(thirtyDaysAgo.toISOString().split('T')[0], new Date().toISOString().split('T')[0])
      }
    });
    return Math.round((count / 30) * 10) / 10;
  }

  private getDateRange(period: string): { startDate: string; endDate: string } {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    };
  }

  private async getActivityTrends(startDate: string, endDate: string, groupBy: string): Promise<any[]> {
    // This would implement activity trend analysis
    // For now, return mock data
    return [];
  }

  private async getResourceUtilization(startDate: string, endDate: string): Promise<any> {
    const result = await this.actividadRepository
      .createQueryBuilder('actividad')
      .innerJoin('actividad.recurso', 'recurso')
      .select([
        'recurso.tipo as tipo',
        'COUNT(actividad.id) as actividades',
        'SUM(CASE WHEN actividad.fechaFin IS NULL THEN 8 ELSE DATEDIFF(hour, CONCAT(actividad.fechaInicio, \' \', actividad.horaInicio), CONCAT(COALESCE(actividad.fechaFin, actividad.fechaInicio), \' \', COALESCE(actividad.horaFin, \'23:59\'))) END) as totalHoras'
      ])
      .where('actividad.fechaInicio BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('recurso.tipo')
      .getRawMany();

    return result;
  }

  private async getWorkDistribution(startDate: string, endDate: string): Promise<any> {
    const result = await this.actividadRepository
      .createQueryBuilder('actividad')
      .innerJoin('actividad.obra', 'obra')
      .select([
        'obra.descripcion as obra',
        'COUNT(actividad.id) as actividades'
      ])
      .where('actividad.fechaInicio BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('obra.id, obra.descripcion')
      .orderBy('COUNT(actividad.id)', 'DESC')
      .limit(10)
      .getRawMany();

    return result;
  }

  private async getHourlyPatterns(startDate: string, endDate: string): Promise<any> {
    // Implementation would analyze hourly activity patterns
    return {};
  }

  private async getDatabaseMetrics(): Promise<any> {
    try {
      // Get table sizes and row counts
      const result = await AppDataSource.query(`
        SELECT
          TABLE_NAME,
          TABLE_ROWS,
          ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS 'Size_MB'
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY Size_MB DESC
      `);

      return {
        tables: result,
        connected: true
      };
    } catch (error) {
      return {
        connected: false,
        error: (error as Error).message
      };
    }
  }

  private async getAPIMetrics(): Promise<any> {
    // This would collect API performance metrics
    // For now, return basic info
    return {
      totalRequests: 0,
      avgResponseTime: 0,
      errorRate: 0
    };
  }

  private async getUserActivityStats(startDate: string, endDate: string): Promise<any> {
    const activeUsers = await this.actividadRepository
      .createQueryBuilder('actividad')
      .innerJoin('actividad.usuarioCreacion', 'usuario')
      .select([
        'usuario.id as userId',
        'usuario.nombre as nombre',
        'COUNT(actividad.id) as actividades'
      ])
      .where('actividad.fechaInicio BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('usuario.id, usuario.nombre')
      .getRawMany();

    return {
      totalActiveUsers: activeUsers.length,
      avgActivitiesPerUser: activeUsers.length > 0
        ? Math.round(activeUsers.reduce((sum, user) => sum + user.actividades, 0) / activeUsers.length)
        : 0
    };
  }

  private async getRoleStats(): Promise<any> {
    const roleStats = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .select([
        'usuario.rol as rol',
        'COUNT(usuario.id) as count'
      ])
      .where('usuario.activo = :activo', { activo: true })
      .groupBy('usuario.rol')
      .getRawMany();

    return roleStats;
  }

  private async getTopActiveUsers(startDate: string, endDate: string): Promise<any> {
    const topUsers = await this.actividadRepository
      .createQueryBuilder('actividad')
      .innerJoin('actividad.usuarioCreacion', 'usuario')
      .select([
        'usuario.nombre as nombre',
        'usuario.rol as rol',
        'COUNT(actividad.id) as actividades'
      ])
      .where('actividad.fechaInicio BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('usuario.id, usuario.nombre, usuario.rol')
      .orderBy('COUNT(actividad.id)', 'DESC')
      .limit(10)
      .getRawMany();

    return topUsers;
  }

  private async checkDatabaseHealth(): Promise<any> {
    try {
      await AppDataSource.query('SELECT 1');
      return {
        connected: true,
        status: 'healthy'
      };
    } catch (error) {
      return {
        connected: false,
        status: 'unhealthy',
        error: (error as Error).message
      };
    }
  }
}