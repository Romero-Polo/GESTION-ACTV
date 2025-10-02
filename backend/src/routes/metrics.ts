import { Router } from 'express';
import { MetricsController } from '../controllers/MetricsController';
import { authMiddleware } from '../middleware/auth';
import { query, ValidationChain } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { RolUsuario } from '../models/Usuario';

const router = Router();
const metricsController = new MetricsController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Admin-only middleware
const adminOnly = (req: any, res: any, next: any) => {
  if (req.user?.rol !== RolUsuario.ADMINISTRADOR) {
    return res.status(403).json({
      success: false,
      message: 'Acceso restringido a administradores'
    });
  }
  next();
};

// Validation chains
const periodValidation: ValidationChain[] = [
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d'])
    .withMessage('Período debe ser: 7d, 30d, o 90d')
];

const activityMetricsValidation: ValidationChain[] = [
  ...periodValidation,
  query('groupBy')
    .optional()
    .isIn(['hour', 'day', 'week'])
    .withMessage('groupBy debe ser: hour, day, o week')
];

/**
 * @swagger
 * /api/metrics/overview:
 *   get:
 *     summary: Get system overview metrics (Admin only)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System overview metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         inactive:
 *                           type: integer
 *                     works:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         inactive:
 *                           type: integer
 *                     resources:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         inactive:
 *                           type: integer
 *                     activities:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         today:
 *                           type: integer
 *                         thisWeek:
 *                           type: integer
 *                         thisMonth:
 *                           type: integer
 *                         open:
 *                           type: integer
 *                         avgDaily:
 *                           type: number
 *                     integrations:
 *                       type: object
 *                       properties:
 *                         exports:
 *                           type: integer
 *                         syncs:
 *                           type: integer
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                 cached:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get(
  '/overview',
  adminOnly,
  metricsController.getSystemOverview.bind(metricsController)
);

/**
 * @swagger
 * /api/metrics/activities:
 *   get:
 *     summary: Get activity metrics (Admin only)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *         description: Time period for metrics
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [hour, day, week]
 *           default: day
 *         description: Group results by time unit
 *     responses:
 *       200:
 *         description: Activity metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get(
  '/activities',
  adminOnly,
  activityMetricsValidation,
  validateRequest,
  metricsController.getActivityMetrics.bind(metricsController)
);

/**
 * @swagger
 * /api/metrics/performance:
 *   get:
 *     summary: Get system performance metrics (Admin only)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         connected:
 *                           type: boolean
 *                         tables:
 *                           type: array
 *                           items:
 *                             type: object
 *                     cache:
 *                       type: object
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                         connected:
 *                           type: boolean
 *                     api:
 *                       type: object
 *                       properties:
 *                         totalRequests:
 *                           type: integer
 *                         avgResponseTime:
 *                           type: number
 *                         errorRate:
 *                           type: number
 *                     system:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         uptime:
 *                           type: number
 *                         memory:
 *                           type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get(
  '/performance',
  adminOnly,
  metricsController.getPerformanceMetrics.bind(metricsController)
);

/**
 * @swagger
 * /api/metrics/users:
 *   get:
 *     summary: Get user activity metrics (Admin only)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *         description: Time period for user metrics
 *     responses:
 *       200:
 *         description: User metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get(
  '/users',
  adminOnly,
  periodValidation,
  validateRequest,
  metricsController.getUserMetrics.bind(metricsController)
);

/**
 * @swagger
 * /api/metrics/health:
 *   get:
 *     summary: Get system health status
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: System health retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, degraded, unhealthy]
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     services:
 *                       type: object
 *                       properties:
 *                         database:
 *                           type: object
 *                           properties:
 *                             connected:
 *                               type: boolean
 *                             status:
 *                               type: string
 *                         cache:
 *                           type: object
 *                           properties:
 *                             connected:
 *                               type: boolean
 *                             latency:
 *                               type: number
 *                         logger:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                     uptime:
 *                       type: number
 *                       description: Process uptime in seconds
 *                     memory:
 *                       type: object
 *                       properties:
 *                         rss:
 *                           type: integer
 *                         heapTotal:
 *                           type: integer
 *                         heapUsed:
 *                           type: integer
 *                         external:
 *                           type: integer
 *                     version:
 *                       type: string
 *       503:
 *         description: System unhealthy
 */
router.get(
  '/health',
  // No auth required for health check - can be used by load balancers
  metricsController.getSystemHealth.bind(metricsController)
);

export { router as metricsRouter };