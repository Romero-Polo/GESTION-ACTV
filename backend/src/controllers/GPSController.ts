import { Request, Response } from 'express';
import { AppDataSource } from '../utils/database';
import { Actividad } from '../models/Actividad';
import { RolUsuario } from '../models/Usuario';
import { Repository } from 'typeorm';

interface GPSLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
}

interface GPSTrack {
  actividadId: number;
  startLocation?: GPSLocation;
  endLocation?: GPSLocation;
  waypoints?: GPSLocation[];
  totalDistance?: number;
}

export class GPSController {
  private actividadRepository: Repository<Actividad>;

  constructor() {
    this.actividadRepository = AppDataSource.getRepository(Actividad);
  }

  /**
   * Record GPS location for activity start
   * POST /api/gps/activity/:id/start-location
   *
   * Future implementation will:
   * - Validate GPS coordinates
   * - Store location with high precision
   * - Trigger location-based business rules
   * - Generate activity location logs
   */
  async recordStartLocation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.rol;
      const actividadId = parseInt(req.params.id);
      const { latitude, longitude, accuracy } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      if (isNaN(actividadId)) {
        res.status(400).json({
          success: false,
          message: 'ID de actividad inválido'
        });
        return;
      }

      // Validate GPS coordinates
      if (!this.isValidGPSCoordinate(latitude, longitude)) {
        res.status(400).json({
          success: false,
          message: 'Coordenadas GPS inválidas'
        });
        return;
      }

      // Find the activity
      const actividad = await this.actividadRepository.findOne({
        where: { id: actividadId },
        relations: ['recurso', 'obra', 'usuarioCreacion']
      });

      if (!actividad) {
        res.status(404).json({
          success: false,
          message: 'Actividad no encontrada'
        });
        return;
      }

