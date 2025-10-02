import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import {
  actividadService,
  ActividadFilters,
  PaginationOptions,
  CreateActividadData,
  UpdateActividadData
} from '../services/ActividadService';

export class ActividadController {
  /**
   * Get all actividades with filters and pagination
   * GET /api/actividades
   */
  getActividades = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: 'Errores de validación', errors: errors.array() });
        return;
      }

      const userRole = req.user?.rol;
      const userId = req.user?.id;

      if (!userRole || !userId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const filters: ActividadFilters = {
        obraId: req.query.obraId ? parseInt(req.query.obraId as string) : undefined,
        recursoId: req.query.recursoId ? parseInt(req.query.recursoId as string) : undefined,
        tipoActividadId: req.query.tipoActividadId ? parseInt(req.query.tipoActividadId as string) : undefined,
        fechaDesde: req.query.fechaDesde as string,
        fechaHasta: req.query.fechaHasta as string,
        jornada: req.query.jornada as 'abierta' | 'cerrada',
        usuarioId: req.query.usuarioId ? parseInt(req.query.usuarioId as string) : undefined
      };

      const pagination: PaginationOptions = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10
      };

      const result = await actividadService.getActividades(filters, pagination, userRole, userId);

      res.json(result);
    } catch (error) {
      console.error('Error getting actividades:', error);
      res.status(500).json({
        message: 'Error al obtener las actividades',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Get actividad by ID
   * GET /api/actividades/:id
   */
  getActividadById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const userRole = req.user?.rol;
      const userId = req.user?.id;

      if (isNaN(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }

      if (!userRole || !userId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const actividad = await actividadService.getActividadById(id, userRole, userId);

      if (!actividad) {
        res.status(404).json({ message: 'Actividad no encontrada' });
        return;
      }

      res.json({ actividad });
    } catch (error) {
      console.error('Error getting actividad by ID:', error);
      res.status(500).json({
        message: 'Error al obtener la actividad',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Create new actividad
   * POST /api/actividades
   */
  createActividad = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: 'Errores de validación', errors: errors.array() });
        return;
      }

      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const actividadData: CreateActividadData = {
        ...req.body,
        usuarioCreacionId: userId
      };

      const actividad = await actividadService.createActividadWithValidation(actividadData);

      res.status(201).json({
        message: 'Actividad creada exitosamente',
        actividad
      });
    } catch (error) {
      console.error('Error creating actividad:', error);

      if (error instanceof Error) {
        if (error.message.includes('no encontrada') || error.message.includes('no válido')) {
          res.status(400).json({
            message: error.message
          });
          return;
        }

        if (error.message.includes('no está activa') || error.message.includes('no está activo')) {
          res.status(400).json({
            message: error.message
          });
          return;
        }

        if (error.message.includes('formato') || error.message.includes('inválido')) {
          res.status(400).json({
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        message: 'Error al crear la actividad',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Update actividad
   * PUT /api/actividades/:id
   */
  updateActividad = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: 'Errores de validación', errors: errors.array() });
        return;
      }

      const id = parseInt(req.params.id);
      const userRole = req.user?.rol;
      const userId = req.user?.id;

      if (isNaN(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }

      if (!userRole || !userId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const updateData: UpdateActividadData = {
        ...req.body,
        usuarioModificacionId: userId
      };

      const actividad = await actividadService.updateActividadWithValidation(id, updateData, userRole, userId);

      res.json({
        message: 'Actividad actualizada exitosamente',
        actividad
      });
    } catch (error) {
      console.error('Error updating actividad:', error);

      if (error instanceof Error) {
        if (error.message === 'Actividad no encontrada o acceso denegado') {
          res.status(404).json({ message: error.message });
          return;
        }

        if (error.message.includes('no válido') || error.message.includes('formato') || error.message.includes('inválido')) {
          res.status(400).json({
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        message: 'Error al actualizar la actividad',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Delete actividad
   * DELETE /api/actividades/:id
   */
  deleteActividad = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const userRole = req.user?.rol;
      const userId = req.user?.id;

      if (isNaN(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }

      if (!userRole || !userId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      await actividadService.deleteActividad(id, userRole, userId);

      res.json({
        message: 'Actividad eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error deleting actividad:', error);

      if (error instanceof Error) {
        if (error.message === 'Actividad no encontrada o acceso denegado') {
          res.status(404).json({ message: error.message });
          return;
        }
      }

      res.status(500).json({
        message: 'Error al eliminar la actividad',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Get user's accessible recursos
   * GET /api/actividades/recursos
   */
  getAccessibleRecursos = async (req: Request, res: Response): Promise<void> => {
    try {
      const userRole = req.user?.rol;
      const userId = req.user?.id;

      if (!userRole || !userId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const recursos = await actividadService.getAccessibleRecursos(userRole, userId);

      res.json({ recursos });
    } catch (error) {
      console.error('Error getting accessible recursos:', error);
      res.status(500).json({
        message: 'Error al obtener recursos accesibles',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Get actividades abiertas (open shifts)
   * GET /api/actividades/abiertas
   */
  getActividadesAbiertas = async (req: Request, res: Response): Promise<void> => {
    try {
      const userRole = req.user?.rol;
      const userId = req.user?.id;

      if (!userRole || !userId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const recursoId = req.query.recursoId ? parseInt(req.query.recursoId as string) : undefined;

      const actividades = await actividadService.getActividadesAbiertas(recursoId);

      res.json({ actividades });
    } catch (error) {
      console.error('Error getting actividades abiertas:', error);
      res.status(500).json({
        message: 'Error al obtener actividades abiertas',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Close open shift
   * PUT /api/actividades/:id/cerrar
   */
  cerrarJornada = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: 'Errores de validación', errors: errors.array() });
        return;
      }

      const id = parseInt(req.params.id);
      const userRole = req.user?.rol;
      const userId = req.user?.id;

      if (isNaN(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }

      if (!userRole || !userId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const { fechaFin, horaFin } = req.body;

      if (!fechaFin || !horaFin) {
        res.status(400).json({ message: 'Fecha y hora de fin son obligatorias' });
        return;
      }

      const actividad = await actividadService.cerrarJornada(id, fechaFin, horaFin, userRole, userId);

      res.json({
        message: 'Jornada cerrada exitosamente',
        actividad
      });
    } catch (error) {
      console.error('Error cerrando jornada:', error);

      if (error instanceof Error) {
        if (error.message === 'Actividad no encontrada o acceso denegado') {
          res.status(404).json({ message: error.message });
          return;
        }

        if (error.message === 'La jornada ya está cerrada') {
          res.status(400).json({ message: error.message });
          return;
        }

        if (error.message.includes('formato') || error.message.includes('inválido') || error.message.includes('posterior')) {
          res.status(400).json({ message: error.message });
          return;
        }
      }

      res.status(500).json({
        message: 'Error al cerrar la jornada',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Get activity statistics
   * GET /api/actividades/statistics
   */
  getActividadStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userRole = req.user?.rol;
      const userId = req.user?.id;

      if (!userRole || !userId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const fechaDesde = req.query.fechaDesde as string;
      const fechaHasta = req.query.fechaHasta as string;

      const statistics = await actividadService.getActividadStatistics(userRole, userId, fechaDesde, fechaHasta);

      res.json(statistics);
    } catch (error) {
      console.error('Error getting actividad statistics:', error);
      res.status(500).json({
        message: 'Error al obtener estadísticas de actividades',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Validate activity for overlaps
   * POST /api/actividades/validate
   */
  validateActividad = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: 'Errores de validación', errors: errors.array() });
        return;
      }

      const actividadData = req.body;
      const excludeId = req.query.excludeId ? parseInt(req.query.excludeId as string) : undefined;

      const validationResult = await actividadService.validarSolapamiento(actividadData, excludeId);

      res.json({
        valid: !validationResult.hasOverlap,
        hasOverlap: validationResult.hasOverlap,
        conflictingActivities: validationResult.conflictingActivities,
        message: validationResult.message
      });
    } catch (error) {
      console.error('Error validating actividad:', error);
      res.status(500).json({
        message: 'Error al validar la actividad',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Get suggested time slots for a resource on a date
   * GET /api/actividades/suggest-slots
   */
  getSuggestedSlots = async (req: Request, res: Response): Promise<void> => {
    try {
      const recursoId = parseInt(req.query.recursoId as string);
      const fecha = req.query.fecha as string;
      const durationMinutes = req.query.duration ? parseInt(req.query.duration as string) : 60;

      if (!recursoId || !fecha) {
        res.status(400).json({ message: 'recursoId y fecha son obligatorios' });
        return;
      }

      const suggestions = await actividadService.getSuggestedTimeSlots(recursoId, fecha, durationMinutes);

      res.json({ suggestions });
    } catch (error) {
      console.error('Error getting suggested slots:', error);
      res.status(500).json({
        message: 'Error al obtener sugerencias de horarios',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Get activities for a resource on a specific date
   * GET /api/actividades/by-resource-date
   */
  getActividadesByResourceDate = async (req: Request, res: Response): Promise<void> => {
    try {
      const recursoId = parseInt(req.query.recursoId as string);
      const fecha = req.query.fecha as string;

      if (!recursoId || !fecha) {
        res.status(400).json({ message: 'recursoId y fecha son obligatorios' });
        return;
      }

      const actividades = await actividadService.obtenerActividadesPorRecurso(recursoId, fecha);

      res.json({ actividades });
    } catch (error) {
      console.error('Error getting activities by resource date:', error);
      res.status(500).json({
        message: 'Error al obtener actividades del recurso',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Calculate end time for an open activity
   * POST /api/actividades/:id/calculate-end
   */
  calculateEndTime = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const userRole = req.user?.rol;
      const userId = req.user?.id;

      if (isNaN(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }

      if (!userRole || !userId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const actividad = await actividadService.getActividadById(id, userRole, userId);

      if (!actividad) {
        res.status(404).json({ message: 'Actividad no encontrada' });
        return;
      }

      const calculation = await actividadService.calcularHoraFin(actividad);

      res.json(calculation);
    } catch (error) {
      console.error('Error calculating end time:', error);
      res.status(500).json({
        message: 'Error al calcular hora de fin',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };
}

export const actividadController = new ActividadController();