import { Repository, FindManyOptions, Between, In, IsNull, Not, MoreThanOrEqual, LessThanOrEqual, Raw } from 'typeorm';
import { AppDataSource } from '../utils/database';
import { Actividad } from '../models/Actividad';
import { Obra } from '../models/Obra';
import { Recurso } from '../models/Recurso';
import { TipoActividad } from '../models/TipoActividad';
import { Usuario, RolUsuario } from '../models/Usuario';

export interface ActividadFilters {
  obraId?: number;
  recursoId?: number;
  tipoActividadId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  jornada?: 'abierta' | 'cerrada';
  usuarioId?: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface ActividadResponse {
  actividades: Actividad[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateActividadData {
  obraId: number;
  recursoId: number;
  tipoActividadId: number;
  fechaInicio: string;
  horaInicio: string;
  fechaFin?: string;
  horaFin?: string;
  observaciones?: string;
  usuarioCreacionId: number;
}

export interface UpdateActividadData extends Partial<CreateActividadData> {
  usuarioModificacionId?: number;
}

export interface OverlapValidationResult {
  hasOverlap: boolean;
  conflictingActivities: Actividad[];
  message?: string;
}

export interface JornadaCalculationResult {
  calculatedEndTime?: { fecha: string; hora: string };
  affectedActivities: Actividad[];
}

export class ActividadService {
  private actividadRepository: Repository<Actividad>;
  private obraRepository: Repository<Obra>;
  private recursoRepository: Repository<Recurso>;
  private tipoActividadRepository: Repository<TipoActividad>;
  private usuarioRepository: Repository<Usuario>;

  constructor() {
    this.actividadRepository = AppDataSource.getRepository(Actividad);
    this.obraRepository = AppDataSource.getRepository(Obra);
    this.recursoRepository = AppDataSource.getRepository(Recurso);
    this.tipoActividadRepository = AppDataSource.getRepository(TipoActividad);
    this.usuarioRepository = AppDataSource.getRepository(Usuario);
  }

  /**
   * Get actividades with filters, pagination and role-based access
   */
  async getActividades(
    filters: ActividadFilters = {},
    pagination: PaginationOptions = {},
    userRole: RolUsuario,
    userId: number
  ): Promise<ActividadResponse> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const queryOptions: FindManyOptions<Actividad> = {
      skip,
      take: limit,
      order: { fechaInicio: 'DESC', horaInicio: 'DESC' },
      where: {},
      relations: ['obra', 'recurso', 'tipoActividad', 'usuarioCreacion']
    };

    // Apply role-based filtering
    if (userRole === RolUsuario.OPERARIO) {
      // Operarios only see their own activities
      const usuario = await this.usuarioRepository.findOne({
        where: { id: userId },
        relations: ['recursoOperario']
      });

      if (usuario?.recursoOperario) {
        queryOptions.where = { ...queryOptions.where, recursoId: usuario.recursoOperario.id };
      } else {
        // If operario has no associated resource, return empty
        return { actividades: [], total: 0, page: 1, totalPages: 0 };
      }
    }

    // Apply additional filters
    if (filters.obraId) {
      queryOptions.where = { ...queryOptions.where, obraId: filters.obraId };
    }

    if (filters.recursoId) {
      queryOptions.where = { ...queryOptions.where, recursoId: filters.recursoId };
    }

    if (filters.tipoActividadId) {
      queryOptions.where = { ...queryOptions.where, tipoActividadId: filters.tipoActividadId };
    }

    if (filters.usuarioId) {
      queryOptions.where = { ...queryOptions.where, usuarioCreacionId: filters.usuarioId };
    }

    // Date range filtering
    if (filters.fechaDesde && filters.fechaHasta) {
      queryOptions.where = {
        ...queryOptions.where,
        fechaInicio: Between(filters.fechaDesde, filters.fechaHasta)
      };
    } else if (filters.fechaDesde) {
      queryOptions.where = {
        ...queryOptions.where,
        fechaInicio: MoreThanOrEqual(filters.fechaDesde)
      };
    } else if (filters.fechaHasta) {
      queryOptions.where = {
        ...queryOptions.where,
        fechaInicio: LessThanOrEqual(filters.fechaHasta)
      };
    }

    // Jornada filter (open/closed shifts)
    if (filters.jornada) {
      if (filters.jornada === 'abierta') {
        queryOptions.where = [
          { ...queryOptions.where, fechaFin: IsNull() },
          { ...queryOptions.where, horaFin: IsNull() }
        ];
      } else if (filters.jornada === 'cerrada') {
        queryOptions.where = {
          ...queryOptions.where,
          fechaFin: Not(IsNull()),
          horaFin: Not(IsNull())
        };
      }
    }

    const [actividades, total] = await this.actividadRepository.findAndCount(queryOptions);
    const totalPages = Math.ceil(total / limit);

    return {
      actividades,
      total,
      page,
      totalPages
    };
  }

  /**
   * Get actividad by ID with role-based access control
   */
  async getActividadById(
    id: number,
    userRole: RolUsuario,
    userId: number
  ): Promise<Actividad | null> {
    const actividad = await this.actividadRepository.findOne({
      where: { id },
      relations: ['obra', 'recurso', 'tipoActividad', 'usuarioCreacion', 'usuarioModificacion']
    });

    if (!actividad) {
      return null;
    }

    // Check role-based access
    if (userRole === RolUsuario.OPERARIO) {
      const usuario = await this.usuarioRepository.findOne({
        where: { id: userId },
        relations: ['recursoOperario']
      });

      if (!usuario?.recursoOperario || actividad.recursoId !== usuario.recursoOperario.id) {
        return null; // Operario can only access their own activities
      }
    }

    return actividad;
  }

  /**
   * Create new actividad
   */
  async createActividad(actividadData: CreateActividadData): Promise<Actividad> {
    // Validate referenced entities exist and are active
    const [obra, recurso, tipoActividad, usuario] = await Promise.all([
      this.obraRepository.findOne({ where: { id: actividadData.obraId } }),
      this.recursoRepository.findOne({ where: { id: actividadData.recursoId } }),
      this.tipoActividadRepository.findOne({ where: { id: actividadData.tipoActividadId } }),
      this.usuarioRepository.findOne({ where: { id: actividadData.usuarioCreacionId } })
    ]);

    if (!obra) {
      throw new Error('Obra no encontrada');
    }

    if (!obra.activo) {
      throw new Error('La obra seleccionada no está activa');
    }

    if (!recurso) {
      throw new Error('Recurso no encontrado');
    }

    if (!recurso.activo) {
      throw new Error('El recurso seleccionado no está activo');
    }

    if (!tipoActividad) {
      throw new Error('Tipo de actividad no encontrado');
    }

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    // Validate time format and logic
    this.validateTimeFields(actividadData);

    // Create actividad
    const actividad = new Actividad({
      ...actividadData,
      usuarioCreacionId: actividadData.usuarioCreacionId
    });

    return await this.actividadRepository.save(actividad);
  }

  /**
   * Update actividad
   */
  async updateActividad(
    id: number,
    updateData: UpdateActividadData,
    userRole: RolUsuario,
    userId: number
  ): Promise<Actividad> {
    const actividad = await this.getActividadById(id, userRole, userId);

    if (!actividad) {
      throw new Error('Actividad no encontrada o acceso denegado');
    }

    // Validate referenced entities if being updated
    if (updateData.obraId && updateData.obraId !== actividad.obraId) {
      const obra = await this.obraRepository.findOne({ where: { id: updateData.obraId } });
      if (!obra || !obra.activo) {
        throw new Error('Obra no válida');
      }
    }

    if (updateData.recursoId && updateData.recursoId !== actividad.recursoId) {
      const recurso = await this.recursoRepository.findOne({ where: { id: updateData.recursoId } });
      if (!recurso || !recurso.activo) {
        throw new Error('Recurso no válido');
      }
    }

    if (updateData.tipoActividadId && updateData.tipoActividadId !== actividad.tipoActividadId) {
      const tipoActividad = await this.tipoActividadRepository.findOne({
        where: { id: updateData.tipoActividadId }
      });
      if (!tipoActividad) {
        throw new Error('Tipo de actividad no válido');
      }
    }

    // Validate time fields if being updated
    if (updateData.fechaInicio || updateData.horaInicio || updateData.fechaFin || updateData.horaFin) {
      this.validateTimeFields({
        fechaInicio: updateData.fechaInicio || actividad.fechaInicio,
        horaInicio: updateData.horaInicio || actividad.horaInicio,
        fechaFin: updateData.fechaFin || actividad.fechaFin,
        horaFin: updateData.horaFin || actividad.horaFin
      });
    }

    // Update fields
    Object.assign(actividad, updateData);
    actividad.usuarioModificacionId = updateData.usuarioModificacionId || userId;

    return await this.actividadRepository.save(actividad);
  }

  /**
   * Delete actividad
   */
  async deleteActividad(
    id: number,
    userRole: RolUsuario,
    userId: number
  ): Promise<void> {
    const actividad = await this.getActividadById(id, userRole, userId);

    if (!actividad) {
      throw new Error('Actividad no encontrada o acceso denegado');
    }

    await this.actividadRepository.remove(actividad);
  }

  /**
   * Get user's accessible recursos based on role
   */
  async getAccessibleRecursos(userRole: RolUsuario, userId: number): Promise<Recurso[]> {
    if (userRole === RolUsuario.ADMINISTRADOR) {
      return await this.recursoRepository.find({
        where: { activo: true },
        order: { tipo: 'ASC', codigo: 'ASC' }
      });
    }

    if (userRole === RolUsuario.OPERARIO) {
      const usuario = await this.usuarioRepository.findOne({
        where: { id: userId },
        relations: ['recursoOperario']
      });

      return usuario?.recursoOperario ? [usuario.recursoOperario] : [];
    }

    // For Jefe de Equipo and Técnico de Transporte - for now return all active resources
    // In the future, this could be filtered by assigned team/zone
    return await this.recursoRepository.find({
      where: { activo: true },
      order: { tipo: 'ASC', codigo: 'ASC' }
    });
  }

  /**
   * Get actividades abiertas (open shifts) for a specific recurso
   */
  async getActividadesAbiertas(recursoId?: number): Promise<Actividad[]> {
    const where: any = {
      fechaFin: null
    };

    if (recursoId) {
      where.recursoId = recursoId;
    }

    return await this.actividadRepository.find({
      where,
      relations: ['obra', 'recurso', 'tipoActividad'],
      order: { fechaInicio: 'DESC', horaInicio: 'DESC' }
    });
  }

  /**
   * Close an open shift
   */
  async cerrarJornada(
    id: number,
    fechaFin: string,
    horaFin: string,
    userRole: RolUsuario,
    userId: number
  ): Promise<Actividad> {
    const actividad = await this.getActividadById(id, userRole, userId);

    if (!actividad) {
      throw new Error('Actividad no encontrada o acceso denegado');
    }

    if (!actividad.isJornadaAbierta()) {
      throw new Error('La jornada ya está cerrada');
    }

    // Validate end time is after start time
    this.validateTimeFields({
      fechaInicio: actividad.fechaInicio,
      horaInicio: actividad.horaInicio,
      fechaFin,
      horaFin
    });

    actividad.fechaFin = fechaFin;
    actividad.horaFin = horaFin;
    actividad.usuarioModificacionId = userId;

    return await this.actividadRepository.save(actividad);
  }

  /**
   * Validate time fields consistency
   */
  private validateTimeFields(data: {
    fechaInicio: string;
    horaInicio: string;
    fechaFin?: string;
    horaFin?: string;
  }): void {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.fechaInicio)) {
      throw new Error('Formato de fecha de inicio inválido (debe ser YYYY-MM-DD)');
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(data.horaInicio)) {
      throw new Error('Formato de hora de inicio inválido (debe ser HH:MM)');
    }

    // If end date/time provided, validate them
    if (data.fechaFin || data.horaFin) {
      if (!data.fechaFin) {
        throw new Error('Fecha de fin es obligatoria si se proporciona hora de fin');
      }

      if (!data.horaFin) {
        throw new Error('Hora de fin es obligatoria si se proporciona fecha de fin');
      }

      if (!dateRegex.test(data.fechaFin)) {
        throw new Error('Formato de fecha de fin inválido (debe ser YYYY-MM-DD)');
      }

      if (!timeRegex.test(data.horaFin)) {
        throw new Error('Formato de hora de fin inválido (debe ser HH:MM)');
      }

      // Validate end is after start
      const startDateTime = new Date(`${data.fechaInicio}T${data.horaInicio}`);
      const endDateTime = new Date(`${data.fechaFin}T${data.horaFin}`);

      if (endDateTime <= startDateTime) {
        throw new Error('La fecha y hora de fin debe ser posterior a la de inicio');
      }
    }
  }