      // Check permissions
      const hasPermission = this.checkGPSPermission(userRole, userId, actividad);
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Sin permisos para registrar GPS en esta actividad'
        });
        return;
      }

      // Future implementation: Update GPS coordinates
      // For now, we'll prepare the structure but not actually update
      const gpsData = {
        latitudInicio: latitude,
        longitudInicio: longitude,
        // Store accuracy and timestamp in metadata for future use
        gpsMetadata: {
          startAccuracy: accuracy,
          startTimestamp: new Date().toISOString(),
          deviceInfo: req.get('User-Agent')
        }
      };

      // TODO: Implement actual GPS data storage when mobile app is ready
      // actividad.latitudInicio = latitude;
      // actividad.longitudInicio = longitude;
      // await this.actividadRepository.save(actividad);

      res.json({
        success: true,
        message: 'Ubicación de inicio registrada (preparado para implementación futura)',
        data: {
          actividadId: actividad.id,
          gpsRegistered: true,
          coordinates: { latitude, longitude },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error('GPS start location error:', error);
      res.status(500).json({
        success: false,
        message: 'Error registrando ubicación de inicio',
        error: error.message
      });
    }
  }

  /**
   * Record GPS location for activity end
   * POST /api/gps/activity/:id/end-location
   */
  async recordEndLocation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.rol;
      const actividadId = parseInt(req.params.id);
      const { latitude, longitude, accuracy, totalDistance } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      if (isNaN(actividadId)) {
        res.status(400).json({
          success: false,
          message: 'ID de actividad inválido'
        });
        return;
      }

      if (!this.isValidGPSCoordinate(latitude, longitude)) {
        res.status(400).json({
          success: false,
          message: 'Coordenadas GPS inválidas'
        });
        return;
      }

      const actividad = await this.actividadRepository.findOne({
        where: { id: actividadId },
        relations: ['recurso', 'obra', 'usuarioCreacion']
      });

      if (!actividad) {
        res.status(404).json({
          success: false,
          message: 'Actividad no encontrada'
        });
        return;
      }

      const hasPermission = this.checkGPSPermission(userRole, userId, actividad);
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Sin permisos para registrar GPS en esta actividad'
        });
        return;
      }

      // Calculate distance if start location exists (future implementation)
      let calculatedDistance = totalDistance;
      if (actividad.latitudInicio && actividad.longitudInicio) {
        calculatedDistance = this.calculateDistance(
          actividad.latitudInicio,
          actividad.longitudInicio,
          latitude,
          longitude
        );
      }

      // Future implementation structure
      const gpsData = {
        latitudFin: latitude,
        longitudFin: longitude,
        kmRecorridos: calculatedDistance,
        gpsMetadata: {
          endAccuracy: accuracy,
          endTimestamp: new Date().toISOString(),
          totalDistance: calculatedDistance
        }
      };

      // TODO: Implement when mobile app is ready
      // actividad.latitudFin = latitude;
      // actividad.longitudFin = longitude;
      // actividad.kmRecorridos = calculatedDistance;
      // await this.actividadRepository.save(actividad);

      res.json({
        success: true,
        message: 'Ubicación de fin registrada (preparado para implementación futura)',
        data: {
          actividadId: actividad.id,
          gpsRegistered: true,
          coordinates: { latitude, longitude },
          calculatedDistance,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error('GPS end location error:', error);
      res.status(500).json({
        success: false,
        message: 'Error registrando ubicación de fin',
        error: error.message
      });
    }
  }

  /**
   * Record GPS track (waypoints) for activity
   * POST /api/gps/activity/:id/track
   */
  async recordTrack(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.rol;
      const actividadId = parseInt(req.params.id);
      const { waypoints }: { waypoints: GPSLocation[] } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      if (!waypoints || !Array.isArray(waypoints) || waypoints.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Waypoints GPS requeridos'
        });
        return;
      }

      // Validate all waypoints
      const invalidWaypoint = waypoints.find(wp =>
        !this.isValidGPSCoordinate(wp.latitude, wp.longitude)
      );

      if (invalidWaypoint) {
        res.status(400).json({
          success: false,
          message: 'Waypoint con coordenadas GPS inválidas'
        });
        return;
      }

      const actividad = await this.actividadRepository.findOne({
        where: { id: actividadId },
        relations: ['recurso', 'obra', 'usuarioCreacion']
      });

      if (!actividad) {
        res.status(404).json({
          success: false,
          message: 'Actividad no encontrada'
        });
        return;
      }

      const hasPermission = this.checkGPSPermission(userRole, userId, actividad);
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Sin permisos para registrar GPS en esta actividad'
        });
        return;
      }

      // Calculate total distance from waypoints
      const totalDistance = this.calculateTrackDistance(waypoints);

      // Future implementation: Store track data in separate GPS_Tracks table
      const trackData = {
        actividadId,
        waypoints,
        totalDistance,
        recordedAt: new Date().toISOString(),
        deviceInfo: req.get('User-Agent')
      };

      res.json({
        success: true,
        message: `Track GPS registrado con ${waypoints.length} waypoints (preparado para implementación futura)`,
        data: {
          actividadId,
          waypointCount: waypoints.length,
          totalDistance,
          timespan: {
            start: waypoints[0].timestamp,
            end: waypoints[waypoints.length - 1].timestamp
          }
        }
      });

    } catch (error: any) {
      console.error('GPS track error:', error);
      res.status(500).json({
        success: false,
        message: 'Error registrando track GPS',
        error: error.message
      });
    }
  }

  /**
   * Get GPS data for activity (future implementation)
   * GET /api/gps/activity/:id
   */
  async getActivityGPS(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.rol;
      const actividadId = parseInt(req.params.id);

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const actividad = await this.actividadRepository.findOne({
        where: { id: actividadId },
        relations: ['recurso', 'obra', 'usuarioCreacion']
      });

      if (!actividad) {
        res.status(404).json({
          success: false,
          message: 'Actividad no encontrada'
        });
        return;
      }

      const hasPermission = this.checkGPSPermission(userRole, userId, actividad);
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Sin permisos para ver GPS de esta actividad'
        });
        return;
      }

      // Return current GPS data (if any)
      const gpsData = {
        actividadId,
        hasGPSData: !!(actividad.latitudInicio || actividad.latitudFin),
        startLocation: actividad.latitudInicio && actividad.longitudInicio ? {
          latitude: actividad.latitudInicio,
          longitude: actividad.longitudInicio
        } : null,
        endLocation: actividad.latitudFin && actividad.longitudFin ? {
          latitude: actividad.latitudFin,
          longitude: actividad.longitudFin
        } : null,
        kmRecorridos: actividad.kmRecorridos || null,
        // Future: track data from GPS_Tracks table
        trackAvailable: false
      };

      res.json({
        success: true,
        data: gpsData
      });

    } catch (error: any) {
      console.error('Get GPS data error:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo datos GPS',
        error: error.message
      });
    }
  }

  /**
   * Get GPS summary for multiple activities
   * POST /api/gps/activities/summary
   */
  async getActivitiesGPSSummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.rol;
      const { actividadIds, fechaInicio, fechaFin } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      // Build query based on filters
      const queryBuilder = this.actividadRepository.createQueryBuilder('actividad')
        .leftJoinAndSelect('actividad.recurso', 'recurso')
        .leftJoinAndSelect('actividad.obra', 'obra')
        .select([
          'actividad.id',
          'actividad.fechaInicio',
          'actividad.latitudInicio',
          'actividad.longitudInicio',
          'actividad.latitudFin',
          'actividad.longitudFin',
          'actividad.kmRecorridos',
          'recurso.codigo',
          'recurso.nombre',
          'recurso.tipo',
          'obra.codigo',
          'obra.descripcion'
        ]);

      // Apply role-based filtering
      if (userRole === RolUsuario.OPERARIO) {
        queryBuilder.andWhere('actividad.usuarioCreacionId = :userId', { userId });
      }

      // Apply date filters
      if (fechaInicio && fechaFin) {
        queryBuilder.andWhere('actividad.fechaInicio BETWEEN :fechaInicio AND :fechaFin', {
          fechaInicio,
          fechaFin
        });
      }

      // Apply activity ID filter
      if (actividadIds && actividadIds.length > 0) {
        queryBuilder.andWhere('actividad.id IN (:...actividadIds)', { actividadIds });
      }

      // Only activities with GPS data
      queryBuilder.andWhere(
        '(actividad.latitudInicio IS NOT NULL OR actividad.latitudFin IS NOT NULL OR actividad.kmRecorridos IS NOT NULL)'
      );

      const actividades = await queryBuilder.getMany();

      // Calculate summary statistics
      const summary = {
        totalActivities: actividades.length,
        activitiesWithStartLocation: actividades.filter(a => a.latitudInicio && a.longitudInicio).length,
        activitiesWithEndLocation: actividades.filter(a => a.latitudFin && a.longitudFin).length,
        activitiesWithDistance: actividades.filter(a => a.kmRecorridos).length,
        totalKmRecorridos: actividades.reduce((sum, a) => sum + (a.kmRecorridos || 0), 0),
        avgKmPerActivity: 0
      };

      if (summary.activitiesWithDistance > 0) {
        summary.avgKmPerActivity = Math.round((summary.totalKmRecorridos / summary.activitiesWithDistance) * 100) / 100;
      }

      const activitiesData = actividades.map(actividad => ({
        id: actividad.id,
        fecha: actividad.fechaInicio,
        recurso: `${actividad.recurso.codigo} - ${actividad.recurso.nombre}`,
        obra: `${actividad.obra.codigo} - ${actividad.obra.descripcion}`,
        hasStartLocation: !!(actividad.latitudInicio && actividad.longitudInicio),
        hasEndLocation: !!(actividad.latitudFin && actividad.longitudFin),
        kmRecorridos: actividad.kmRecorridos || 0,
        locations: {
          start: actividad.latitudInicio && actividad.longitudInicio ? {
            lat: actividad.latitudInicio,
            lng: actividad.longitudInicio
          } : null,
          end: actividad.latitudFin && actividad.longitudFin ? {
            lat: actividad.latitudFin,
            lng: actividad.longitudFin
          } : null
        }
      }));

      res.json({
        success: true,
        data: {
          summary,
          activities: activitiesData
        }
      });

    } catch (error: any) {
      console.error('GPS summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo resumen GPS',
        error: error.message
      });
    }
  }

  // Utility methods
  private isValidGPSCoordinate(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180 &&
      !isNaN(latitude) && !isNaN(longitude)
    );
  }

  private checkGPSPermission(userRole: RolUsuario, userId: number, actividad: Actividad): boolean {
    switch (userRole) {
      case RolUsuario.ADMINISTRADOR:
        return true;
      case RolUsuario.JEFE_EQUIPO:
      case RolUsuario.TECNICO_TRANSPORTE:
        // TODO: Implement resource assignment check
        return true; // For now, allow all
      case RolUsuario.OPERARIO:
        return actividad.usuarioCreacionId === userId;
      default:
        return false;
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  private calculateTrackDistance(waypoints: GPSLocation[]): number {
    if (waypoints.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const distance = this.calculateDistance(
        waypoints[i-1].latitude,
        waypoints[i-1].longitude,
        waypoints[i].latitude,
        waypoints[i].longitude
      );
      totalDistance += distance;
    }

    return Math.round(totalDistance * 100) / 100;
  }
}