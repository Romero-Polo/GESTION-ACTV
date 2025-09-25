import { validate } from 'class-validator';
import { Usuario, RolUsuario } from '../../models/Usuario';

describe('Usuario Model', () => {
  describe('Validation', () => {
    it('should create a valid usuario', async () => {
      const usuario = new Usuario({
        email: 'test@example.com',
        nombre: 'Test User',
        rol: RolUsuario.OPERARIO,
        activo: true
      });

      const errors = await validate(usuario);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with invalid email', async () => {
      const usuario = new Usuario({
        email: 'invalid-email',
        nombre: 'Test User',
        rol: RolUsuario.OPERARIO,
        activo: true
      });

      const errors = await validate(usuario);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('should fail validation with empty nombre', async () => {
      const usuario = new Usuario({
        email: 'test@example.com',
        nombre: '',
        rol: RolUsuario.OPERARIO,
        activo: true
      });

      const errors = await validate(usuario);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('nombre');
    });

    it('should fail validation with invalid rol', async () => {
      const usuario = new Usuario({
        email: 'test@example.com',
        nombre: 'Test User',
        rol: 'invalid_role' as RolUsuario,
        activo: true
      });

      const errors = await validate(usuario);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('rol');
    });
  });

  describe('Constructor', () => {
    it('should create usuario with partial data', () => {
      const userData = {
        email: 'test@example.com',
        nombre: 'Test User'
      };

      const usuario = new Usuario(userData);

      expect(usuario.email).toBe(userData.email);
      expect(usuario.nombre).toBe(userData.nombre);
    });
  });

  describe('Roles', () => {
    it('should have all required roles defined', () => {
      expect(RolUsuario.OPERARIO).toBe('operario');
      expect(RolUsuario.JEFE_EQUIPO).toBe('jefe_equipo');
      expect(RolUsuario.TECNICO_TRANSPORTE).toBe('tecnico_transporte');
      expect(RolUsuario.ADMINISTRADOR).toBe('administrador');
    });
  });
});