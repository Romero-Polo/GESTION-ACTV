import request from 'supertest';
import app from '../../index';
import { AppDataSource } from '../../utils/database';
import { Actividad } from '../../models/Actividad';
import { Usuario, RolUsuario } from '../../models/Usuario';
import { actividadService } from '../../services/ActividadService';
import jwt from 'jsonwebtoken';

// Mock the service
jest.mock('../../services/ActividadService');
const mockActividadService = actividadService as jest.Mocked<typeof actividadService>;

// Mock JWT
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('ActividadController', () => {
  const mockAdmin = {
    id: 1,
    email: 'admin@test.com',
    name: 'Admin User',
    rol: RolUsuario.ADMINISTRADOR
  };

  const mockOperario = {
    id: 2,
    email: 'operario@test.com',
    name: 'Operario User',
    rol: RolUsuario.OPERARIO
  };

  const mockJefe = {
    id: 3,
    email: 'jefe@test.com',
    name: 'Jefe User',
    rol: RolUsuario.JEFE_EQUIPO
  };

  const mockActividad: Partial<Actividad> = {
    id: 1,
    obra: {
      id: 1,
      codigo: 'OBR001',
      descripcion: 'Test Obra',
      activo: true,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    } as any,
    recurso: {
      id: 1,
      codigo: 'OP001',
      nombre: 'Juan Pérez',
      tipo: 'operario' as any,
      activo: true,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    } as any,
    tipoActividad: {
      id: 1,
      codigo: 'TRB001',
      nombre: 'Trabajo General',
      activo: true,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    } as any,
    fechaInicio: '2024-01-15',
    horaInicio: '08:00',
    fechaFin: '2024-01-15',
    horaFin: '17:00',
    observaciones: 'Test observation',
    usuarioCreacion: mockOperario as any,
    fechaCreacion: new Date(),
    fechaModificacion: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock JWT verification
    mockJwt.verify.mockImplementation((token: string) => {
      if (token === 'admin-token') return mockAdmin;
      if (token === 'operario-token') return mockOperario;
      if (token === 'jefe-token') return mockJefe;
      throw new Error('Invalid token');
    });
  });

  describe('GET /api/actividades', () => {
    it('should get actividades with role-based filtering', async () => {
      const mockResponse = {
        actividades: [mockActividad],
        total: 1,
        page: 1,
        totalPages: 1
      };

      mockActividadService.getActividades.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/actividades')
        .set('Authorization', 'Bearer admin-token')
        .query({ page: '1', limit: '10', obraId: '1' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(mockActividadService.getActividades).toHaveBeenCalledWith(
        { obraId: 1 },
        { page: 1, limit: 10 },
        RolUsuario.ADMINISTRADOR,
        1
      );
    });

    it('should handle date filters', async () => {
      const mockResponse = {
        actividades: [mockActividad],
        total: 1,
        page: 1,
        totalPages: 1
      };

      mockActividadService.getActividades.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/actividades')
        .set('Authorization', 'Bearer admin-token')
        .query({
          fechaDesde: '2024-01-01',
          fechaHasta: '2024-01-31',
          jornada: 'cerrada'
        });

      expect(response.status).toBe(200);
      expect(mockActividadService.getActividades).toHaveBeenCalledWith(
        {
          fechaDesde: '2024-01-01',
          fechaHasta: '2024-01-31',
          jornada: 'cerrada'
        },
        { page: 1, limit: 10 },
        RolUsuario.ADMINISTRADOR,
        1
      );
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/actividades');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/actividades/:id', () => {
    it('should get actividad by ID with role-based access', async () => {
      mockActividadService.getActividadById.mockResolvedValue(mockActividad as Actividad);

      const response = await request(app)
        .get('/api/actividades/1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.actividad).toEqual(mockActividad);
      expect(mockActividadService.getActividadById).toHaveBeenCalledWith(1, RolUsuario.ADMINISTRADOR, 1);
    });

    it('should return 404 when actividad not found', async () => {
      mockActividadService.getActividadById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/actividades/999')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Actividad no encontrada');
    });

    it('should validate ID parameter', async () => {
      const response = await request(app)
        .get('/api/actividades/invalid')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Errores de validación');
    });
  });

  describe('POST /api/actividades', () => {
    const newActividadData = {
      obraId: 1,
      recursoId: 1,
      tipoActividadId: 1,
      fechaInicio: '2024-01-15',
      horaInicio: '08:00',
      observaciones: 'Nueva actividad'
    };

    it('should create new actividad', async () => {
      mockActividadService.createActividad.mockResolvedValue({ ...mockActividad, ...newActividadData } as Actividad);

      const response = await request(app)
        .post('/api/actividades')
        .set('Authorization', 'Bearer admin-token')
        .send(newActividadData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Actividad creada exitosamente');
      expect(mockActividadService.createActividad).toHaveBeenCalledWith({
        ...newActividadData,
        usuarioCreacionId: 1
      });
    });

    it('should allow operarios to create activities', async () => {
      mockActividadService.createActividad.mockResolvedValue({ ...mockActividad, ...newActividadData } as Actividad);

      const response = await request(app)
        .post('/api/actividades')
        .set('Authorization', 'Bearer operario-token')
        .send(newActividadData);

      expect(response.status).toBe(201);
      expect(mockActividadService.createActividad).toHaveBeenCalledWith({
        ...newActividadData,
        usuarioCreacionId: 2
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/actividades')
        .set('Authorization', 'Bearer admin-token')
        .send({ obraId: 1 }); // Missing required fields

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Errores de validación');
    });

    it('should validate date format', async () => {
      const response = await request(app)
        .post('/api/actividades')
        .set('Authorization', 'Bearer admin-token')
        .send({
          ...newActividadData,
          fechaInicio: 'invalid-date'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Errores de validación');
    });

    it('should validate time format', async () => {
      const response = await request(app)
        .post('/api/actividades')
        .set('Authorization', 'Bearer admin-token')
        .send({
          ...newActividadData,
          horaInicio: '25:00' // Invalid time
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Errores de validación');
    });

    it('should handle business rule violations', async () => {
      mockActividadService.createActividad.mockRejectedValue(new Error('La obra seleccionada no está activa'));

      const response = await request(app)
        .post('/api/actividades')
        .set('Authorization', 'Bearer admin-token')
        .send(newActividadData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('La obra seleccionada no está activa');
    });
  });

  describe('PUT /api/actividades/:id', () => {
    const updateData = {
      observaciones: 'Observación actualizada',
      fechaFin: '2024-01-15',
      horaFin: '18:00'
    };

    it('should update actividad', async () => {
      mockActividadService.updateActividad.mockResolvedValue({ ...mockActividad, ...updateData } as Actividad);

      const response = await request(app)
        .put('/api/actividades/1')
        .set('Authorization', 'Bearer admin-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Actividad actualizada exitosamente');
      expect(mockActividadService.updateActividad).toHaveBeenCalledWith(
        1,
        { ...updateData, usuarioModificacionId: 1 },
        RolUsuario.ADMINISTRADOR,
        1
      );
    });

    it('should handle not found error', async () => {
      mockActividadService.updateActividad.mockRejectedValue(new Error('Actividad no encontrada o acceso denegado'));

      const response = await request(app)
        .put('/api/actividades/999')
        .set('Authorization', 'Bearer admin-token')
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Actividad no encontrada o acceso denegado');
    });
  });

  describe('DELETE /api/actividades/:id', () => {
    it('should delete actividad', async () => {
      mockActividadService.deleteActividad.mockResolvedValue();

      const response = await request(app)
        .delete('/api/actividades/1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Actividad eliminada exitosamente');
      expect(mockActividadService.deleteActividad).toHaveBeenCalledWith(1, RolUsuario.ADMINISTRADOR, 1);
    });

    it('should allow operarios to delete their own activities', async () => {
      mockActividadService.deleteActividad.mockResolvedValue();

      const response = await request(app)
        .delete('/api/actividades/1')
        .set('Authorization', 'Bearer operario-token');

      expect(response.status).toBe(200);
      expect(mockActividadService.deleteActividad).toHaveBeenCalledWith(1, RolUsuario.OPERARIO, 2);
    });
  });

  describe('GET /api/actividades/recursos', () => {
    it('should get accessible recursos for user', async () => {
      const mockRecursos = [
        { id: 1, codigo: 'OP001', nombre: 'Juan Pérez', tipo: 'operario', activo: true }
      ];

      mockActividadService.getAccessibleRecursos.mockResolvedValue(mockRecursos as any);

      const response = await request(app)
        .get('/api/actividades/recursos')
        .set('Authorization', 'Bearer operario-token');

      expect(response.status).toBe(200);
      expect(response.body.recursos).toEqual(mockRecursos);
      expect(mockActividadService.getAccessibleRecursos).toHaveBeenCalledWith(RolUsuario.OPERARIO, 2);
    });
  });

  describe('GET /api/actividades/abiertas', () => {
    it('should get open shifts', async () => {
      const mockActividades = [
        { ...mockActividad, fechaFin: null, horaFin: null }
      ];

      mockActividadService.getActividadesAbiertas.mockResolvedValue(mockActividades as Actividad[]);

      const response = await request(app)
        .get('/api/actividades/abiertas')
        .set('Authorization', 'Bearer admin-token')
        .query({ recursoId: '1' });

      expect(response.status).toBe(200);
      expect(response.body.actividades).toEqual(mockActividades);
      expect(mockActividadService.getActividadesAbiertas).toHaveBeenCalledWith(1);
    });
  });

  describe('PUT /api/actividades/:id/cerrar', () => {
    it('should close open shift', async () => {
      const closedActividad = { ...mockActividad, fechaFin: '2024-01-15', horaFin: '17:00' };
      mockActividadService.cerrarJornada.mockResolvedValue(closedActividad as Actividad);

      const response = await request(app)
        .put('/api/actividades/1/cerrar')
        .set('Authorization', 'Bearer admin-token')
        .send({ fechaFin: '2024-01-15', horaFin: '17:00' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Jornada cerrada exitosamente');
      expect(mockActividadService.cerrarJornada).toHaveBeenCalledWith(
        1,
        '2024-01-15',
        '17:00',
        RolUsuario.ADMINISTRADOR,
        1
      );
    });

    it('should validate required fields for closing', async () => {
      const response = await request(app)
        .put('/api/actividades/1/cerrar')
        .set('Authorization', 'Bearer admin-token')
        .send({ fechaFin: '2024-01-15' }); // Missing horaFin

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Fecha y hora de fin son obligatorias');
    });

    it('should handle already closed shift error', async () => {
      mockActividadService.cerrarJornada.mockRejectedValue(new Error('La jornada ya está cerrada'));

      const response = await request(app)
        .put('/api/actividades/1/cerrar')
        .set('Authorization', 'Bearer admin-token')
        .send({ fechaFin: '2024-01-15', horaFin: '17:00' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('La jornada ya está cerrada');
    });
  });

  describe('GET /api/actividades/statistics', () => {
    it('should get activity statistics', async () => {
      const mockStats = {
        totalActividades: 10,
        actividadesAbiertas: 2,
        actividadesCerradas: 8,
        totalHoras: 80
      };

      mockActividadService.getActividadStatistics.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/actividades/statistics')
        .set('Authorization', 'Bearer admin-token')
        .query({ fechaDesde: '2024-01-01', fechaHasta: '2024-01-31' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
      expect(mockActividadService.getActividadStatistics).toHaveBeenCalledWith(
        RolUsuario.ADMINISTRADOR,
        1,
        '2024-01-01',
        '2024-01-31'
      );
    });
  });
});