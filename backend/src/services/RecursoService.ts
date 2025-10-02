import { Repository, Like, FindManyOptions, In } from 'typeorm';
import { AppDataSource } from '../utils/database';
import { Recurso, TipoRecurso } from '../models/Recurso';
import { Actividad } from '../models/Actividad';

export interface RecursoFilters {
  activo?: boolean;
  tipo?: TipoRecurso;
  search?: string;
  codigo?: string;
  nombre?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface RecursoResponse {
  recursos: Recurso[];
  total: number;
  page: number;
  totalPages: number;
}

export class RecursoService {
  private recursoRepository: Repository<Recurso>;
  private actividadRepository: Repository<Actividad>;

  constructor() {
    this.recursoRepository = AppDataSource.getRepository(Recurso);
    this.actividadRepository = AppDataSource.getRepository(Actividad);
  }

  /**
   * Get all recursos with filters and pagination
   */
  async getRecursos(filters: RecursoFilters = {}, pagination: PaginationOptions = {}): Promise<RecursoResponse> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const queryOptions: FindManyOptions<Recurso> = {
      skip,
      take: limit,
      order: { codigo: 'ASC' },
      where: {}
    };

    // Apply filters
    if (filters.activo !== undefined) {
      queryOptions.where = { ...queryOptions.where, activo: filters.activo };
    }

    if (filters.tipo) {
      queryOptions.where = { ...queryOptions.where, tipo: filters.tipo };
    }

    if (filters.search) {
      queryOptions.where = [
        { ...queryOptions.where, codigo: Like(`%${filters.search}%`) },
        { ...queryOptions.where, nombre: Like(`%${filters.search}%`) }
      ];
    } else {
      if (filters.codigo) {
        queryOptions.where = { ...queryOptions.where, codigo: Like(`%${filters.codigo}%`) };
      }
      if (filters.nombre) {
        queryOptions.where = { ...queryOptions.where, nombre: Like(`%${filters.nombre}%`) };
      }
    }

    const [recursos, total] = await this.recursoRepository.findAndCount(queryOptions);
    const totalPages = Math.ceil(total / limit);

    return {
      recursos,
      total,
      page,
      totalPages
    };
  }

  /**
   * Get recurso by ID
   */
  async getRecursoById(id: number): Promise<Recurso | null> {
    return await this.recursoRepository.findOne({
      where: { id },
      relations: ['actividades']
    });
  }

  /**
   * Get recurso by codigo
   */
  async getRecursoByCodigo(codigo: string): Promise<Recurso | null> {
    return await this.recursoRepository.findOne({
      where: { codigo }
    });
  }

  /**
   * Get recursos by type
   */
  async getRecursosByType(tipo: TipoRecurso, activeOnly = true): Promise<Recurso[]> {
    const where: any = { tipo };
    if (activeOnly) {
      where.activo = true;
    }

    return await this.recursoRepository.find({
      where,
      order: { codigo: 'ASC' },
      select: ['id', 'codigo', 'nombre', 'tipo', 'agrCoste', 'activo']
    });
  }

  /**
   * Get operarios
   */
  async getOperarios(activeOnly = true): Promise<Recurso[]> {
    return await this.getRecursosByType(TipoRecurso.OPERARIO, activeOnly);
  }

  /**
   * Get maquinas
   */
  async getMaquinas(activeOnly = true): Promise<Recurso[]> {
    return await this.getRecursosByType(TipoRecurso.MAQUINA, activeOnly);
  }

  /**
   * Create new recurso
   */
  async createRecurso(recursoData: Partial<Recurso>): Promise<Recurso> {
    // Check if codigo already exists
    if (recursoData.codigo) {
      const existing = await this.getRecursoByCodigo(recursoData.codigo);
      if (existing) {
        throw new Error(`Ya existe un recurso con el código: ${recursoData.codigo}`);
      }
    }

    // Validate required fields
    if (!recursoData.tipo) {
      throw new Error('El tipo de recurso es obligatorio');
    }

    if (!recursoData.agrCoste) {
      throw new Error('El agregado de coste es obligatorio');
    }

    const recurso = new Recurso({
      ...recursoData,
      activo: recursoData.activo !== false // Default to true
    });

    return await this.recursoRepository.save(recurso);
  }

  /**
   * Update recurso
   */
  async updateRecurso(id: number, updateData: Partial<Recurso>): Promise<Recurso> {
    const recurso = await this.getRecursoById(id);

    if (!recurso) {
      throw new Error('Recurso no encontrado');
    }

    // Check if codigo conflicts with another recurso
    if (updateData.codigo && updateData.codigo !== recurso.codigo) {
      const existing = await this.getRecursoByCodigo(updateData.codigo);
      if (existing) {
        throw new Error(`Ya existe un recurso con el código: ${updateData.codigo}`);
      }
    }

    // Update fields
    Object.assign(recurso, updateData);

    return await this.recursoRepository.save(recurso);
  }

  /**
   * Delete recurso (soft delete by setting activo = false)
   */
  async deleteRecurso(id: number): Promise<void> {
    const recurso = await this.getRecursoById(id);

    if (!recurso) {
      throw new Error('Recurso no encontrado');
    }

    // Check if can be deactivated (no active activities)
    const canDeactivate = await this.canDeactivateRecurso(id);
    if (!canDeactivate) {
      throw new Error('No se puede desactivar el recurso porque tiene actividades asociadas');
    }

    recurso.activo = false;

    await this.recursoRepository.save(recurso);
  }

