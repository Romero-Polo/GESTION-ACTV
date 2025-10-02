import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { recursoService, RecursoFilters, PaginationOptions } from '../services/RecursoService';
import { TipoRecurso } from '../models/Recurso';

export class RecursoController {
  /**
   * Get all recursos with filters and pagination
   * GET /api/recursos
   */
  getRecursos = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: 'Errores de validación', errors: errors.array() });
        return;
      }

      const filters: RecursoFilters = {
        activo: req.query.activo ? req.query.activo === 'true' : undefined,
        tipo: req.query.tipo as TipoRecurso,
        search: req.query.search as string,
        codigo: req.query.codigo as string,
        nombre: req.query.nombre as string
      };

      const pagination: PaginationOptions = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10
      };

      const result = await recursoService.getRecursos(filters, pagination);

      res.json(result);
    } catch (error) {
      console.error('Error getting recursos:', error);
      res.status(500).json({
        message: 'Error al obtener los recursos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Get recurso by ID
   * GET /api/recursos/:id
   */
  getRecursoById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }

      const recurso = await recursoService.getRecursoById(id);

      if (!recurso) {
        res.status(404).json({ message: 'Recurso no encontrado' });
        return;
      }

      res.json({ recurso });
    } catch (error) {
      console.error('Error getting recurso by ID:', error);
      res.status(500).json({
        message: 'Error al obtener el recurso',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Get operarios
   * GET /api/recursos/operarios
   */
  getOperarios = async (req: Request, res: Response): Promise<void> => {
    try {
      const activeOnly = req.query.activo !== 'false';
      const operarios = await recursoService.getOperarios(activeOnly);

      res.json({ operarios });
    } catch (error) {
      console.error('Error getting operarios:', error);
      res.status(500).json({
        message: 'Error al obtener operarios',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Get maquinas
   * GET /api/recursos/maquinas
   */
  getMaquinas = async (req: Request, res: Response): Promise<void> => {
    try {
      const activeOnly = req.query.activo !== 'false';
      const maquinas = await recursoService.getMaquinas(activeOnly);

      res.json({ maquinas });
    } catch (error) {
      console.error('Error getting maquinas:', error);
      res.status(500).json({
        message: 'Error al obtener máquinas',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Create new recurso
   * POST /api/recursos
   */
  createRecurso = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: 'Errores de validación', errors: errors.array() });
        return;
      }

      const { codigo, nombre, tipo, agrCoste, activo } = req.body;

      const recurso = await recursoService.createRecurso({
        codigo,
        nombre,
        tipo,
        agrCoste,
        activo
      });

      res.status(201).json({
        message: 'Recurso creado exitosamente',
        recurso
      });
    } catch (error) {
      console.error('Error creating recurso:', error);

      if (error instanceof Error) {
        if (error.message.includes('Ya existe')) {
          res.status(409).json({
            message: error.message,
            field: 'codigo'
          });
          return;
        }

        if (error.message.includes('obligatorio')) {
          res.status(400).json({
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        message: 'Error al crear el recurso',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Update recurso
   * PUT /api/recursos/:id
   */
  updateRecurso = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: 'Errores de validación', errors: errors.array() });
        return;
      }

      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }

      const { codigo, nombre, tipo, agrCoste, activo } = req.body;

      const recurso = await recursoService.updateRecurso(id, {
        codigo,
        nombre,
        tipo,
        agrCoste,
        activo
      });

      res.json({
        message: 'Recurso actualizado exitosamente',
        recurso
      });
    } catch (error) {
      console.error('Error updating recurso:', error);

      if (error instanceof Error) {
        if (error.message === 'Recurso no encontrado') {
          res.status(404).json({ message: error.message });
          return;
        }

        if (error.message.includes('Ya existe')) {
          res.status(409).json({
            message: error.message,
            field: 'codigo'
          });
          return;
        }
      }

      res.status(500).json({
        message: 'Error al actualizar el recurso',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Delete recurso (soft delete)
   * DELETE /api/recursos/:id
   */
  deleteRecurso = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }

      await recursoService.deleteRecurso(id);

      res.json({
        message: 'Recurso desactivado exitosamente'
      });
    } catch (error) {
      console.error('Error deleting recurso:', error);

      if (error instanceof Error) {
        if (error.message === 'Recurso no encontrado') {
          res.status(404).json({ message: error.message });
          return;
        }

        if (error.message.includes('actividades asociadas')) {
          res.status(409).json({
            message: error.message,
            reason: 'ACTIVITIES_EXIST'
          });
          return;
        }
      }

      res.status(500).json({
        message: 'Error al desactivar el recurso',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Restore recurso
   * PUT /api/recursos/:id/restore
   */
  restoreRecurso = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }

      const recurso = await recursoService.restoreRecurso(id);

      res.json({
        message: 'Recurso reactivado exitosamente',
        recurso
      });
    } catch (error) {
      console.error('Error restoring recurso:', error);

      if (error instanceof Error && error.message === 'Recurso no encontrado') {
        res.status(404).json({ message: error.message });
        return;
      }

      res.status(500).json({
        message: 'Error al reactivar el recurso',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Get recurso statistics
   * GET /api/recursos/:id/statistics
   */
  getRecursoStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }

      const statistics = await recursoService.getRecursoStatistics(id);

      res.json(statistics);
    } catch (error) {
      console.error('Error getting recurso statistics:', error);

      if (error instanceof Error && error.message === 'Recurso no encontrado') {
        res.status(404).json({ message: error.message });
        return;
      }

      res.status(500).json({
        message: 'Error al obtener estadísticas del recurso',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Get active recursos for select/dropdown
   * GET /api/recursos/active
   */
  getActiveRecursos = async (req: Request, res: Response): Promise<void> => {
    try {
      const recursos = await recursoService.getActiveRecursos();

      res.json({ recursos });
    } catch (error) {
      console.error('Error getting active recursos:', error);
      res.status(500).json({
        message: 'Error al obtener recursos activos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Search recursos for autocomplete
   * GET /api/recursos/search
   */
  searchRecursos = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.query.q as string;
      const tipo = req.query.tipo as TipoRecurso;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      if (!query || query.length < 2) {
        res.status(400).json({ message: 'Query debe tener al menos 2 caracteres' });
        return;
      }

      const recursos = await recursoService.searchRecursos(query, tipo, limit);

      res.json({ recursos });
    } catch (error) {
      console.error('Error searching recursos:', error);
      res.status(500).json({
        message: 'Error al buscar recursos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Get agregado coste types
   * GET /api/recursos/agr-coste-types
   */
  getAgrCosteTypes = async (req: Request, res: Response): Promise<void> => {
    try {
      const types = await recursoService.getAgrCosteTypes();

      res.json({ types });
    } catch (error) {
      console.error('Error getting agr coste types:', error);
      res.status(500).json({
        message: 'Error al obtener tipos de agregado de coste',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Bulk import recursos from external system
   * POST /api/recursos/import
   */
  importRecursos = async (req: Request, res: Response): Promise<void> => {
    try {
      const { recursos } = req.body;

      if (!Array.isArray(recursos)) {
        res.status(400).json({ message: 'Se esperaba un array de recursos' });
        return;
      }

      const result = await recursoService.bulkImportRecursos(recursos);

      res.json({
        message: 'Importación completada',
        ...result
      });
    } catch (error) {
      console.error('Error importing recursos:', error);
      res.status(500).json({
        message: 'Error al importar recursos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };
}

export const recursoController = new RecursoController();