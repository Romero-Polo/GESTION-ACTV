import { Router } from 'express';
import { SyncController } from '../controllers/SyncController';
import { auth, requireRoles } from '../middleware/auth';
import { RolUsuario } from '../models/Usuario';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();
const syncController = new SyncController();

// Webhook endpoint (no authentication required - uses signature validation)
router.post('/webhook',
  body('entityType').isIn(['obra', 'recurso']),
  body('entityId').notEmpty(),
  body('action').isIn(['created', 'updated', 'deleted']),
  body('timestamp').isISO8601(),
  validate,
  syncController.handleWebhook.bind(syncController)
);

// All other routes require authentication and admin/tecnico roles
router.use(auth);
router.use(requireRoles([RolUsuario.ADMINISTRADOR, RolUsuario.TECNICO_TRANSPORTE]));

// Test n8n connection
router.get('/test-connection',
  syncController.testConnection.bind(syncController)
);

// Manual synchronization triggers
router.post('/obras',
  syncController.syncObras.bind(syncController)
);

router.post('/recursos',
  syncController.syncRecursos.bind(syncController)
);

// Get sync statistics and status
router.get('/stats',
  syncController.getSyncStats.bind(syncController)
);

// Get synchronization logs
router.get('/logs',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('syncType').optional().isIn(['obras', 'recursos', 'webhook']),
  validate,
  syncController.getSyncLogs.bind(syncController)
);

// Update sync schedules (admin only)
router.put('/schedule',
  requireRoles([RolUsuario.ADMINISTRADOR]),
  body('taskName').isIn(['obras-sync', 'recursos-sync']),
  body('cronExpression').notEmpty(),
  validate,
  syncController.updateSchedule.bind(syncController)
);

// Control sync tasks (start/stop)
router.put('/task-control',
  requireRoles([RolUsuario.ADMINISTRADOR]),
  body('taskName').isIn(['obras-sync', 'recursos-sync']),
  body('action').isIn(['start', 'stop']),
  validate,
  syncController.controlTask.bind(syncController)
);

export default router;