  /**
   * Restore recurso (set activo = true)
   */
  async restoreRecurso(id: number): Promise<Recurso> {
    const recurso = await this.getRecursoById(id);

    if (!recurso) {
      throw new Error('Recurso no encontrado');
    }

    recurso.activo = true;

    return await this.recursoRepository.save(recurso);
  }

  /**
   * Check if recurso can be deactivated
   */
  async canDeactivateRecurso(id: number): Promise<boolean> {
    const activeActivitiesCount = await this.actividadRepository.count({
      where: { recursoId: id }
    });

    return activeActivitiesCount === 0;
  }

  /**
   * Get recurso statistics
   */
  async getRecursoStatistics(id: number): Promise<any> {
    const recurso = await this.getRecursoById(id);

    if (!recurso) {
      throw new Error('Recurso no encontrado');
    }

    const totalActividades = await this.actividadRepository.count({
      where: { recursoId: id }
    });

    const actividadesAbiertas = await this.actividadRepository.count({
      where: { recursoId: id, fechaFin: null }
    });

    // Get activities for this month
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const actividadesMes = await this.actividadRepository.count({
      where: {
        recursoId: id,
        fechaInicio: Like(`${firstDayOfMonth.getFullYear()}-${String(firstDayOfMonth.getMonth() + 1).padStart(2, '0')}%`)
      }
    });

    // Calculate total hours for closed activities
    const actividades = await this.actividadRepository.find({
      where: {
        recursoId: id,
        fechaFin: null // Only closed activities have reliable hours
      }
    });

    let totalHoras = 0;
    actividades.forEach(actividad => {
      const horas = actividad.getDurationInHours();
      if (horas) {
        totalHoras += horas;
      }
    });

    return {
      recurso,
      estadisticas: {
        totalActividades,
        actividadesAbiertas,
        actividadesMes,
        totalHoras: Math.round(totalHoras * 100) / 100
      }
    };
  }

  /**
   * Get active recursos for dropdown/select usage
   */
  async getActiveRecursos(): Promise<Recurso[]> {
    return await this.recursoRepository.find({
      where: { activo: true },
      order: { tipo: 'ASC', codigo: 'ASC' },
      select: ['id', 'codigo', 'nombre', 'tipo', 'agrCoste']
    });
  }

  /**
   * Search recursos for autocomplete
   */
  async searchRecursos(query: string, tipo?: TipoRecurso, limit = 10): Promise<Recurso[]> {
    const where: any = {
      activo: true
    };

    if (tipo) {
      where.tipo = tipo;
    }

    return await this.recursoRepository.find({
      where: [
        { ...where, codigo: Like(`%${query}%`) },
        { ...where, nombre: Like(`%${query}%`) }
      ],
      take: limit,
      order: { codigo: 'ASC' },
      select: ['id', 'codigo', 'nombre', 'tipo']
    });
  }

  /**
   * Get recursos by IDs (for team management)
   */
  async getRecursosByIds(ids: number[]): Promise<Recurso[]> {
    if (ids.length === 0) return [];

    return await this.recursoRepository.find({
      where: { id: In(ids) },
      order: { codigo: 'ASC' }
    });
  }

  /**
   * Import recurso from external system
   */
  async importRecursoFromExternal(externalData: any): Promise<Recurso> {
    const existingRecurso = await this.getRecursoByCodigo(externalData.codigo);

    if (existingRecurso) {
      // Update existing recurso with external data
      return await this.updateRecurso(existingRecurso.id, {
        nombre: externalData.nombre,
        tipo: externalData.tipo === 'maquina' ? TipoRecurso.MAQUINA : TipoRecurso.OPERARIO,
        agrCoste: externalData.agr_coste || externalData.agrCoste,
        activo: externalData.activo !== false
      });
    } else {
      // Create new recurso from external data
      return await this.createRecurso(Recurso.createFromExternal(externalData));
    }
  }

  /**
   * Bulk import recursos from external system
   */
  async bulkImportRecursos(externalRecursos: any[]): Promise<{ created: number; updated: number; errors: string[] }> {
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const externalRecurso of externalRecursos) {
      try {
        const existingRecurso = await this.getRecursoByCodigo(externalRecurso.codigo);

        if (existingRecurso) {
          await this.updateRecurso(existingRecurso.id, {
            nombre: externalRecurso.nombre,
            tipo: externalRecurso.tipo === 'maquina' ? TipoRecurso.MAQUINA : TipoRecurso.OPERARIO,
            agrCoste: externalRecurso.agr_coste || externalRecurso.agrCoste,
            activo: externalRecurso.activo !== false
          });
          updated++;
        } else {
          await this.createRecurso(Recurso.createFromExternal(externalRecurso));
          created++;
        }
      } catch (error) {
        errors.push(`Error con recurso ${externalRecurso.codigo}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    return { created, updated, errors };
  }

  /**
   * Get aggregated coste types
   */
  async getAgrCosteTypes(): Promise<string[]> {
    const recursos = await this.recursoRepository.find({
      select: ['agrCoste'],
      where: { activo: true }
    });

    const uniqueTypes = [...new Set(recursos.map(r => r.agrCoste))];
    return uniqueTypes.sort();
  }
}

export const recursoService = new RecursoService();