  /**
   * Get activity statistics for a user
   */
  async getActividadStatistics(
    userRole: RolUsuario,
    userId: number,
    fechaDesde?: string,
    fechaHasta?: string
  ): Promise<any> {
    const filters: ActividadFilters = {};

    if (fechaDesde) filters.fechaDesde = fechaDesde;
    if (fechaHasta) filters.fechaHasta = fechaHasta;

    const { actividades } = await this.getActividades(filters, { page: 1, limit: 1000 }, userRole, userId);

    const totalActividades = actividades.length;
    const actividadesAbiertas = actividades.filter(a => a.isJornadaAbierta()).length;
    const actividadesCerradas = totalActividades - actividadesAbiertas;

    let totalHoras = 0;
    actividades
      .filter(a => !a.isJornadaAbierta())
      .forEach(actividad => {
        const horas = actividad.getDurationInHours();
        if (horas) {
          totalHoras += horas;
        }
      });

    return {
      totalActividades,
      actividadesAbiertas,
      actividadesCerradas,
      totalHoras: Math.round(totalHoras * 100) / 100
    };
  }

  /**
   * Validate if an activity overlaps with existing activities for the same resource
   */
  async validarSolapamiento(
    actividadData: CreateActividadData | UpdateActividadData,
    excludeActivityId?: number
  ): Promise<OverlapValidationResult> {
    if (!actividadData.recursoId || !actividadData.fechaInicio || !actividadData.horaInicio) {
      return {
        hasOverlap: false,
        conflictingActivities: []
      };
    }

    // Create a temporary activity object for validation
    const tempActividad = new Actividad({
      recursoId: actividadData.recursoId,
      fechaInicio: actividadData.fechaInicio,
      horaInicio: actividadData.horaInicio,
      fechaFin: actividadData.fechaFin,
      horaFin: actividadData.horaFin
    });

    // Get all activities for the same resource around the same date range
    const dateStart = new Date(actividadData.fechaInicio);
    dateStart.setDate(dateStart.getDate() - 1); // Include previous day

    const dateEnd = actividadData.fechaFin ?
      new Date(actividadData.fechaFin) :
      new Date(actividadData.fechaInicio);
    dateEnd.setDate(dateEnd.getDate() + 1); // Include next day

    const existingActivities = await this.actividadRepository.find({
      where: {
        recursoId: actividadData.recursoId,
        fechaInicio: Between(
          dateStart.toISOString().split('T')[0],
          dateEnd.toISOString().split('T')[0]
        ),
        ...(excludeActivityId && { id: Not(excludeActivityId) })
      },
      relations: ['obra', 'recurso', 'tipoActividad']
    });

    const conflictingActivities: Actividad[] = [];

    for (const existingActivity of existingActivities) {
      if (tempActividad.overlapsWithActivity(existingActivity)) {
        conflictingActivities.push(existingActivity);
      }
    }

    let message: string | undefined;
    if (conflictingActivities.length > 0) {
      const conflictDetails = conflictingActivities.map(a => {
        const start = `${a.fechaInicio} ${a.horaInicio}`;
        const end = a.fechaFin && a.horaFin ? ` - ${a.fechaFin} ${a.horaFin}` : ' (jornada abierta)';
        return `${a.tipoActividad.nombre} (${start}${end})`;
      }).join(', ');

      message = `La actividad se solapa con: ${conflictDetails}`;
    }

    return {
      hasOverlap: conflictingActivities.length > 0,
      conflictingActivities,
      message
    };
  }

