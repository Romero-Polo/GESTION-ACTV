import { Router } from 'express';
import { recursoController } from '../controllers/RecursoController';
import { auth, requireRoles } from '../middleware/auth';
import { RolUsuario } from '../models/Usuario';
import {
  createRecursoValidation,
  updateRecursoValidation,
  getRecursosValidation,
  recursoIdValidation,
  searchRecursosValidation,
  importRecursosValidation
} from '../validators/recursoValidation';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/recursos - List recursos with filters and pagination
// Accessible by: Jefe de Equipo, Técnico de Transporte, Administrador
router.get('/',
  getRecursosValidation,
  requireRoles([RolUsuario.JEFE_EQUIPO, RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  recursoController.getRecursos
);

// GET /api/recursos/active - Get active recursos for dropdowns
// Accessible by: All authenticated users
router.get('/active',
  recursoController.getActiveRecursos
);

// GET /api/recursos/operarios - Get operarios
// Accessible by: Jefe de Equipo, Técnico de Transporte, Administrador
router.get('/operarios',
  requireRoles([RolUsuario.JEFE_EQUIPO, RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  recursoController.getOperarios
);

// GET /api/recursos/maquinas - Get maquinas
// Accessible by: Jefe de Equipo, Técnico de Transporte, Administrador
router.get('/maquinas',
  requireRoles([RolUsuario.JEFE_EQUIPO, RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  recursoController.getMaquinas
);

// GET /api/recursos/search - Search recursos for autocomplete
// Accessible by: All authenticated users
router.get('/search',
  searchRecursosValidation,
  recursoController.searchRecursos
);

// GET /api/recursos/agr-coste-types - Get aggregated coste types
// Accessible by: Jefe de Equipo, Técnico de Transporte, Administrador
router.get('/agr-coste-types',
  requireRoles([RolUsuario.JEFE_EQUIPO, RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  recursoController.getAgrCosteTypes
);

// GET /api/recursos/:id - Get recurso by ID
// Accessible by: Jefe de Equipo, Técnico de Transporte, Administrador
router.get('/:id',
  recursoIdValidation,
  requireRoles([RolUsuario.JEFE_EQUIPO, RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  recursoController.getRecursoById
);

// GET /api/recursos/:id/statistics - Get recurso statistics
// Accessible by: Jefe de Equipo, Técnico de Transporte, Administrador
router.get('/:id/statistics',
  recursoIdValidation,
  requireRoles([RolUsuario.JEFE_EQUIPO, RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  recursoController.getRecursoStatistics
);

// POST /api/recursos - Create new recurso
// Accessible by: Técnico de Transporte, Administrador
router.post('/',
  createRecursoValidation,
  requireRoles([RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  recursoController.createRecurso
);

// POST /api/recursos/import - Bulk import recursos
// Accessible by: Administrador only
router.post('/import',
  importRecursosValidation,
  requireRoles([RolUsuario.ADMINISTRADOR]),
  recursoController.importRecursos
);

// PUT /api/recursos/:id - Update recurso
// Accessible by: Técnico de Transporte, Administrador
router.put('/:id',
  updateRecursoValidation,
  requireRoles([RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  recursoController.updateRecurso
);

// PUT /api/recursos/:id/restore - Restore recurso
// Accessible by: Administrador only
router.put('/:id/restore',
  recursoIdValidation,
  requireRoles([RolUsuario.ADMINISTRADOR]),
  recursoController.restoreRecurso
);

// DELETE /api/recursos/:id - Soft delete recurso
// Accessible by: Administrador only
router.delete('/:id',
  recursoIdValidation,
  requireRoles([RolUsuario.ADMINISTRADOR]),
  recursoController.deleteRecurso
);

export default router;