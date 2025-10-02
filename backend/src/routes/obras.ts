import { Router } from 'express';
import { obraController } from '../controllers/ObraController';
import { auth, requireRoles } from '../middleware/auth';
import { RolUsuario } from '../models/Usuario';
import {
  createObraValidation,
  updateObraValidation,
  getObrasValidation,
  obraIdValidation,
  importObrasValidation
} from '../validators/obraValidation';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/obras - List obras with filters and pagination
// Accessible by: Jefe de Equipo, Técnico de Transporte, Administrador
router.get('/',
  getObrasValidation,
  requireRoles([RolUsuario.JEFE_EQUIPO, RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  obraController.getObras
);

// GET /api/obras/active - Get active obras for dropdowns
// Accessible by: All authenticated users
router.get('/active',
  obraController.getActiveObras
);

// GET /api/obras/:id - Get obra by ID
// Accessible by: Jefe de Equipo, Técnico de Transporte, Administrador
router.get('/:id',
  obraIdValidation,
  requireRoles([RolUsuario.JEFE_EQUIPO, RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  obraController.getObraById
);

// GET /api/obras/:id/statistics - Get obra statistics
// Accessible by: Jefe de Equipo, Técnico de Transporte, Administrador
router.get('/:id/statistics',
  obraIdValidation,
  requireRoles([RolUsuario.JEFE_EQUIPO, RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  obraController.getObraStatistics
);

// POST /api/obras - Create new obra
// Accessible by: Técnico de Transporte, Administrador
router.post('/',
  createObraValidation,
  requireRoles([RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  obraController.createObra
);

// POST /api/obras/import - Bulk import obras
// Accessible by: Administrador only
router.post('/import',
  importObrasValidation,
  requireRoles([RolUsuario.ADMINISTRADOR]),
  obraController.importObras
);

// PUT /api/obras/:id - Update obra
// Accessible by: Técnico de Transporte, Administrador
router.put('/:id',
  updateObraValidation,
  requireRoles([RolUsuario.TECNICO_TRANSPORTE, RolUsuario.ADMINISTRADOR]),
  obraController.updateObra
);

// PUT /api/obras/:id/restore - Restore obra
// Accessible by: Administrador only
router.put('/:id/restore',
  obraIdValidation,
  requireRoles([RolUsuario.ADMINISTRADOR]),
  obraController.restoreObra
);

// DELETE /api/obras/:id - Soft delete obra
// Accessible by: Administrador only
router.delete('/:id',
  obraIdValidation,
  requireRoles([RolUsuario.ADMINISTRADOR]),
  obraController.deleteObra
);

export default router;