  /**
   * Calculate end time for open shifts based on next activity
   */
  async calcularHoraFin(actividad: Actividad): Promise<JornadaCalculationResult> {
    if (!actividad.isJornadaAbierta()) {
      return { affectedActivities: [] };
    }

    // Find next activity for the same resource after this one
    const nextActivity = await this.actividadRepository.findOne({
      where: {
        recursoId: actividad.recursoId,
        fechaInicio: Raw(alias =>
          `(${alias} > '${actividad.fechaInicio}' OR (${alias} = '${actividad.fechaInicio}' AND hora_inicio > '${actividad.horaInicio}'))`
        )
      },
      order: {
        fechaInicio: 'ASC',
        horaInicio: 'ASC'
      },
      relations: ['obra', 'recurso', 'tipoActividad']
    });

    if (nextActivity) {
      return {
        calculatedEndTime: {
          fecha: nextActivity.fechaInicio,
          hora: nextActivity.horaInicio
        },
        affectedActividades: [nextActivity]
      };
    }

    return { affectedActivities: [] };
  }

  /**
   * Recalculate open shifts when activities are inserted or modified
   */
  async recalcularJornadaAbierta(recursoId: number, fecha: string): Promise<void> {
    // Get all activities for this resource on this date, ordered by time
    const activities = await this.actividadRepository.find({
      where: {
        recursoId,
        fechaInicio: fecha
      },
      order: {
        horaInicio: 'ASC'
      }
    });

    // Process each activity to update open shifts
    for (let i = 0; i < activities.length; i++) {
      const currentActivity = activities[i];
      const nextActivity = i < activities.length - 1 ? activities[i + 1] : null;

      // If current activity is open and there's a next activity
      if (currentActivity.isJornadaAbierta() && nextActivity) {
        currentActivity.fechaFin = nextActivity.fechaInicio;
        currentActivity.horaFin = nextActivity.horaInicio;
        await this.actividadRepository.save(currentActivity);
      }
    }
  }

