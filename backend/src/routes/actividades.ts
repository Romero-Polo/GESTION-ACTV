import { Router } from 'express';
import { actividadController } from '../controllers/ActividadController';
import { auth, requireRoles } from '../middleware/auth';
import { RolUsuario } from '../models/Usuario';
import {
  createActividadValidation,
  updateActividadValidation,
  getActividadesValidation,
  actividadIdValidation,
  cerrarJornadaValidation,
  getStatisticsValidation,
  getAbiertasValidation,
  validateActividadValidation,
  getSuggestedSlotsValidation,
  getByResourceDateValidation
} from '../validators/actividadValidation';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/actividades - List actividades with filters and pagination
// Accessible by: All authenticated users (with role-based filtering)
router.get('/',
  getActividadesValidation,
  actividadController.getActividades
);

// GET /api/actividades/recursos - Get user's accessible recursos
// Accessible by: All authenticated users
router.get('/recursos',
  actividadController.getAccessibleRecursos
);

// GET /api/actividades/abiertas - Get open shifts
// Accessible by: All authenticated users
router.get('/abiertas',
  getAbiertasValidation,
  actividadController.getActividadesAbiertas
);

// GET /api/actividades/statistics - Get activity statistics
// Accessible by: All authenticated users (filtered by role)
router.get('/statistics',
  getStatisticsValidation,
  actividadController.getActividadStatistics
);

// POST /api/actividades/validate - Validate activity for overlaps
// Accessible by: All authenticated users
router.post('/validate',
  validateActividadValidation,
  actividadController.validateActividad
);

// GET /api/actividades/suggest-slots - Get suggested time slots
// Accessible by: All authenticated users
router.get('/suggest-slots',
  getSuggestedSlotsValidation,
  actividadController.getSuggestedSlots
);

// GET /api/actividades/by-resource-date - Get activities by resource and date
// Accessible by: All authenticated users (filtered by role)
router.get('/by-resource-date',
  getByResourceDateValidation,
  actividadController.getActividadesByResourceDate
);

// GET /api/actividades/:id - Get actividad by ID
// Accessible by: All authenticated users (with role-based filtering)
router.get('/:id',
  actividadIdValidation,
  actividadController.getActividadById
);

// POST /api/actividades - Create new actividad
// Accessible by: Jefe de Equipo, Técnico de Transporte, Administrador
// Note: Operarios can create activities for their own resource
router.post('/',
  createActividadValidation,
  requireRoles([RolUsuario.OPERARIO, RolUsuario.JEFE_EQUIPO, RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  actividadController.createActividad
);

// PUT /api/actividades/:id - Update actividad
// Accessible by: Jefe de Equipo, Técnico de Transporte, Administrador
// Note: Operarios can update their own activities
router.put('/:id',
  updateActividadValidation,
  requireRoles([RolUsuario.OPERARIO, RolUsuario.JEFE_EQUIPO, RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  actividadController.updateActividad
);

// PUT /api/actividades/:id/cerrar - Close open shift
// Accessible by: Jefe de Equipo, Técnico de Transporte, Administrador
// Note: Operarios can close their own shifts
router.put('/:id/cerrar',
  cerrarJornadaValidation,
  requireRoles([RolUsuario.OPERARIO, RolUsuario.JEFE_EQUIPO, RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  actividadController.cerrarJornada
);

// POST /api/actividades/:id/calculate-end - Calculate end time for open activity
// Accessible by: All authenticated users (filtered by role)
router.post('/:id/calculate-end',
  actividadIdValidation,
  actividadController.calculateEndTime
);

// DELETE /api/actividades/:id - Delete actividad
// Accessible by: Jefe de Equipo, Técnico de Transporte, Administrador
// Note: Operarios can delete their own activities (within business rules)
router.delete('/:id',
  actividadIdValidation,
  requireRoles([RolUsuario.OPERARIO, RolUsuario.JEFE_EQUIPO, RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  actividadController.deleteActividad
);

export default router;