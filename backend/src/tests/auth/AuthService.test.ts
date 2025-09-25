import { AuthService } from '../../services/AuthService';
import { RolUsuario } from '../../models/Usuario';

// Mock the dependencies
jest.mock('@azure/msal-node');
jest.mock('axios');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('hasRole', () => {
    it('should return true if user has required role', () => {
      const result = authService.hasRole(RolUsuario.ADMINISTRADOR, [
        RolUsuario.ADMINISTRADOR,
        RolUsuario.JEFE_EQUIPO
      ]);

      expect(result).toBe(true);
    });

    it('should return false if user does not have required role', () => {
      const result = authService.hasRole(RolUsuario.OPERARIO, [
        RolUsuario.ADMINISTRADOR,
        RolUsuario.JEFE_EQUIPO
      ]);

      expect(result).toBe(false);
    });

    it('should return true for operario with operario role', () => {
      const result = authService.hasRole(RolUsuario.OPERARIO, [RolUsuario.OPERARIO]);

      expect(result).toBe(true);
    });
  });

  describe('canAccessResource', () => {
    it('should allow administrator to access any resource', () => {
      const result = authService.canAccessResource(RolUsuario.ADMINISTRADOR, 1, 999);

      expect(result).toBe(true);
    });

    it('should allow jefe de equipo to access team resources', () => {
      const result = authService.canAccessResource(RolUsuario.JEFE_EQUIPO, 1);

      expect(result).toBe(true);
    });

    it('should allow tecnico transporte to access team resources', () => {
      const result = authService.canAccessResource(RolUsuario.TECNICO_TRANSPORTE, 1);

      expect(result).toBe(true);
    });

    it('should allow operario to access own resources', () => {
      const result = authService.canAccessResource(RolUsuario.OPERARIO, 1, 1);

      expect(result).toBe(true);
    });

    it('should deny operario access to other user resources', () => {
      const result = authService.canAccessResource(RolUsuario.OPERARIO, 1, 2);

      expect(result).toBe(false);
    });

    it('should deny operario access when no resource user id provided', () => {
      const result = authService.canAccessResource(RolUsuario.OPERARIO, 1);

      expect(result).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should return admin permissions for administrator', () => {
      const permissions = authService.getUserPermissions(RolUsuario.ADMINISTRADOR);

      expect(permissions).toContain('read:all');
      expect(permissions).toContain('write:all');
      expect(permissions).toContain('delete:all');
      expect(permissions).toContain('manage:users');
      expect(permissions).toContain('export:data');
    });

    it('should return team permissions for jefe de equipo', () => {
      const permissions = authService.getUserPermissions(RolUsuario.JEFE_EQUIPO);

      expect(permissions).toContain('read:team');
      expect(permissions).toContain('write:team');
      expect(permissions).toContain('duplicate:activities');
      expect(permissions).toContain('create:templates');
      expect(permissions).not.toContain('manage:users');
    });

    it('should return team permissions for tecnico transporte', () => {
      const permissions = authService.getUserPermissions(RolUsuario.TECNICO_TRANSPORTE);

      expect(permissions).toContain('read:team');
      expect(permissions).toContain('write:team');
      expect(permissions).toContain('duplicate:activities');
      expect(permissions).toContain('create:templates');
      expect(permissions).not.toContain('manage:users');
    });

    it('should return limited permissions for operario', () => {
      const permissions = authService.getUserPermissions(RolUsuario.OPERARIO);

      expect(permissions).toContain('read:own');
      expect(permissions).toContain('write:own');
      expect(permissions).not.toContain('read:team');
      expect(permissions).not.toContain('manage:users');
    });

    it('should return empty array for invalid role', () => {
      const permissions = authService.getUserPermissions('invalid_role' as RolUsuario);

      expect(permissions).toEqual([]);
    });
  });

  describe('getLogoutUrl', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should generate logout URL with tenant ID', () => {
      process.env.AZURE_TENANT_ID = 'test-tenant-id';

      const logoutUrl = authService.getLogoutUrl('http://localhost:3000');

      expect(logoutUrl).toContain('test-tenant-id');
      expect(logoutUrl).toContain('post_logout_redirect_uri=http%3A//localhost%3A3000');
    });

    it('should use default redirect URI when not provided', () => {
      process.env.AZURE_TENANT_ID = 'test-tenant-id';
      process.env.FRONTEND_URL = 'http://localhost:5173';

      const logoutUrl = authService.getLogoutUrl();

      expect(logoutUrl).toContain('post_logout_redirect_uri=http%3A//localhost%3A5173');
    });
  });
});