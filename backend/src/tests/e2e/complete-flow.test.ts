import request from 'supertest';
import { DataSource } from 'typeorm';
import app from '../../index';
import { AppDataSource } from '../../utils/database';
import { Usuario, RolUsuario } from '../../models/Usuario';
import { Obra } from '../../models/Obra';
import { Recurso, TipoRecurso } from '../../models/Recurso';
import { TipoActividad } from '../../models/TipoActividad';
import { Actividad } from '../../models/Actividad';
import { ExportLog, ExportFormat } from '../../models/ExportLog';
import { SyncLog, SyncType, SyncStatus } from '../../models/SyncLog';

describe('Complete System Flow E2E Tests', () => {
  let connection: DataSource;
  let adminToken: string;
  let operarioToken: string;
  let adminUser: Usuario;
  let operarioUser: Usuario;
  let testObra: Obra;
  let testRecurso: Recurso;
  let testTipoActividad: TipoActividad;

  beforeAll(async () => {
    // Initialize test database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    connection = AppDataSource;

    // Clean database
    await cleanDatabase();

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanDatabase();
    if (connection.isInitialized) {
      await connection.destroy();
    }
  });

  describe('Authentication Flow', () => {
    it('should authenticate admin user', async () => {
      // Mock Office365 authentication
      const response = await request(app)
        .post('/auth/mock-login') // This would be a test-only endpoint
        .send({
          email: adminUser.email,
          name: adminUser.nombre,
          role: adminUser.rol
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      adminToken = response.body.token;
    });

    it('should authenticate operario user', async () => {
      const response = await request(app)
        .post('/auth/mock-login')
        .send({
          email: operarioUser.email,
          name: operarioUser.nombre,
          role: operarioUser.rol
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      operarioToken = response.body.token;
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/mock-login')
        .send({
          email: 'invalid@test.com',
          name: 'Invalid User',
          role: 'invalid'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Master Data Management Flow', () => {
    it('should allow admin to create obra', async () => {
      const obraData = {
        codigo: 'TEST-OBRA-001',
        descripcion: 'Obra de prueba E2E',
        observaciones: 'Creada durante pruebas E2E',
        activo: true
      };

      const response = await request(app)
        .post('/api/obras')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(obraData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.codigo).toBe(obraData.codigo);
    });

    it('should allow admin to create recurso', async () => {
      const recursoData = {
        codigo: 'TEST-OP-001',
        nombre: 'Operario de Prueba E2E',
        tipo: TipoRecurso.OPERARIO,
        activo: true,
        agrCoste: 'MANO_OBRA_DIRECTA'
      };

      const response = await request(app)
        .post('/api/recursos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(recursoData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.codigo).toBe(recursoData.codigo);
    });

    it('should prevent operario from creating obra', async () => {
      const obraData = {
        codigo: 'UNAUTHORIZED-OBRA',
        descripcion: 'Esta obra no debería crearse',
        activo: true
      };

      const response = await request(app)
        .post('/api/obras')
        .set('Authorization', `Bearer ${operarioToken}`)
        .send(obraData);

      expect(response.status).toBe(403);
    });

    it('should allow filtering and pagination of obras', async () => {
      const response = await request(app)
        .get('/api/obras?page=1&limit=10&activo=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.obras)).toBe(true);
      expect(response.body.data.totalPages).toBeGreaterThanOrEqual(1);
    });
  });

  let testActivityId: number; // Declare at class level for use across test suites

  describe('Activity Management Flow', () => {

    it('should allow operario to create activity', async () => {
      const activityData = {
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '08:00',
        observaciones: 'Actividad de prueba E2E'
      };

      const response = await request(app)
        .post('/api/actividades')
        .set('Authorization', `Bearer ${operarioToken}`)
        .send(activityData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fechaInicio).toBe(activityData.fechaInicio);
      testActivityId = response.body.data.id;
    });

    it('should validate activity overlap', async () => {
      const overlappingActivity = {
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '07:30', // Overlaps with previous activity
        fechaFin: '2024-01-15',
        horaFin: '09:00'
      };

      const response = await request(app)
        .post('/api/actividades')
        .set('Authorization', `Bearer ${operarioToken}`)
        .send(overlappingActivity);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('solapamiento');
    });

    it('should allow updating activity end time', async () => {
      const updateData = {
        fechaFin: '2024-01-15',
        horaFin: '16:00'
      };

      const response = await request(app)
        .put(`/api/actividades/${testActivityId}`)
        .set('Authorization', `Bearer ${operarioToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.horaFin).toBe(updateData.horaFin);
    });

    it('should calculate activity duration correctly', async () => {
      const response = await request(app)
        .get(`/api/actividades/${testActivityId}`)
        .set('Authorization', `Bearer ${operarioToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const activity = response.body.data;
      const startTime = new Date(`${activity.fechaInicio}T${activity.horaInicio}`);
      const endTime = new Date(`${activity.fechaFin}T${activity.horaFin}`);
      const expectedHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      expect(Math.abs(activity.duration - expectedHours)).toBeLessThan(0.1);
    });

    it('should allow admin to view all activities', async () => {
      const response = await request(app)
        .get('/api/actividades?fechaInicio=2024-01-01&fechaFin=2024-01-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.actividades)).toBe(true);
      expect(response.body.data.actividades.length).toBeGreaterThan(0);
    });

    it('should restrict operario to own activities', async () => {
      const response = await request(app)
        .get('/api/actividades')
        .set('Authorization', `Bearer ${operarioToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // All activities should belong to the operario user
      response.body.data.actividades.forEach((activity: any) => {
        expect(activity.usuarioCreacionId).toBe(operarioUser.id);
      });
    });
  });

  describe('Export Flow', () => {
    let exportLogId: number;

    it('should generate export preview', async () => {
      const previewData = {
        fechaInicio: '2024-01-01',
        fechaFin: '2024-01-31'
      };

      const response = await request(app)
        .post('/api/export/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(previewData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRecords).toBeGreaterThanOrEqual(0);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.dateRange).toBeDefined();
    });

    it('should validate export request', async () => {
      const validationData = {
        fechaInicio: '2024-01-01',
        fechaFin: '2024-01-31',
        empresa: 'Test Company'
      };

      const response = await request(app)
        .post('/api/export/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validationData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
      expect(Array.isArray(response.body.warnings)).toBe(true);
    });

    it('should create ERP export in JSON format', async () => {
      const exportData = {
        fechaInicio: '2024-01-01',
        fechaFin: '2024-01-31',
        format: ExportFormat.JSON
      };

      const response = await request(app)
        .post('/api/export/erp')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(exportData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.exportLogId).toBeDefined();
      exportLogId = response.body.exportLogId;
    });

    it('should create ERP export in CSV format', async () => {
      const exportData = {
        fechaInicio: '2024-01-01',
        fechaFin: '2024-01-31',
        format: ExportFormat.CSV
      };

      const response = await request(app)
        .post('/api/export/erp')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(exportData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(typeof response.body.data).toBe('string'); // CSV should be string
      expect(response.body.data).toContain(','); // Should contain CSV separators
    });

    it('should get export statistics', async () => {
      const response = await request(app)
        .get('/api/export/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.formats).toBeDefined();
      expect(response.body.data.volume).toBeDefined();
    });

    it('should list export logs', async () => {
      const response = await request(app)
        .get('/api/export/logs?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toBeDefined();
      expect(Array.isArray(response.body.data.logs)).toBe(true);
    });

    it('should get export log by ID', async () => {
      const response = await request(app)
        .get(`/api/export/logs/${exportLogId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(exportLogId);
    });

    it('should enforce rate limiting on exports', async () => {
      const exportData = {
        fechaInicio: '2024-01-01',
        fechaFin: '2024-01-31',
        format: ExportFormat.JSON
      };

      // Make multiple rapid requests to trigger rate limit
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/export/erp')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(exportData)
      );

      const responses = await Promise.all(promises);

      // At least one should be rate limited (status 429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('GPS Integration Flow', () => {
    it('should record GPS start location', async () => {
      const gpsData = {
        latitude: 41.3851,
        longitude: 2.1734,
        accuracy: 5
      };

      const response = await request(app)
        .post(`/api/gps/activity/${testActivityId}/start-location`)
        .set('Authorization', `Bearer ${operarioToken}`)
        .send(gpsData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.coordinates.latitude).toBe(gpsData.latitude);
    });

    it('should record GPS end location with distance calculation', async () => {
      const gpsData = {
        latitude: 41.3901,
        longitude: 2.1884,
        accuracy: 3
      };

      const response = await request(app)
        .post(`/api/gps/activity/${testActivityId}/end-location`)
        .set('Authorization', `Bearer ${operarioToken}`)
        .send(gpsData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.calculatedDistance).toBeGreaterThan(0);
    });

    it('should record GPS track with waypoints', async () => {
      const trackData = {
        waypoints: [
          { latitude: 41.3851, longitude: 2.1734, timestamp: '2024-01-15T08:00:00Z' },
          { latitude: 41.3861, longitude: 2.1744, timestamp: '2024-01-15T09:00:00Z' },
          { latitude: 41.3871, longitude: 2.1754, timestamp: '2024-01-15T10:00:00Z' }
        ]
      };

      const response = await request(app)
        .post(`/api/gps/activity/${testActivityId}/track`)
        .set('Authorization', `Bearer ${operarioToken}`)
        .send(trackData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.waypointCount).toBe(3);
      expect(response.body.data.totalDistance).toBeGreaterThan(0);
    });

    it('should get GPS data for activity', async () => {
      const response = await request(app)
        .get(`/api/gps/activity/${testActivityId}`)
        .set('Authorization', `Bearer ${operarioToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.actividadId).toBe(testActivityId);
    });

    it('should validate GPS coordinates', async () => {
      const invalidGpsData = {
        latitude: 200, // Invalid latitude
        longitude: 300, // Invalid longitude
        accuracy: 5
      };

      const response = await request(app)
        .post(`/api/gps/activity/${testActivityId}/start-location`)
        .set('Authorization', `Bearer ${operarioToken}`)
        .send(invalidGpsData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('inválidas');
    });
  });

  describe('Metrics and Monitoring Flow', () => {
    it('should get system health status', async () => {
      const response = await request(app)
        .get('/api/metrics/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.data.status);
      expect(response.body.data.services).toBeDefined();
      expect(response.body.data.uptime).toBeGreaterThan(0);
    });

    it('should get system overview metrics (admin only)', async () => {
      const response = await request(app)
        .get('/api/metrics/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(response.body.data.works).toBeDefined();
      expect(response.body.data.resources).toBeDefined();
      expect(response.body.data.activities).toBeDefined();
    });

    it('should restrict metrics access to admin', async () => {
      const response = await request(app)
        .get('/api/metrics/overview')
        .set('Authorization', `Bearer ${operarioToken}`);

      expect(response.status).toBe(403);
    });

    it('should get activity metrics with filters', async () => {
      const response = await request(app)
        .get('/api/metrics/activities?period=30d&groupBy=day')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBeDefined();
    });

    it('should get user metrics', async () => {
      const response = await request(app)
        .get('/api/metrics/users?period=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.roleStats).toBeDefined();
    });

    it('should get performance metrics', async () => {
      const response = await request(app)
        .get('/api/metrics/performance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.database).toBeDefined();
      expect(response.body.data.system).toBeDefined();
    });
  });

  describe('Data Validation and Security Flow', () => {
    it('should validate required fields in activity creation', async () => {
      const invalidActivity = {
        // Missing required fields
        observaciones: 'Activity without required fields'
      };

      const response = await request(app)
        .post('/api/actividades')
        .set('Authorization', `Bearer ${operarioToken}`)
        .send(invalidActivity);

      expect(response.status).toBe(400);
    });

    it('should validate date formats', async () => {
      const invalidDateActivity = {
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024/01/15', // Invalid format
        horaInicio: '08:00'
      };

      const response = await request(app)
        .post('/api/actividades')
        .set('Authorization', `Bearer ${operarioToken}`)
        .send(invalidDateActivity);

      expect(response.status).toBe(400);
    });

    it('should validate time format (15-minute intervals)', async () => {
      const invalidTimeActivity = {
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-16',
        horaInicio: '08:07' // Invalid time (not 15-minute interval)
      };

      const response = await request(app)
        .post('/api/actividades')
        .set('Authorization', `Bearer ${operarioToken}`)
        .send(invalidTimeActivity);

      expect(response.status).toBe(400);
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/actividades')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should handle missing authorization header', async () => {
      const response = await request(app)
        .get('/api/actividades');

      expect(response.status).toBe(401);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .get(`/api/obras?page=${i % 5 + 1}`)
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect([200, 429]).toContain(response.status); // 200 OK or 429 Rate Limited
      });

      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });

    it('should handle large export requests efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/export/erp')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fechaInicio: '2024-01-01',
          fechaFin: '2024-12-31',
          format: ExportFormat.JSON
        });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should validate system responsiveness under load', async () => {
      const healthChecks = Array.from({ length: 10 }, () =>
        request(app).get('/api/metrics/health')
      );

      const responses = await Promise.all(healthChecks);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBeDefined();
      });
    });
  });

  // Helper functions
  async function cleanDatabase() {
    try {
      const entities = connection.entityMetadatas;
      for (const entity of entities) {
        const repository = connection.getRepository(entity.name);
        await repository.query(`DELETE FROM ${entity.tableName}`);
      }
    } catch (error) {
      console.warn('Error cleaning database:', error);
    }
  }

  async function setupTestData() {
    // Create test users
    const userRepository = connection.getRepository(Usuario);

    adminUser = userRepository.create({
      email: 'admin@test.com',
      nombre: 'Admin Test',
      rol: RolUsuario.ADMINISTRADOR,
      activo: true
    });
    adminUser = await userRepository.save(adminUser);

    operarioUser = userRepository.create({
      email: 'operario@test.com',
      nombre: 'Operario Test',
      rol: RolUsuario.OPERARIO,
      activo: true
    });
    operarioUser = await userRepository.save(operarioUser);

    // Create test obra
    const obraRepository = connection.getRepository(Obra);
    testObra = obraRepository.create({
      codigo: 'TEST-001',
      descripcion: 'Obra de prueba',
      activo: true
    });
    testObra = await obraRepository.save(testObra);

    // Create test recurso
    const recursoRepository = connection.getRepository(Recurso);
    testRecurso = recursoRepository.create({
      codigo: 'OP-TEST-001',
      nombre: 'Operario Test',
      tipo: TipoRecurso.OPERARIO,
      activo: true,
      agrCoste: 'MANO_OBRA_DIRECTA'
    });
    testRecurso = await recursoRepository.save(testRecurso);

    // Create test tipo actividad
    const tipoActividadRepository = connection.getRepository(TipoActividad);
    testTipoActividad = tipoActividadRepository.create({
      codigo: 'TEST',
      nombre: 'Actividad de Prueba',
      descripcion: 'Tipo de actividad para pruebas'
    });
    testTipoActividad = await tipoActividadRepository.save(testTipoActividad);
  }
});