import { DataSource, Repository } from 'typeorm';
import { WebhookService, WebhookPayload } from '../../services/WebhookService';
import { SyncLog, SyncType, SyncStatus } from '../../models/SyncLog';
import { ObrasSyncService } from '../../services/ObrasSyncService';
import { RecursosSyncService } from '../../services/RecursosSyncService';

// Mock dependencies
jest.mock('../../services/ObrasSyncService');
jest.mock('../../services/RecursosSyncService');

describe('WebhookService', () => {
  let webhookService: WebhookService;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockSyncLogRepo: jest.Mocked<Repository<SyncLog>>;
  let mockObrasSyncService: jest.Mocked<ObrasSyncService>;
  let mockRecursosSyncService: jest.Mocked<RecursosSyncService>;

  beforeEach(() => {
    mockSyncLogRepo = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      findAndCount: jest.fn(),
    } as any;

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockSyncLogRepo),
    } as any;

    mockObrasSyncService = {
      syncObras: jest.fn(),
    } as any;

    mockRecursosSyncService = {
      syncRecursos: jest.fn(),
    } as any;

    webhookService = new WebhookService(mockDataSource);
    (webhookService as any).obrasSyncService = mockObrasSyncService;
    (webhookService as any).recursosSyncService = mockRecursosSyncService;

    // Reset environment variables
    delete process.env.N8N_WEBHOOK_SECRET;
  });

  describe('processWebhook', () => {
    const validPayload: WebhookPayload = {
      entityType: 'obra',
      entityId: 'OB001',
      action: 'updated',
      timestamp: new Date().toISOString()
    };

    beforeEach(() => {
      const mockSyncLog = new SyncLog({
        syncType: SyncType.WEBHOOK,
        status: SyncStatus.PENDING,
        triggeredBy: 'webhook'
      });
      mockSyncLog.id = 1;
      mockSyncLog.start = jest.fn();
      mockSyncLog.finish = jest.fn();
      mockSyncLog.addProcessedRecord = jest.fn();

      mockSyncLogRepo.save.mockResolvedValue(mockSyncLog);
    });

    it('should process valid obra webhook successfully', async () => {
      mockObrasSyncService.syncObras.mockResolvedValue({
        success: true,
        syncLogId: 1,
        recordsProcessed: 5,
        recordsCreated: 1,
        recordsUpdated: 4,
        recordsSkipped: 0,
        recordsErrored: 0,
        errors: []
      });

      const result = await webhookService.processWebhook(validPayload);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(mockObrasSyncService.syncObras).toHaveBeenCalledWith('webhook');
    });

    it('should process valid recurso webhook successfully', async () => {
      const recursoPayload: WebhookPayload = {
        ...validPayload,
        entityType: 'recurso',
        entityId: 'OP001'
      };

      mockRecursosSyncService.syncRecursos.mockResolvedValue({
        success: true,
        syncLogId: 1,
        recordsProcessed: 3,
        recordsCreated: 0,
        recordsUpdated: 3,
        recordsSkipped: 0,
        recordsErrored: 0,
        errors: []
      });

      const result = await webhookService.processWebhook(recursoPayload);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(mockRecursosSyncService.syncRecursos).toHaveBeenCalledWith('webhook');
    });

    it('should handle deletion webhooks', async () => {
      const deletionPayload: WebhookPayload = {
        ...validPayload,
        action: 'deleted'
      };

      const result = await webhookService.processWebhook(deletionPayload);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(result.message).toContain('manual review recommended');
    });

    it('should reject invalid entity type', async () => {
      const invalidPayload: WebhookPayload = {
        ...validPayload,
        entityType: 'invalid' as any
      };

      const result = await webhookService.processWebhook(invalidPayload);

      expect(result.success).toBe(false);
      expect(result.processed).toBe(false);
      expect(result.message).toContain('Invalid entityType');
    });

    it('should reject missing required fields', async () => {
      const invalidPayload: WebhookPayload = {
        ...validPayload,
        entityId: ''
      };

      const result = await webhookService.processWebhook(invalidPayload);

      expect(result.success).toBe(false);
      expect(result.processed).toBe(false);
      expect(result.message).toContain('Missing entityId');
    });

    it('should reject old timestamps', async () => {
      const oldPayload: WebhookPayload = {
        ...validPayload,
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 minutes ago
      };

      const result = await webhookService.processWebhook(oldPayload);

      expect(result.success).toBe(false);
      expect(result.processed).toBe(false);
      expect(result.message).toContain('too old');
    });
  });

  describe('validateSignature', () => {
    const validPayload: WebhookPayload = {
      entityType: 'obra',
      entityId: 'OB001',
      action: 'updated',
      timestamp: new Date().toISOString()
    };

    it('should pass validation when no secret configured', async () => {
      const result = await webhookService.processWebhook(validPayload);
      expect(result.success).toBe(true); // Should not fail due to signature
    });

    it('should fail when secret configured but signature missing', async () => {
      process.env.N8N_WEBHOOK_SECRET = 'test-secret';

      const result = await webhookService.processWebhook(validPayload);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid webhook signature');
    });

    it('should validate correct signature', async () => {
      process.env.N8N_WEBHOOK_SECRET = 'test-secret';

      const crypto = require('crypto');
      const payloadString = JSON.stringify(validPayload);
      const signature = crypto
        .createHmac('sha256', 'test-secret')
        .update(payloadString)
        .digest('hex');

      mockObrasSyncService.syncObras.mockResolvedValue({
        success: true,
        syncLogId: 1,
        recordsProcessed: 1,
        recordsCreated: 1,
        recordsUpdated: 0,
        recordsSkipped: 0,
        recordsErrored: 0,
        errors: []
      });

      const result = await webhookService.processWebhook(validPayload, `sha256=${signature}`);

      expect(result.success).toBe(true);
    });

    it('should reject incorrect signature', async () => {
      process.env.N8N_WEBHOOK_SECRET = 'test-secret';

      const result = await webhookService.processWebhook(validPayload, 'sha256=invalid');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid webhook signature');
    });
  });

  describe('error handling', () => {
    const validPayload: WebhookPayload = {
      entityType: 'obra',
      entityId: 'OB001',
      action: 'updated',
      timestamp: new Date().toISOString()
    };

    it('should handle sync service failures', async () => {
      mockObrasSyncService.syncObras.mockRejectedValue(new Error('Sync failed'));

      const result = await webhookService.processWebhook(validPayload);

      expect(result.success).toBe(false);
      expect(result.processed).toBe(false);
      expect(result.message).toContain('Failed to sync obras');
    });

    it('should handle database errors', async () => {
      mockSyncLogRepo.save.mockRejectedValue(new Error('Database error'));

      const result = await webhookService.processWebhook(validPayload);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to initialize webhook processing');
    });
  });

  describe('getWebhookStats', () => {
    it('should return webhook statistics', async () => {
      const mockRecentWebhooks = [
        { id: 1, syncType: SyncType.WEBHOOK, status: SyncStatus.SUCCESS },
        { id: 2, syncType: SyncType.WEBHOOK, status: SyncStatus.ERROR }
      ];

      mockSyncLogRepo.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8)  // successful
        .mockResolvedValueOnce(2); // failed

      mockSyncLogRepo.find.mockResolvedValue(mockRecentWebhooks as any);

      const stats = await webhookService.getWebhookStats();

      expect(stats).toEqual({
        totalWebhooks: 10,
        successfulWebhooks: 8,
        failedWebhooks: 2,
        recentWebhooks: mockRecentWebhooks
      });
    });
  });
});