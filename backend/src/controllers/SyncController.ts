import { Request, Response } from 'express';
import { AppDataSource } from '../utils/database';
import { getSyncJobScheduler } from '../services/SyncJobScheduler';
import { WebhookService, WebhookPayload } from '../services/WebhookService';
import { getN8nClient } from '../services/N8nClient';
import { SyncLog, SyncType } from '../models/SyncLog';

export class SyncController {
  private webhookService: WebhookService;

  constructor() {
    this.webhookService = new WebhookService(AppDataSource);
  }

  /**
   * Test n8n connection
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const n8nClient = getN8nClient();
      const result = await n8nClient.testConnection();

      res.json({
        success: result.success,
        message: result.success ? 'Connection successful' : 'Connection failed',
        data: result.data,
        error: result.error,
        timestamp: result.timestamp
      });
    } catch (error: any) {
      console.error('Test connection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test connection',
        error: error.message
      });
    }
  }

  /**
   * Manually trigger obras synchronization
   */
  async syncObras(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const scheduler = getSyncJobScheduler();
      const result = await scheduler.triggerObrasSync(userId);

      res.json({
        success: result.success,
        message: result.success ? 'Obras synchronization completed' : 'Obras synchronization failed',
        syncLogId: result.syncLogId,
        stats: {
          recordsProcessed: result.recordsProcessed,
          recordsCreated: result.recordsCreated,
          recordsUpdated: result.recordsUpdated,
          recordsSkipped: result.recordsSkipped,
          recordsErrored: result.recordsErrored
        },
        errors: result.errors
      });
    } catch (error: any) {
      console.error('Manual obras sync error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger obras synchronization',
        error: error.message
      });
    }
  }

  /**
   * Manually trigger recursos synchronization
   */
  async syncRecursos(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const scheduler = getSyncJobScheduler();
      const result = await scheduler.triggerRecursosSync(userId);

      res.json({
        success: result.success,
        message: result.success ? 'Recursos synchronization completed' : 'Recursos synchronization failed',
        syncLogId: result.syncLogId,
        stats: {
          recordsProcessed: result.recordsProcessed,
          recordsCreated: result.recordsCreated,
          recordsUpdated: result.recordsUpdated,
          recordsSkipped: result.recordsSkipped,
          recordsErrored: result.recordsErrored
        },
        errors: result.errors
      });
    } catch (error: any) {
      console.error('Manual recursos sync error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger recursos synchronization',
        error: error.message
      });
    }
  }

  /**
   * Get synchronization statistics
   */
  async getSyncStats(req: Request, res: Response): Promise<void> {
    try {
      const scheduler = getSyncJobScheduler();
      const [syncStats, tasksStatus, webhookStats] = await Promise.all([
        scheduler.getSyncStatistics(),
        scheduler.getTasksStatus(),
        this.webhookService.getWebhookStats()
      ]);

      res.json({
        success: true,
        data: {
          obras: syncStats.obras,
          recursos: syncStats.recursos,
          webhooks: webhookStats,
          scheduledTasks: tasksStatus,
          enabled: {
            sync: process.env.SYNC_ENABLED === 'true',
            obras: process.env.SYNC_OBRAS_ENABLED === 'true',
            recursos: process.env.SYNC_RECURSOS_ENABLED === 'true'
          },
          schedules: {
            obras: process.env.SYNC_OBRAS_CRON,
            recursos: process.env.SYNC_RECURSOS_CRON
          }
        }
      });
    } catch (error: any) {
      console.error('Get sync stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get synchronization statistics',
        error: error.message
      });
    }
  }

  /**
   * Get synchronization logs
   */
  async getSyncLogs(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const syncType = req.query.syncType as string;

      const syncLogRepository = AppDataSource.getRepository(SyncLog);

      const where: any = {};
      if (syncType && Object.values(SyncType).includes(syncType as SyncType)) {
        where.syncType = syncType;
      }

      const [logs, total] = await syncLogRepository.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit
      });

      res.json({
        success: true,
        data: {
          logs,
          total,
          page,
          totalPages: Math.ceil(total / limit),
          limit
        }
      });
    } catch (error: any) {
      console.error('Get sync logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get synchronization logs',
        error: error.message
      });
    }
  }

  /**
   * Process incoming webhook
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as WebhookPayload;
      const signature = req.headers['x-n8n-signature'] as string;

      console.log('Received webhook:', {
        entityType: payload.entityType,
        entityId: payload.entityId,
        action: payload.action,
        hasSignature: !!signature
      });

      const result = await this.webhookService.processWebhook(payload, signature);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json({
        success: result.success,
        message: result.message,
        processed: result.processed,
        syncLogId: result.syncLogId
      });
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error processing webhook',
        processed: false
      });
    }
  }

  /**
   * Update sync schedule
   */
  async updateSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { taskName, cronExpression } = req.body;

      if (!taskName || !cronExpression) {
        res.status(400).json({
          success: false,
          message: 'taskName and cronExpression are required'
        });
        return;
      }

      const scheduler = getSyncJobScheduler();
      const updated = scheduler.updateTaskSchedule(taskName, cronExpression);

      if (updated) {
        // Also update environment variable for persistence
        if (taskName === 'obras-sync') {
          process.env.SYNC_OBRAS_CRON = cronExpression;
        } else if (taskName === 'recursos-sync') {
          process.env.SYNC_RECURSOS_CRON = cronExpression;
        }

        res.json({
          success: true,
          message: `Schedule updated for ${taskName}`,
          newSchedule: cronExpression
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to update schedule'
        });
      }
    } catch (error: any) {
      console.error('Update schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update schedule',
        error: error.message
      });
    }
  }

  /**
   * Start/stop sync tasks
   */
  async controlTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskName, action } = req.body;

      if (!taskName || !action) {
        res.status(400).json({
          success: false,
          message: 'taskName and action are required'
        });
        return;
      }

      if (!['start', 'stop'].includes(action)) {
        res.status(400).json({
          success: false,
          message: 'action must be "start" or "stop"'
        });
        return;
      }

      const scheduler = getSyncJobScheduler();
      const result = action === 'start'
        ? scheduler.startTask(taskName)
        : scheduler.stopTask(taskName);

      res.json({
        success: result,
        message: result
          ? `Task ${taskName} ${action}ed successfully`
          : `Failed to ${action} task ${taskName}`
      });
    } catch (error: any) {
      console.error('Control task error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to control task',
        error: error.message
      });
    }
  }
}