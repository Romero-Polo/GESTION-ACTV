import request from 'supertest';
import app from '../../index';
import { AppDataSource } from '../../utils/database';
import { Recurso, TipoRecurso } from '../../models/Recurso';
import { Usuario, RolUsuario } from '../../models/Usuario';
import { recursoService } from '../../services/RecursoService';
import jwt from 'jsonwebtoken';

// Mock the service
jest.mock('../../services/RecursoService');
const mockRecursoService = recursoService as jest.Mocked<typeof recursoService>;

// Mock JWT
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('RecursoController', () => {
  const mockAdmin = {
    id: 1,
    email: 'admin@test.com',
    name: 'Admin User',
    rol: RolUsuario.ADMINISTRADOR
  };

  const mockTecnico = {
    id: 2,
    email: 'tecnico@test.com',
    name: 'Técnico User',
    rol: RolUsuario.TECNICO_TRANSPORTE
  };

  const mockOperario = {
    id: 3,
    email: 'operario@test.com',
    name: 'Operario User',
    rol: RolUsuario.OPERARIO
  };

  const mockRecurso: Partial<Recurso> = {
    id: 1,
    codigo: 'OP001',
    nombre: 'Juan Pérez',
    tipo: TipoRecurso.OPERARIO,
    agrCoste: 'MOD',
    activo: true,
    fechaCreacion: new Date(),
    fechaActualizacion: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock JWT verification to return the user
    mockJwt.verify.mockImplementation((token: string) => {
      if (token === 'admin-token') return mockAdmin;
      if (token === 'tecnico-token') return mockTecnico;
      if (token === 'operario-token') return mockOperario;
      throw new Error('Invalid token');
    });
  });

  describe('GET /api/recursos', () => {
    it('should get recursos with filters and pagination', async () => {
      const mockResponse = {
        recursos: [mockRecurso],
        total: 1,
        page: 1,
        totalPages: 1
      };

      mockRecursoService.getRecursos.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/recursos')
        .set('Authorization', 'Bearer admin-token')
        .query({ page: '1', limit: '10', tipo: TipoRecurso.OPERARIO });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(mockRecursoService.getRecursos).toHaveBeenCalledWith(
        { tipo: TipoRecurso.OPERARIO },
        { page: 1, limit: 10 }
      );
    });

    it('should reject access for operario role', async () => {
      const response = await request(app)
        .get('/api/recursos')
        .set('Authorization', 'Bearer operario-token');

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('acceso denegado');
    });
  });

  describe('GET /api/recursos/:id', () => {
    it('should get recurso by ID', async () => {
      mockRecursoService.getRecursoById.mockResolvedValue(mockRecurso as Recurso);

      const response = await request(app)
        .get('/api/recursos/1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.recurso).toEqual(mockRecurso);
      expect(mockRecursoService.getRecursoById).toHaveBeenCalledWith(1);
    });

    it('should return 404 when recurso not found', async () => {
      mockRecursoService.getRecursoById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/recursos/999')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Recurso no encontrado');
    });
  });

  describe('GET /api/recursos/operarios', () => {
    it('should get operarios', async () => {
      const operarios = [
        { ...mockRecurso, tipo: TipoRecurso.OPERARIO },
        { id: 2, codigo: 'OP002', nombre: 'María García', tipo: TipoRecurso.OPERARIO, activo: true }
      ];

      mockRecursoService.getOperarios.mockResolvedValue(operarios as Recurso[]);

      const response = await request(app)
        .get('/api/recursos/operarios')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.operarios).toEqual(operarios);
      expect(mockRecursoService.getOperarios).toHaveBeenCalledWith(true); // activeOnly = true by default
    });

    it('should get all operarios including inactive', async () => {
      mockRecursoService.getOperarios.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/recursos/operarios')
        .set('Authorization', 'Bearer admin-token')
        .query({ activo: 'false' });

      expect(response.status).toBe(200);
      expect(mockRecursoService.getOperarios).toHaveBeenCalledWith(false);
    });
  });

  describe('GET /api/recursos/maquinas', () => {
    it('should get maquinas', async () => {
      const maquinas = [
        { id: 3, codigo: 'MAQ001', nombre: 'Excavadora', tipo: TipoRecurso.MAQUINA, activo: true }
      ];

      mockRecursoService.getMaquinas.mockResolvedValue(maquinas as Recurso[]);

      const response = await request(app)
        .get('/api/recursos/maquinas')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.maquinas).toEqual(maquinas);
      expect(mockRecursoService.getMaquinas).toHaveBeenCalledWith(true);
    });
  });

  describe('POST /api/recursos', () => {
    const newRecursoData = {
      codigo: 'OP003',
      nombre: 'Pedro López',
      tipo: TipoRecurso.OPERARIO,
      agrCoste: 'MOD',
      activo: true
    };

    it('should create new recurso', async () => {
      mockRecursoService.createRecurso.mockResolvedValue({ ...mockRecurso, ...newRecursoData } as Recurso);

      const response = await request(app)
        .post('/api/recursos')
        .set('Authorization', 'Bearer admin-token')
        .send(newRecursoData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Recurso creado exitosamente');
      expect(response.body.recurso.codigo).toBe(newRecursoData.codigo);
      expect(mockRecursoService.createRecurso).toHaveBeenCalledWith(newRecursoData);
    });

    it('should reject access for operario role', async () => {
      const response = await request(app)
        .post('/api/recursos')
        .set('Authorization', 'Bearer operario-token')
        .send(newRecursoData);

      expect(response.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/recursos')
        .set('Authorization', 'Bearer admin-token')
        .send({ codigo: 'OP003' }); // Missing required fields

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Errores de validación');
    });

    it('should validate tipo enum', async () => {
      const response = await request(app)
        .post('/api/recursos')
        .set('Authorization', 'Bearer admin-token')
        .send({ ...newRecursoData, tipo: 'invalid_type' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Errores de validación');
    });

    it('should handle duplicate codigo error', async () => {
      mockRecursoService.createRecurso.mockRejectedValue(new Error('Ya existe un recurso con el código: OP003'));

      const response = await request(app)
        .post('/api/recursos')
        .set('Authorization', 'Bearer admin-token')
        .send(newRecursoData);

      expect(response.status).toBe(409);
      expect(response.body.field).toBe('codigo');
    });

    it('should handle required field errors', async () => {
      mockRecursoService.createRecurso.mockRejectedValue(new Error('El tipo de recurso es obligatorio'));

      const response = await request(app)
        .post('/api/recursos')
        .set('Authorization', 'Bearer admin-token')
        .send(newRecursoData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('El tipo de recurso es obligatorio');
    });
  });

  describe('PUT /api/recursos/:id', () => {
    const updateData = {
      nombre: 'Juan Pérez Updated',
      activo: false
    };

    it('should update recurso', async () => {
      mockRecursoService.updateRecurso.mockResolvedValue({ ...mockRecurso, ...updateData } as Recurso);

      const response = await request(app)
        .put('/api/recursos/1')
        .set('Authorization', 'Bearer admin-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Recurso actualizado exitosamente');
      expect(mockRecursoService.updateRecurso).toHaveBeenCalledWith(1, updateData);
    });

    it('should handle not found error', async () => {
      mockRecursoService.updateRecurso.mockRejectedValue(new Error('Recurso no encontrado'));

      const response = await request(app)
        .put('/api/recursos/999')
        .set('Authorization', 'Bearer admin-token')
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Recurso no encontrado');
    });
  });

  describe('DELETE /api/recursos/:id', () => {
    it('should delete recurso', async () => {
      mockRecursoService.deleteRecurso.mockResolvedValue();

      const response = await request(app)
        .delete('/api/recursos/1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Recurso desactivado exitosamente');
      expect(mockRecursoService.deleteRecurso).toHaveBeenCalledWith(1);
    });

    it('should only allow admin to delete', async () => {
      const response = await request(app)
        .delete('/api/recursos/1')
        .set('Authorization', 'Bearer tecnico-token');

      expect(response.status).toBe(403);
    });

    it('should handle activities exist error', async () => {
      mockRecursoService.deleteRecurso.mockRejectedValue(
        new Error('No se puede desactivar el recurso porque tiene actividades asociadas')
      );

      const response = await request(app)
        .delete('/api/recursos/1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(409);
      expect(response.body.reason).toBe('ACTIVITIES_EXIST');
    });
  });

  describe('GET /api/recursos/active', () => {
    it('should get active recursos for all authenticated users', async () => {
      const activeRecursos = [
        { id: 1, codigo: 'OP001', nombre: 'Juan Pérez', tipo: TipoRecurso.OPERARIO, agrCoste: 'MOD' },
        { id: 2, codigo: 'MAQ001', nombre: 'Excavadora', tipo: TipoRecurso.MAQUINA, agrCoste: 'MAQ' }
      ];

      mockRecursoService.getActiveRecursos.mockResolvedValue(activeRecursos as Recurso[]);

      const response = await request(app)
        .get('/api/recursos/active')
        .set('Authorization', 'Bearer operario-token'); // Even operario can access

      expect(response.status).toBe(200);
      expect(response.body.recursos).toEqual(activeRecursos);
    });
  });

  describe('GET /api/recursos/search', () => {
    it('should search recursos', async () => {
      const searchResults = [
        { id: 1, codigo: 'OP001', nombre: 'Juan Pérez', tipo: TipoRecurso.OPERARIO }
      ];

      mockRecursoService.searchRecursos.mockResolvedValue(searchResults as Recurso[]);

      const response = await request(app)
        .get('/api/recursos/search')
        .set('Authorization', 'Bearer operario-token')
        .query({ q: 'juan', tipo: TipoRecurso.OPERARIO, limit: '5' });

      expect(response.status).toBe(200);
      expect(response.body.recursos).toEqual(searchResults);
      expect(mockRecursoService.searchRecursos).toHaveBeenCalledWith('juan', TipoRecurso.OPERARIO, 5);
    });

    it('should validate minimum search query length', async () => {
      const response = await request(app)
        .get('/api/recursos/search')
        .set('Authorization', 'Bearer operario-token')
        .query({ q: 'a' }); // Too short

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Query debe tener al menos 2 caracteres');
    });
  });

  describe('GET /api/recursos/agr-coste-types', () => {
    it('should get aggregated coste types', async () => {
      const costeTypes = ['MOD', 'MAQ', 'TRANS'];
      mockRecursoService.getAgrCosteTypes.mockResolvedValue(costeTypes);

      const response = await request(app)
        .get('/api/recursos/agr-coste-types')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.types).toEqual(costeTypes);
    });
  });

  describe('GET /api/recursos/:id/statistics', () => {
    it('should get recurso statistics', async () => {
      const mockStats = {
        recurso: mockRecurso,
        estadisticas: {
          totalActividades: 15,
          actividadesAbiertas: 3,
          actividadesMes: 8,
          totalHoras: 120.5
        }
      };

      mockRecursoService.getRecursoStatistics.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/recursos/1/statistics')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
      expect(mockRecursoService.getRecursoStatistics).toHaveBeenCalledWith(1);
    });
  });

  describe('PUT /api/recursos/:id/restore', () => {
    it('should restore recurso', async () => {
      const restoredRecurso = { ...mockRecurso, activo: true };
      mockRecursoService.restoreRecurso.mockResolvedValue(restoredRecurso as Recurso);

      const response = await request(app)
        .put('/api/recursos/1/restore')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Recurso reactivado exitosamente');
      expect(response.body.recurso).toEqual(restoredRecurso);
    });

    it('should only allow admin to restore', async () => {
      const response = await request(app)
        .put('/api/recursos/1/restore')
        .set('Authorization', 'Bearer tecnico-token');

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/recursos/import', () => {
    it('should import recursos (admin only)', async () => {
      const importData = {
        recursos: [
          { codigo: 'OP004', nombre: 'Ana Martín', tipo: 'operario', agrCoste: 'MOD' },
          { codigo: 'MAQ002', nombre: 'Camión', tipo: 'maquina', agrCoste: 'TRANS' }
        ]
      };

      const mockResult = { created: 2, updated: 0, errors: [] };
      mockRecursoService.bulkImportRecursos.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/recursos/import')
        .set('Authorization', 'Bearer admin-token')
        .send(importData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Importación completada');
      expect(response.body.created).toBe(2);
      expect(mockRecursoService.bulkImportRecursos).toHaveBeenCalledWith(importData.recursos);
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .post('/api/recursos/import')
        .set('Authorization', 'Bearer tecnico-token')
        .send({ recursos: [] });

      expect(response.status).toBe(403);
    });
  });
});