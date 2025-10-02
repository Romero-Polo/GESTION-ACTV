import crypto from 'crypto';
import { Repository, DataSource } from 'typeorm';
import { SyncLog, SyncType, SyncStatus } from '../models/SyncLog';
import { ObrasSyncService } from './ObrasSyncService';
import { RecursosSyncService } from './RecursosSyncService';

export interface WebhookPayload {
  entityType: 'obra' | 'recurso';
  entityId: string;
  action: 'created' | 'updated' | 'deleted';
  data?: any;
  timestamp: string;
  signature?: string;
}

export interface WebhookProcessResult {
  success: boolean;
  message: string;
  processed: boolean;
  syncLogId?: number;
}

export class WebhookService {
  private dataSource: DataSource;
  private syncLogRepository: Repository<SyncLog>;
  private obrasSyncService: ObrasSyncService;
  private recursosSyncService: RecursosSyncService;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.syncLogRepository = dataSource.getRepository(SyncLog);
    this.obrasSyncService = new ObrasSyncService(dataSource);
    this.recursosSyncService = new RecursosSyncService(dataSource);
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(payload: WebhookPayload, signature?: string): Promise<WebhookProcessResult> {
    // Create webhook log entry
    const syncLog = new SyncLog({
      syncType: SyncType.WEBHOOK,
      status: SyncStatus.PENDING,
      triggeredBy: 'webhook',
      details: {
        entityType: payload.entityType,
        entityId: payload.entityId,
        action: payload.action,
        timestamp: payload.timestamp
      }
    });

    let savedSyncLog: SyncLog;
    try {
      savedSyncLog = await this.syncLogRepository.save(syncLog);
      savedSyncLog.start();
      await this.syncLogRepository.save(savedSyncLog);
    } catch (error) {
      console.error('Error creating webhook log:', error);
      return {
        success: false,
        message: 'Failed to initialize webhook processing',
        processed: false
      };
    }

    try {
      // Validate webhook signature if secret is configured
      if (!this.validateSignature(payload, signature)) {
        savedSyncLog.finish(SyncStatus.ERROR, 'Invalid webhook signature');
        await this.syncLogRepository.save(savedSyncLog);
        return {
          success: false,
          message: 'Invalid webhook signature',
          processed: false,
          syncLogId: savedSyncLog.id
        };
      }

      // Validate payload
      const validationError = this.validatePayload(payload);
      if (validationError) {
        savedSyncLog.finish(SyncStatus.ERROR, validationError);
        await this.syncLogRepository.save(savedSyncLog);
        return {
          success: false,
          message: validationError,
          processed: false,
          syncLogId: savedSyncLog.id
        };
      }

      // Process the webhook based on entity type and action
      const result = await this.processWebhookAction(payload, savedSyncLog);

      // Update sync log
      savedSyncLog.finish(
        result.success ? SyncStatus.SUCCESS : SyncStatus.ERROR,
        result.message
      );
      savedSyncLog.details = {
        ...savedSyncLog.details,
        result: result
      };
      await this.syncLogRepository.save(savedSyncLog);

      return {
        success: result.success,
        message: result.message,
        processed: result.processed,
        syncLogId: savedSyncLog.id
      };

    } catch (error: any) {
      console.error('Webhook processing error:', error);

      savedSyncLog.finish(SyncStatus.ERROR, `Processing failed: ${error.message}`);
      savedSyncLog.details = {
        ...savedSyncLog.details,
        error: error.message,
        stack: error.stack
      };
      await this.syncLogRepository.save(savedSyncLog);

      return {
        success: false,
        message: `Processing failed: ${error.message}`,
        processed: false,
        syncLogId: savedSyncLog.id
      };
    }
  }

  /**
   * Process webhook action
   */
  private async processWebhookAction(payload: WebhookPayload, syncLog: SyncLog): Promise<{
    success: boolean;
    message: string;
    processed: boolean;
  }> {
    const { entityType, action } = payload;

    switch (entityType) {
      case 'obra':
        return await this.processObraWebhook(payload, syncLog);
      case 'recurso':
        return await this.processRecursoWebhook(payload, syncLog);
      default:
        return {
          success: false,
          message: `Unsupported entity type: ${entityType}`,
          processed: false
        };
    }
  }

