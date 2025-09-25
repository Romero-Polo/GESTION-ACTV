import request from 'supertest';
import app from '../index';

describe('Health Endpoint', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('environment');
    expect(response.body).toHaveProperty('database');
  });

  it('should have correct structure', async () => {
    const response = await request(app)
      .get('/health');

    expect(typeof response.body.status).toBe('string');
    expect(typeof response.body.timestamp).toBe('string');
    expect(typeof response.body.uptime).toBe('number');
    expect(typeof response.body.environment).toBe('string');
    expect(typeof response.body.database).toBe('object');
    expect(response.body.database).toHaveProperty('status');
  });

  it('should include database status information', async () => {
    const response = await request(app)
      .get('/health');

    expect(response.body.database.status).toMatch(/connected|disconnected/);
  });
});

describe('Database Info Endpoint', () => {
  it('should return database information when available', async () => {
    const response = await request(app)
      .get('/db-info');

    // In test environment, database might not be connected
    if (response.status === 200) {
      expect(response.body).toHaveProperty('connected', true);
      expect(response.body).toHaveProperty('entities');
      expect(response.body).toHaveProperty('totalEntities');
      expect(Array.isArray(response.body.entities)).toBe(true);
    } else {
      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('message');
    }
  });
});

describe('Basic Routes', () => {
  it('should return welcome message on root', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Gestión de Actividad Laboral API');
    expect(response.body).toHaveProperty('version', '1.0.0');
    expect(response.body).toHaveProperty('endpoints');
    expect(response.body.endpoints).toHaveProperty('health', '/health');
    expect(response.body.endpoints).toHaveProperty('database', '/db-info');
  });

  it('should return 404 for non-existent routes', async () => {
    const response = await request(app)
      .get('/non-existent-route')
      .expect(404);

    expect(response.body).toHaveProperty('message', 'Route not found');
  });
});