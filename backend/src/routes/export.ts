import { Router } from 'express';
import { ExportController } from '../controllers/ExportController';
import { authMiddleware } from '../middleware/auth';
import { exportRateLimit, previewRateLimit } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validation';
import {
  exportERPValidation,
  exportPreviewValidation,
  getExportLogsValidation,
  exportLogIdValidation
} from '../validators/exportValidation';
import { RolUsuario } from '../models/Usuario';

const router = Router();
const exportController = new ExportController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/export/erp:
 *   post:
 *     summary: Export activities to ERP format
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fechaInicio
 *               - fechaFin
 *             properties:
 *               fechaInicio:
 *                 type: string
 *                 format: date
 *                 description: Start date in YYYY-MM-DD format
 *                 example: "2024-01-01"
 *               fechaFin:
 *                 type: string
 *                 format: date
 *                 description: End date in YYYY-MM-DD format
 *                 example: "2024-01-31"
 *               empresa:
 *                 type: string
 *                 maxLength: 200
 *                 description: Company filter
 *                 example: "Constructora ABC"
 *               tipoRecurso:
 *                 type: string
 *                 enum: [operario, maquina]
 *                 description: Resource type filter
 *               obraIds:
 *                 oneOf:
 *                   - type: integer
 *                   - type: array
 *                     items:
 *                       type: integer
 *                 description: Work IDs to filter by
 *               recursoIds:
 *                 oneOf:
 *                   - type: integer
 *                   - type: array
 *                     items:
 *                       type: integer
 *                 description: Resource IDs to filter by
 *               format:
 *                 type: string
 *                 enum: [json, csv, xml]
 *                 default: json
 *                 description: Export format
 *     responses:
 *       200:
 *         description: Export completed successfully
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post(
  '/erp',
  exportRateLimit,
  exportERPValidation,
  validateRequest,
  exportController.exportToERP.bind(exportController)
);

/**
 * @swagger
 * /api/export/preview:
 *   post:
 *     summary: Get preview of export data
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fechaInicio
 *               - fechaFin
 *             properties:
 *               fechaInicio:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *               fechaFin:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-31"
 *               empresa:
 *                 type: string
 *                 maxLength: 200
 *               tipoRecurso:
 *                 type: string
 *                 enum: [operario, maquina]
 *               obraIds:
 *                 oneOf:
 *                   - type: integer
 *                   - type: array
 *                     items:
 *                       type: integer
 *               recursoIds:
 *                 oneOf:
 *                   - type: integer
 *                   - type: array
 *                     items:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Preview generated successfully
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
 *                     totalRecords:
 *                       type: integer
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                         end:
 *                           type: string
 *                         days:
 *                           type: integer
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalHours:
 *                           type: number
 *                         totalActivities:
 *                           type: integer
 *                         uniqueObras:
 *                           type: integer
 *                         uniqueRecursos:
 *                           type: integer
 *                         operariosCount:
 *                           type: integer
 *                         maquinasCount:
 *                           type: integer
 *                     sampleData:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.post(
  '/preview',
  previewRateLimit,
  exportPreviewValidation,
  validateRequest,
  exportController.getExportPreview.bind(exportController)
);

/**
 * @swagger
 * /api/export/logs:
 *   get:
 *     summary: Get export logs for current user
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of logs per page
 *     responses:
 *       200:
 *         description: Export logs retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/logs',
  getExportLogsValidation,
  validateRequest,
  exportController.getExportLogs.bind(exportController)
);

/**
 * @swagger
 * /api/export/logs/{id}:
 *   get:
 *     summary: Get export log by ID
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Export log ID
 *     responses:
 *       200:
 *         description: Export log retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Export log not found
 */
router.get(
  '/logs/:id',
  exportLogIdValidation,
  validateRequest,
  exportController.getExportLogById.bind(exportController)
);

/**
 * @swagger
 * /api/export/stats:
 *   get:
 *     summary: Get export statistics
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics period
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics period
 *     responses:
 *       200:
 *         description: Export statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/stats',
  exportController.getExportStats.bind(exportController)
);

/**
 * @swagger
 * /api/export/validate:
 *   post:
 *     summary: Validate export request without executing
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fechaInicio
 *               - fechaFin
 *             properties:
 *               fechaInicio:
 *                 type: string
 *                 format: date
 *               fechaFin:
 *                 type: string
 *                 format: date
 *               empresa:
 *                 type: string
 *               tipoRecurso:
 *                 type: string
 *                 enum: [operario, maquina]
 *               obraIds:
 *                 oneOf:
 *                   - type: integer
 *                   - type: array
 *                     items:
 *                       type: integer
 *               recursoIds:
 *                 oneOf:
 *                   - type: integer
 *                   - type: array
 *                     items:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Validation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 valid:
 *                   type: boolean
 *                 warnings:
 *                   type: array
 *                   items:
 *                     type: string
 *                 estimatedRecords:
 *                   type: integer
 *                 estimatedSize:
 *                   type: integer
 *                 dateRange:
 *                   type: object
 *                   properties:
 *                     days:
 *                       type: integer
 *                     start:
 *                       type: string
 *                     end:
 *                       type: string
 */
router.post(
  '/validate',
  exportPreviewValidation,
  validateRequest,
  exportController.validateExportRequest.bind(exportController)
);

/**
 * @swagger
 * /api/export/download/{id}:
 *   get:
 *     summary: Download export file by log ID
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Export log ID
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 *           application/xml:
 *             schema:
 *               type: string
 *       400:
 *         description: Export not completed or invalid
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Export log not found
 */
router.get(
  '/download/:id',
  exportLogIdValidation,
  validateRequest,
  exportController.downloadExportFile.bind(exportController)
);

export { router as exportRouter };