  /**
   * Get all activities for a resource on a specific date
   */
  async obtenerActividadesPorRecurso(
    recursoId: number,
    fecha: string,
    includeRelations = true
  ): Promise<Actividad[]> {
    return await this.actividadRepository.find({
      where: {
        recursoId,
        fechaInicio: fecha
      },
      order: {
        horaInicio: 'ASC'
      },
      ...(includeRelations && {
        relations: ['obra', 'recurso', 'tipoActividad', 'usuarioCreacion']
      })
    });
  }

  /**
   * Get suggested available time slots for a resource on a date
   */
  async getSuggestedTimeSlots(
    recursoId: number,
    fecha: string,
    durationMinutes = 60
  ): Promise<Array<{ start: string; end: string }>> {
    const activities = await this.obtenerActividadesPorRecurso(recursoId, fecha, false);

    const timeSlots: Array<{ start: string; end: string }> = [];
    const dayStart = '06:00'; // Start suggesting from 6 AM
    const dayEnd = '22:00';   // Until 10 PM

    if (activities.length === 0) {
      // No activities, suggest full day slots
      return [{
        start: dayStart,
        end: this.addMinutesToTime(dayStart, durationMinutes)
      }];
    }

    // Sort activities by start time
    const sortedActivities = activities.sort((a, b) =>
      a.horaInicio.localeCompare(b.horaInicio)
    );

    // Check slot before first activity
    const firstActivity = sortedActivities[0];
    if (firstActivity.horaInicio > dayStart) {
      const availableMinutes = this.getMinutesBetweenTimes(dayStart, firstActivity.horaInicio);
      if (availableMinutes >= durationMinutes) {
        timeSlots.push({
          start: dayStart,
          end: this.addMinutesToTime(dayStart, durationMinutes)
        });
      }
    }

    // Check slots between activities
    for (let i = 0; i < sortedActivities.length - 1; i++) {
      const currentActivity = sortedActivities[i];
      const nextActivity = sortedActivities[i + 1];

      const currentEnd = currentActivity.horaFin || '23:59'; // Use end of day if open
      const availableMinutes = this.getMinutesBetweenTimes(currentEnd, nextActivity.horaInicio);

      if (availableMinutes >= durationMinutes) {
        timeSlots.push({
          start: currentEnd,
          end: this.addMinutesToTime(currentEnd, durationMinutes)
        });
      }
    }

    // Check slot after last activity
    const lastActivity = sortedActivities[sortedActivities.length - 1];
    if (lastActivity.horaFin && lastActivity.horaFin < dayEnd) {
      const availableMinutes = this.getMinutesBetweenTimes(lastActivity.horaFin, dayEnd);
      if (availableMinutes >= durationMinutes) {
        timeSlots.push({
          start: lastActivity.horaFin,
          end: this.addMinutesToTime(lastActivity.horaFin, durationMinutes)
        });
      }
    }

    return timeSlots.slice(0, 5); // Return up to 5 suggestions
  }

