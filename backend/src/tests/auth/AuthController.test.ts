import request from 'supertest';
import app from '../../index';
import { AuthService } from '../../services/AuthService';

// Mock the AuthService
jest.mock('../../services/AuthService');

describe('Auth Controller', () => {
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
    jest.clearAllMocks();
  });

  describe('GET /auth/login', () => {
    it('should return auth URL for login', async () => {
      const mockAuthUrl = 'https://login.microsoftonline.com/auth-url';
      mockAuthService.getAuthUrl = jest.fn().mockResolvedValue(mockAuthUrl);

      const response = await request(app)
        .get('/auth/login')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('authUrl', mockAuthUrl);
    });

    it('should handle auth URL generation error', async () => {
      mockAuthService.getAuthUrl = jest.fn().mockRejectedValue(new Error('Auth URL generation failed'));

      const response = await request(app)
        .get('/auth/login')
        .expect(500);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/validate', () => {
    it('should validate valid JWT token', async () => {
      const mockPayload = {
        userId: 1,
        email: 'test@example.com',
        nombre: 'Test User',
        rol: 'operario',
        azureId: 'azure-123',
        iat: Date.now(),
        exp: Date.now() + 3600
      };

      mockAuthService.verifyJWT = jest.fn().mockReturnValue(mockPayload);

      const response = await request(app)
        .post('/auth/validate')
        .send({ token: 'valid-jwt-token' })
        .expect(200);

      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', 1);
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('should reject invalid JWT token', async () => {
      mockAuthService.verifyJWT = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/auth/validate')
        .send({ token: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('valid', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should require token in request body', async () => {
      const response = await request(app)
        .post('/auth/validate')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Token required');
    });
  });

  describe('GET /auth/status', () => {
    it('should return unauthenticated status when no token', async () => {
      const response = await request(app)
        .get('/auth/status')
        .expect(200);

      expect(response.body).toHaveProperty('authenticated', false);
    });

    it('should return authenticated status with valid token', async () => {
      const mockPayload = {
        userId: 1,
        email: 'test@example.com',
        nombre: 'Test User',
        rol: 'operario',
        azureId: 'azure-123',
        iat: Date.now(),
        exp: Date.now() + 3600
      };

      mockAuthService.verifyJWT = jest.fn().mockReturnValue(mockPayload);

      const response = await request(app)
        .get('/auth/status')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('authenticated', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', 1);
    });
  });
});

describe('Auth Middleware Integration', () => {
  describe('Authentication Required', () => {
    it('should reject requests without authorization header', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Access token required');
    });

    it('should reject requests with invalid authorization format', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'invalid-format-token')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Access token required');
    });

    it('should reject requests with invalid token', async () => {
      jest.spyOn(AuthService.prototype, 'verifyJWT').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Invalid or expired token');
    });
  });
});