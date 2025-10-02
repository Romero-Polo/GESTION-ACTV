import request from 'supertest';
import app from '../../index';
import { AppDataSource } from '../../utils/database';
import { Obra } from '../../models/Obra';
import { Usuario, RolUsuario } from '../../models/Usuario';
import { obraService } from '../../services/ObraService';
import jwt from 'jsonwebtoken';

// Mock the service
jest.mock('../../services/ObraService');
const mockObraService = obraService as jest.Mocked<typeof obraService>;

// Mock JWT
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('ObraController', () => {
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

  const mockObra: Partial<Obra> = {
    id: 1,
    codigo: 'OBR001',
    descripcion: 'Test Obra',
    observaciones: 'Test observations',
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

  describe('GET /api/obras', () => {
    it('should get obras with filters and pagination', async () => {
      const mockResponse = {
        obras: [mockObra],
        total: 1,
        page: 1,
        totalPages: 1
      };

      mockObraService.getObras.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/obras')
        .set('Authorization', 'Bearer admin-token')
        .query({ page: '1', limit: '10' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(mockObraService.getObras).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 10 }
      );
    });

    it('should reject access for operario role', async () => {
      const response = await request(app)
        .get('/api/obras')
        .set('Authorization', 'Bearer operario-token');

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('acceso denegado');
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .get('/api/obras')
        .set('Authorization', 'Bearer admin-token')
        .query({ page: 'invalid', limit: '200' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Errores de validación');
    });
  });

  describe('GET /api/obras/:id', () => {
    it('should get obra by ID', async () => {
      mockObraService.getObraById.mockResolvedValue(mockObra as Obra);

      const response = await request(app)
        .get('/api/obras/1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.obra).toEqual(mockObra);
      expect(mockObraService.getObraById).toHaveBeenCalledWith(1);
    });

    it('should return 404 when obra not found', async () => {
      mockObraService.getObraById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/obras/999')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Obra no encontrada');
    });

    it('should validate ID parameter', async () => {
      const response = await request(app)
        .get('/api/obras/invalid')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Errores de validación');
    });
  });

  describe('POST /api/obras', () => {
    const newObraData = {
      codigo: 'OBR002',
      descripcion: 'New Obra',
      observaciones: 'New observations',
      activo: true
    };

    it('should create new obra', async () => {
      mockObraService.createObra.mockResolvedValue({ ...mockObra, ...newObraData } as Obra);

      const response = await request(app)
        .post('/api/obras')
        .set('Authorization', 'Bearer admin-token')
        .send(newObraData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Obra creada exitosamente');
      expect(response.body.obra.codigo).toBe(newObraData.codigo);
      expect(mockObraService.createObra).toHaveBeenCalledWith(newObraData);
    });

    it('should reject access for operario role', async () => {
      const response = await request(app)
        .post('/api/obras')
        .set('Authorization', 'Bearer operario-token')
        .send(newObraData);

      expect(response.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/obras')
        .set('Authorization', 'Bearer admin-token')
        .send({ descripcion: 'Missing codigo' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Errores de validación');
    });

    it('should handle duplicate codigo error', async () => {
      mockObraService.createObra.mockRejectedValue(new Error('Ya existe una obra con el código: OBR002'));

      const response = await request(app)
        .post('/api/obras')
        .set('Authorization', 'Bearer admin-token')
        .send(newObraData);

      expect(response.status).toBe(409);
      expect(response.body.field).toBe('codigo');
    });
  });

  describe('PUT /api/obras/:id', () => {
    const updateData = {
      descripcion: 'Updated Obra',
      activo: false
    };

    it('should update obra', async () => {
      mockObraService.updateObra.mockResolvedValue({ ...mockObra, ...updateData } as Obra);

      const response = await request(app)
        .put('/api/obras/1')
        .set('Authorization', 'Bearer admin-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Obra actualizada exitosamente');
      expect(mockObraService.updateObra).toHaveBeenCalledWith(1, updateData);
    });

    it('should handle not found error', async () => {
      mockObraService.updateObra.mockRejectedValue(new Error('Obra no encontrada'));

      const response = await request(app)
        .put('/api/obras/999')
        .set('Authorization', 'Bearer admin-token')
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Obra no encontrada');
    });
  });

  describe('DELETE /api/obras/:id', () => {
    it('should delete obra', async () => {
      mockObraService.deleteObra.mockResolvedValue();

      const response = await request(app)
        .delete('/api/obras/1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Obra desactivada exitosamente');
      expect(mockObraService.deleteObra).toHaveBeenCalledWith(1);
    });

    it('should only allow admin to delete', async () => {
      const response = await request(app)
        .delete('/api/obras/1')
        .set('Authorization', 'Bearer tecnico-token');

      expect(response.status).toBe(403);
    });

    it('should handle activities exist error', async () => {
      mockObraService.deleteObra.mockRejectedValue(
        new Error('No se puede desactivar la obra porque tiene actividades asociadas')
      );

      const response = await request(app)
        .delete('/api/obras/1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(409);
      expect(response.body.reason).toBe('ACTIVITIES_EXIST');
    });
  });

  describe('GET /api/obras/active', () => {
    it('should get active obras for all authenticated users', async () => {
      const activeObras = [{ id: 1, codigo: 'OBR001', descripcion: 'Active Obra' }];
      mockObraService.getActiveObras.mockResolvedValue(activeObras as Obra[]);

      const response = await request(app)
        .get('/api/obras/active')
        .set('Authorization', 'Bearer operario-token'); // Even operario can access

      expect(response.status).toBe(200);
      expect(response.body.obras).toEqual(activeObras);
    });
  });

  describe('GET /api/obras/:id/statistics', () => {
    it('should get obra statistics', async () => {
      const mockStats = {
        obra: mockObra,
        estadisticas: {
          totalActividades: 10,
          actividadesAbiertas: 2,
          totalHoras: 40.5
        }
      };

      mockObraService.getObraStatistics.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/obras/1/statistics')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
      expect(mockObraService.getObraStatistics).toHaveBeenCalledWith(1);
    });
  });

  describe('POST /api/obras/import', () => {
    it('should import obras (admin only)', async () => {
      const importData = {
        obras: [
          { codigo: 'OBR003', descripcion: 'Imported Obra 1' },
          { codigo: 'OBR004', descripcion: 'Imported Obra 2' }
        ]
      };

      const mockResult = { created: 2, updated: 0, errors: [] };
      mockObraService.bulkImportObras.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/obras/import')
        .set('Authorization', 'Bearer admin-token')
        .send(importData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Importación completada');
      expect(response.body.created).toBe(2);
      expect(mockObraService.bulkImportObras).toHaveBeenCalledWith(importData.obras);
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .post('/api/obras/import')
        .set('Authorization', 'Bearer tecnico-token')
        .send({ obras: [] });

      expect(response.status).toBe(403);
    });
  });
});