  /**
   * Enhanced create method with overlap validation
   */
  async createActividadWithValidation(actividadData: CreateActividadData): Promise<Actividad> {
    // Validate overlap
    const overlapResult = await this.validarSolapamiento(actividadData);
    if (overlapResult.hasOverlap) {
      throw new Error(overlapResult.message || 'La actividad se solapa con actividades existentes');
    }

    // Create the activity
    const actividad = await this.createActividad(actividadData);

    // Recalculate open shifts for this resource and date
    await this.recalcularJornadaAbierta(actividad.recursoId, actividad.fechaInicio);

    return actividad;
  }

  /**
   * Enhanced update method with overlap validation
   */
  async updateActividadWithValidation(
    id: number,
    updateData: UpdateActividadData,
    userRole: RolUsuario,
    userId: number
  ): Promise<Actividad> {
    // Validate overlap (excluding current activity)
    if (updateData.fechaInicio || updateData.horaInicio || updateData.fechaFin || updateData.horaFin) {
      const overlapResult = await this.validarSolapamiento(updateData, id);
      if (overlapResult.hasOverlap) {
        throw new Error(overlapResult.message || 'La actividad modificada se solapa con actividades existentes');
      }
    }

    // Update the activity
    const actividad = await this.updateActividad(id, updateData, userRole, userId);

    // Recalculate open shifts if time changed
    if (updateData.fechaInicio || updateData.horaInicio || updateData.fechaFin || updateData.horaFin) {
      await this.recalcularJornadaAbierta(actividad.recursoId, actividad.fechaInicio);
    }

    return actividad;
  }

  /**
   * Utility methods for time calculations
   */
  private addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;

    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  }

  private getMinutesBetweenTimes(startTime: string, endTime: string): number {
    const [startHours, startMins] = startTime.split(':').map(Number);
    const [endHours, endMins] = endTime.split(':').map(Number);

    const startTotalMins = startHours * 60 + startMins;
    const endTotalMins = endHours * 60 + endMins;

    return endTotalMins - startTotalMins;
  }
}

export const actividadService = new ActividadService();