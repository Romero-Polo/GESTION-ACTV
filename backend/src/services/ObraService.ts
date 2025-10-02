import { Repository, Like, FindManyOptions } from 'typeorm';
import { AppDataSource } from '../utils/database';
import { Obra } from '../models/Obra';
import { Actividad } from '../models/Actividad';

export interface ObraFilters {
  activo?: boolean;
  search?: string;
  codigo?: string;
  descripcion?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface ObraResponse {
  obras: Obra[];
  total: number;
  page: number;
  totalPages: number;
}

export class ObraService {
  private obraRepository: Repository<Obra>;
  private actividadRepository: Repository<Actividad>;

  constructor() {
    this.obraRepository = AppDataSource.getRepository(Obra);
    this.actividadRepository = AppDataSource.getRepository(Actividad);
  }

  /**
   * Get all obras with filters and pagination
   */
  async getObras(filters: ObraFilters = {}, pagination: PaginationOptions = {}): Promise<ObraResponse> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const queryOptions: FindManyOptions<Obra> = {
      skip,
      take: limit,
      order: { fechaCreacion: 'DESC' },
      where: {}
    };

    // Apply filters
    if (filters.activo !== undefined) {
      queryOptions.where = { ...queryOptions.where, activo: filters.activo };
    }

    if (filters.search) {
      queryOptions.where = [
        { ...queryOptions.where, codigo: Like(`%${filters.search}%`) },
        { ...queryOptions.where, descripcion: Like(`%${filters.search}%`) }
      ];
    } else {
      if (filters.codigo) {
        queryOptions.where = { ...queryOptions.where, codigo: Like(`%${filters.codigo}%`) };
      }
      if (filters.descripcion) {
        queryOptions.where = { ...queryOptions.where, descripcion: Like(`%${filters.descripcion}%`) };
      }
    }

    const [obras, total] = await this.obraRepository.findAndCount(queryOptions);
    const totalPages = Math.ceil(total / limit);

    return {
      obras,
      total,
      page,
      totalPages
    };
  }

  /**
   * Get obra by ID
   */
  async getObraById(id: number): Promise<Obra | null> {
    return await this.obraRepository.findOne({
      where: { id },
      relations: ['actividades']
    });
  }

  /**
   * Get obra by codigo
   */
  async getObraByCodigo(codigo: string): Promise<Obra | null> {
    return await this.obraRepository.findOne({
      where: { codigo }
    });
  }

  /**
   * Create new obra
   */
  async createObra(obraData: Partial<Obra>): Promise<Obra> {
    // Check if codigo already exists
    if (obraData.codigo) {
      const existing = await this.getObraByCodigo(obraData.codigo);
      if (existing) {
        throw new Error(`Ya existe una obra con el código: ${obraData.codigo}`);
      }
    }

    const obra = new Obra({
      ...obraData,
      activo: obraData.activo !== false // Default to true
    });

    return await this.obraRepository.save(obra);
  }

  /**
   * Update obra
   */
  async updateObra(id: number, updateData: Partial<Obra>): Promise<Obra> {
    const obra = await this.getObraById(id);

    if (!obra) {
      throw new Error('Obra no encontrada');
    }

    // Check if codigo conflicts with another obra
    if (updateData.codigo && updateData.codigo !== obra.codigo) {
      const existing = await this.getObraByCodigo(updateData.codigo);
      if (existing) {
        throw new Error(`Ya existe una obra con el código: ${updateData.codigo}`);
      }
    }

    // Update fields
    Object.assign(obra, updateData);
    obra.fechaActualizacion = new Date();

    return await this.obraRepository.save(obra);
  }

  /**
   * Delete obra (soft delete by setting activo = false)
   */
  async deleteObra(id: number): Promise<void> {
    const obra = await this.getObraById(id);

    if (!obra) {
      throw new Error('Obra no encontrada');
    }

    // Check if can be deactivated (no active activities)
    const canDeactivate = await this.canDeactivateObra(id);
    if (!canDeactivate) {
      throw new Error('No se puede desactivar la obra porque tiene actividades asociadas');
    }

    obra.activo = false;
    obra.fechaActualizacion = new Date();

    await this.obraRepository.save(obra);
  }

  /**
   * Restore obra (set activo = true)
   */
  async restoreObra(id: number): Promise<Obra> {
    const obra = await this.getObraById(id);

    if (!obra) {
      throw new Error('Obra no encontrada');
    }

    obra.activo = true;
    obra.fechaActualizacion = new Date();

    return await this.obraRepository.save(obra);
  }

  /**
   * Check if obra can be deactivated
   */
  async canDeactivateObra(id: number): Promise<boolean> {
    const activeActivitiesCount = await this.actividadRepository.count({
      where: { obraId: id }
    });

    return activeActivitiesCount === 0;
  }

  /**
   * Get obra statistics
   */
  async getObraStatistics(id: number): Promise<any> {
    const obra = await this.getObraById(id);

    if (!obra) {
      throw new Error('Obra no encontrada');
    }

    const totalActividades = await this.actividadRepository.count({
      where: { obraId: id }
    });

    const actividadesAbiertas = await this.actividadRepository.count({
      where: { obraId: id, fechaFin: null }
    });

    // Get total hours (this would be enhanced with proper time calculations)
    const actividades = await this.actividadRepository.find({
      where: { obraId: id, fechaFin: null }, // Only closed activities for now
      relations: ['recurso']
    });

    let totalHoras = 0;
    actividades.forEach(actividad => {
      const horas = actividad.getDurationInHours();
      if (horas) {
        totalHoras += horas;
      }
    });

    return {
      obra,
      estadisticas: {
        totalActividades,
        actividadesAbiertas,
        totalHoras: Math.round(totalHoras * 100) / 100
      }
    };
  }

  /**
   * Get active obras for dropdown/select usage
   */
  async getActiveObras(): Promise<Obra[]> {
    return await this.obraRepository.find({
      where: { activo: true },
      order: { codigo: 'ASC' },
      select: ['id', 'codigo', 'descripcion']
    });
  }

  /**
   * Import obra from external system
   */
  async importObraFromExternal(externalData: any): Promise<Obra> {
    const existingObra = await this.getObraByCodigo(externalData.codigo);

    if (existingObra) {
      // Update existing obra with external data
      return await this.updateObra(existingObra.id, {
        descripcion: externalData.descripcion,
        observaciones: externalData.observaciones,
        activo: externalData.activo !== false
      });
    } else {
      // Create new obra from external data
      return await this.createObra(Obra.createFromExternal(externalData));
    }
  }

  /**
   * Bulk import obras from external system
   */
  async bulkImportObras(externalObras: any[]): Promise<{ created: number; updated: number; errors: string[] }> {
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const externalObra of externalObras) {
      try {
        const existingObra = await this.getObraByCodigo(externalObra.codigo);

        if (existingObra) {
          await this.updateObra(existingObra.id, {
            descripcion: externalObra.descripcion,
            observaciones: externalObra.observaciones,
            activo: externalObra.activo !== false
          });
          updated++;
        } else {
          await this.createObra(Obra.createFromExternal(externalObra));
          created++;
        }
      } catch (error) {
        errors.push(`Error con obra ${externalObra.codigo}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    return { created, updated, errors };
  }
}

export const obraService = new ObraService();