import { Router } from 'express';
import { GPSController } from '../controllers/GPSController';
import { authMiddleware } from '../middleware/auth';
import { body, param, ValidationChain } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = Router();
const gpsController = new GPSController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GPS coordinate validation
const gpsCoordinateValidation: ValidationChain[] = [
  body('latitude')
    .isNumeric()
    .custom((value: number) => {
      if (value < -90 || value > 90) {
        throw new Error('Latitud debe estar entre -90 y 90 grados');
      }
      return true;
    })
    .withMessage('Latitud inválida'),

  body('longitude')
    .isNumeric()
    .custom((value: number) => {
      if (value < -180 || value > 180) {
        throw new Error('Longitud debe estar entre -180 y 180 grados');
      }
      return true;
    })
    .withMessage('Longitud inválida'),

  body('accuracy')
    .optional()
    .isNumeric()
    .withMessage('Precisión debe ser un número'),
];

const activityIdValidation: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de actividad debe ser un entero positivo')
];

/**
 * @swagger
 * /api/gps/activity/{id}/start-location:
 *   post:
 *     summary: Record GPS location for activity start (Future implementation)
 *     tags: [GPS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Activity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 example: 41.3851
 *                 description: GPS latitude coordinate
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 example: 2.1734
 *                 description: GPS longitude coordinate
 *               accuracy:
 *                 type: number
 *                 example: 5
 *                 description: GPS accuracy in meters
 *     responses:
 *       200:
 *         description: Location recorded successfully (prepared for future implementation)
 *       400:
 *         description: Invalid GPS coordinates
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Activity not found
 */
router.post(
  '/activity/:id/start-location',
  activityIdValidation,
  gpsCoordinateValidation,
  validateRequest,
  gpsController.recordStartLocation.bind(gpsController)
);

/**
 * @swagger
 * /api/gps/activity/{id}/end-location:
 *   post:
 *     summary: Record GPS location for activity end (Future implementation)
 *     tags: [GPS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 example: 41.3901
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 example: 2.1884
 *               accuracy:
 *                 type: number
 *                 example: 3
 *               totalDistance:
 *                 type: number
 *                 example: 15.5
 *                 description: Total distance traveled (optional, will be calculated if not provided)
 *     responses:
 *       200:
 *         description: End location recorded successfully
 */
router.post(
  '/activity/:id/end-location',
  activityIdValidation,
  [
    ...gpsCoordinateValidation,
    body('totalDistance')
      .optional()
      .isNumeric()
      .withMessage('Distancia total debe ser un número')
  ],
  validateRequest,
  gpsController.recordEndLocation.bind(gpsController)
);

/**
 * @swagger
 * /api/gps/activity/{id}/track:
 *   post:
 *     summary: Record GPS track (waypoints) for activity (Future implementation)
 *     tags: [GPS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - waypoints
 *             properties:
 *               waypoints:
 *                 type: array
 *                 minItems: 2
 *                 items:
 *                   type: object
 *                   required:
 *                     - latitude
 *                     - longitude
 *                     - timestamp
 *                   properties:
 *                     latitude:
 *                       type: number
 *                       minimum: -90
 *                       maximum: 90
 *                     longitude:
 *                       type: number
 *                       minimum: -180
 *                       maximum: 180
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     accuracy:
 *                       type: number
 *     responses:
 *       200:
 *         description: Track recorded successfully
 */
router.post(
  '/activity/:id/track',
  activityIdValidation,
  [
    body('waypoints')
      .isArray({ min: 2 })
      .withMessage('Se requieren al menos 2 waypoints'),
    body('waypoints.*.latitude')
      .isNumeric()
      .custom((value: number) => {
        if (value < -90 || value > 90) {
          throw new Error('Latitud debe estar entre -90 y 90 grados');
        }
        return true;
      }),
    body('waypoints.*.longitude')
      .isNumeric()
      .custom((value: number) => {
        if (value < -180 || value > 180) {
          throw new Error('Longitud debe estar entre -180 y 180 grados');
        }
        return true;
      }),
    body('waypoints.*.timestamp')
      .isISO8601()
      .withMessage('Timestamp debe ser una fecha ISO válida'),
    body('waypoints.*.accuracy')
      .optional()
      .isNumeric()
  ],
  validateRequest,
  gpsController.recordTrack.bind(gpsController)
);

/**
 * @swagger
 * /api/gps/activity/{id}:
 *   get:
 *     summary: Get GPS data for specific activity (Future implementation)
 *     tags: [GPS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: GPS data retrieved successfully
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
 *                     actividadId:
 *                       type: integer
 *                     hasGPSData:
 *                       type: boolean
 *                     startLocation:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                     endLocation:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                     kmRecorridos:
 *                       type: number
 *                       nullable: true
 *                     trackAvailable:
 *                       type: boolean
 */
router.get(
  '/activity/:id',
  activityIdValidation,
  validateRequest,
  gpsController.getActivityGPS.bind(gpsController)
);

/**
 * @swagger
 * /api/gps/activities/summary:
 *   post:
 *     summary: Get GPS summary for multiple activities (Future implementation)
 *     tags: [GPS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               actividadIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               fechaInicio:
 *                 type: string
 *                 format: date
 *               fechaFin:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: GPS summary retrieved successfully
 */
router.post(
  '/activities/summary',
  [
    body('actividadIds')
      .optional()
      .isArray()
      .custom((ids: number[]) => {
        if (ids && !ids.every(id => Number.isInteger(id) && id > 0)) {
          throw new Error('Todos los IDs deben ser enteros positivos');
        }
        return true;
      }),
    body('fechaInicio')
      .optional()
      .isDate({ format: 'YYYY-MM-DD' })
      .withMessage('fechaInicio debe ser una fecha válida en formato YYYY-MM-DD'),
    body('fechaFin')
      .optional()
      .isDate({ format: 'YYYY-MM-DD' })
      .withMessage('fechaFin debe ser una fecha válida en formato YYYY-MM-DD')
  ],
  validateRequest,
  gpsController.getActivitiesGPSSummary.bind(gpsController)
);

export { router as gpsRouter };