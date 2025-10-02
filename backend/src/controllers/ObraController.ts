import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { obraService, ObraFilters, PaginationOptions } from '../services/ObraService';

export class ObraController {
  /**
   * Get all obras with filters and pagination
   * GET /api/obras
   */
  getObras = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: 'Errores de validación', errors: errors.array() });
        return;
      }

      const filters: ObraFilters = {
        activo: req.query.activo ? req.query.activo === 'true' : undefined,
        search: req.query.search as string,
        codigo: req.query.codigo as string,
        descripcion: req.query.descripcion as string
      };

      const pagination: PaginationOptions = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10
      };

      const result = await obraService.getObras(filters, pagination);

      res.json(result);
    } catch (error) {
      console.error('Error getting obras:', error);
      res.status(500).json({
        message: 'Error al obtener las obras',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Get obra by ID
   * GET /api/obras/:id
   */
  getObraById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }

      const obra = await obraService.getObraById(id);

      if (!obra) {
        res.status(404).json({ message: 'Obra no encontrada' });
        return;
      }

      res.json({ obra });
    } catch (error) {
      console.error('Error getting obra by ID:', error);
      res.status(500).json({
        message: 'Error al obtener la obra',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Create new obra
   * POST /api/obras
   */
  createObra = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: 'Errores de validación', errors: errors.array() });
        return;
      }

      const { codigo, descripcion, observaciones, activo } = req.body;

      const obra = await obraService.createObra({
        codigo,
        descripcion,
        observaciones,
        activo
      });

      res.status(201).json({
        message: 'Obra creada exitosamente',
        obra
      });
    } catch (error) {
      console.error('Error creating obra:', error);

      if (error instanceof Error && error.message.includes('Ya existe')) {
        res.status(409).json({
          message: error.message,
          field: 'codigo'
        });
        return;
      }

      res.status(500).json({
        message: 'Error al crear la obra',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Update obra
   * PUT /api/obras/:id
   */
  updateObra = async (req: Request, res: Response): Promise<void> => {
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

      const { codigo, descripcion, observaciones, activo } = req.body;

      const obra = await obraService.updateObra(id, {
        codigo,
        descripcion,
        observaciones,
        activo
      });

      res.json({
        message: 'Obra actualizada exitosamente',
        obra
      });
    } catch (error) {
      console.error('Error updating obra:', error);

      if (error instanceof Error) {
        if (error.message === 'Obra no encontrada') {
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
        message: 'Error al actualizar la obra',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Delete obra (soft delete)
   * DELETE /api/obras/:id
   */
  deleteObra = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }

      await obraService.deleteObra(id);

      res.json({
        message: 'Obra desactivada exitosamente'
      });
    } catch (error) {
      console.error('Error deleting obra:', error);

      if (error instanceof Error) {
        if (error.message === 'Obra no encontrada') {
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
        message: 'Error al desactivar la obra',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Restore obra
   * PUT /api/obras/:id/restore
   */
  restoreObra = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }

      const obra = await obraService.restoreObra(id);

      res.json({
        message: 'Obra reactivada exitosamente',
        obra
      });
    } catch (error) {
      console.error('Error restoring obra:', error);

      if (error instanceof Error && error.message === 'Obra no encontrada') {
        res.status(404).json({ message: error.message });
        return;
      }

      res.status(500).json({
        message: 'Error al reactivar la obra',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Get obra statistics
   * GET /api/obras/:id/statistics
   */
  getObraStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }

      const statistics = await obraService.getObraStatistics(id);

      res.json(statistics);
    } catch (error) {
      console.error('Error getting obra statistics:', error);

      if (error instanceof Error && error.message === 'Obra no encontrada') {
        res.status(404).json({ message: error.message });
        return;
      }

      res.status(500).json({
        message: 'Error al obtener estadísticas de la obra',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Get active obras for select/dropdown
   * GET /api/obras/active
   */
  getActiveObras = async (req: Request, res: Response): Promise<void> => {
    try {
      const obras = await obraService.getActiveObras();

      res.json({ obras });
    } catch (error) {
      console.error('Error getting active obras:', error);
      res.status(500).json({
        message: 'Error al obtener obras activas',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  /**
   * Bulk import obras from external system
   * POST /api/obras/import
   */
  importObras = async (req: Request, res: Response): Promise<void> => {
    try {
      const { obras } = req.body;

      if (!Array.isArray(obras)) {
        res.status(400).json({ message: 'Se esperaba un array de obras' });
        return;
      }

      const result = await obraService.bulkImportObras(obras);

      res.json({
        message: 'Importación completada',
        ...result
      });
    } catch (error) {
      console.error('Error importing obras:', error);
      res.status(500).json({
        message: 'Error al importar obras',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };
}

export const obraController = new ObraController();