  /**
   * Process obra webhook
   */
  private async processObraWebhook(payload: WebhookPayload, syncLog: SyncLog): Promise<{
    success: boolean;
    message: string;
    processed: boolean;
  }> {
    const { action, entityId, data } = payload;

    console.log(`Processing obra webhook: ${action} for entity ${entityId}`);

    switch (action) {
      case 'created':
      case 'updated':
        // For create/update, we could trigger a partial sync or handle the data directly
        // For now, let's trigger a full obras sync to be safe
        try {
          const syncResult = await this.obrasSyncService.syncObras('webhook');
          syncLog.addProcessedRecord(
            syncResult.recordsCreated > 0 ? 'created' :
            syncResult.recordsUpdated > 0 ? 'updated' : 'skipped'
          );

          return {
            success: syncResult.success,
            message: `Obra ${action} processed via full sync`,
            processed: syncResult.recordsProcessed > 0
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Failed to sync obras: ${error.message}`,
            processed: false
          };
        }

      case 'deleted':
        // For deletions, we might want to mark the local record as inactive
        // This would require implementing a soft delete mechanism
        console.log(`Obra deletion webhook received for ${entityId} - manual review may be required`);
        return {
          success: true,
          message: `Obra deletion noted for ${entityId} - manual review recommended`,
          processed: true
        };

      default:
        return {
          success: false,
          message: `Unsupported obra action: ${action}`,
          processed: false
        };
    }
  }

  /**
   * Process recurso webhook
   */
  private async processRecursoWebhook(payload: WebhookPayload, syncLog: SyncLog): Promise<{
    success: boolean;
    message: string;
    processed: boolean;
  }> {
    const { action, entityId, data } = payload;

    console.log(`Processing recurso webhook: ${action} for entity ${entityId}`);

    switch (action) {
      case 'created':
      case 'updated':
        // For create/update, trigger a full recursos sync
        try {
          const syncResult = await this.recursosSyncService.syncRecursos('webhook');
          syncLog.addProcessedRecord(
            syncResult.recordsCreated > 0 ? 'created' :
            syncResult.recordsUpdated > 0 ? 'updated' : 'skipped'
          );

          return {
            success: syncResult.success,
            message: `Recurso ${action} processed via full sync`,
            processed: syncResult.recordsProcessed > 0
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Failed to sync recursos: ${error.message}`,
            processed: false
          };
        }

      case 'deleted':
        // For deletions, note for manual review
        console.log(`Recurso deletion webhook received for ${entityId} - manual review may be required`);
        return {
          success: true,
          message: `Recurso deletion noted for ${entityId} - manual review recommended`,
          processed: true
        };

      default:
        return {
          success: false,
          message: `Unsupported recurso action: ${action}`,
          processed: false
        };
    }
  }

  /**
   * Validate webhook signature
   */
  private validateSignature(payload: WebhookPayload, signature?: string): boolean {
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

    // If no secret is configured, skip validation
    if (!webhookSecret) {
      console.warn('N8N_WEBHOOK_SECRET not configured - webhook signature validation skipped');
      return true;
    }

    // If signature is not provided but secret is configured, reject
    if (!signature) {
      console.error('Webhook signature missing but secret is configured');
      return false;
    }

    try {
      // Create expected signature
      const payloadString = JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadString)
        .digest('hex');

      // Compare signatures
      const providedSignature = signature.replace('sha256=', '');
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );

      if (!isValid) {
        console.error('Webhook signature validation failed');
      }

      return isValid;
    } catch (error) {
      console.error('Error validating webhook signature:', error);
      return false;
    }
  }

  /**
   * Validate webhook payload
   */
  private validatePayload(payload: WebhookPayload): string | null {
    if (!payload.entityType) {
      return 'Missing entityType';
    }

    if (!['obra', 'recurso'].includes(payload.entityType)) {
      return `Invalid entityType: ${payload.entityType}`;
    }

    if (!payload.entityId) {
      return 'Missing entityId';
    }

    if (!payload.action) {
      return 'Missing action';
    }

    if (!['created', 'updated', 'deleted'].includes(payload.action)) {
      return `Invalid action: ${payload.action}`;
    }

    if (!payload.timestamp) {
      return 'Missing timestamp';
    }

    // Validate timestamp is not too old (prevent replay attacks)
    const payloadTime = new Date(payload.timestamp);
    const now = new Date();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (now.getTime() - payloadTime.getTime() > maxAge) {
      return 'Webhook payload is too old';
    }

    return null;
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(): Promise<{
    totalWebhooks: number;
    successfulWebhooks: number;
    failedWebhooks: number;
    recentWebhooks: SyncLog[];
  }> {
    const [totalWebhooks, successfulWebhooks, failedWebhooks, recentWebhooks] = await Promise.all([
      this.syncLogRepository.count({ where: { syncType: SyncType.WEBHOOK } }),
      this.syncLogRepository.count({
        where: { syncType: SyncType.WEBHOOK, status: SyncStatus.SUCCESS }
      }),
      this.syncLogRepository.count({
        where: { syncType: SyncType.WEBHOOK, status: SyncStatus.ERROR }
      }),
      this.syncLogRepository.find({
        where: { syncType: SyncType.WEBHOOK },
        order: { createdAt: 'DESC' },
        take: 10
      })
    ]);

    return {
      totalWebhooks,
      successfulWebhooks,
      failedWebhooks,
      recentWebhooks
    };
  }
}