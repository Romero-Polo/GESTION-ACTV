import { validate } from 'class-validator';
import { Obra } from '../../models/Obra';

describe('Obra Model', () => {
  describe('Validation', () => {
    it('should create a valid obra', async () => {
      const obra = new Obra({
        codigo: 'OB001',
        descripcion: 'Test Obra Description',
        activo: true
      });

      const errors = await validate(obra);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with empty codigo', async () => {
      const obra = new Obra({
        codigo: '',
        descripcion: 'Test Description',
        activo: true
      });

      const errors = await validate(obra);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'codigo')).toBeTruthy();
    });

    it('should fail validation with codigo too long', async () => {
      const obra = new Obra({
        codigo: 'A'.repeat(51), // 51 characters, exceeds 50 limit
        descripcion: 'Test Description',
        activo: true
      });

      const errors = await validate(obra);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'codigo')).toBeTruthy();
    });

    it('should fail validation with empty descripcion', async () => {
      const obra = new Obra({
        codigo: 'OB001',
        descripcion: '',
        activo: true
      });

      const errors = await validate(obra);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'descripcion')).toBeTruthy();
    });

    it('should fail validation with descripcion too long', async () => {
      const obra = new Obra({
        codigo: 'OB001',
        descripcion: 'A'.repeat(501), // 501 characters, exceeds 500 limit
        activo: true
      });

      const errors = await validate(obra);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'descripcion')).toBeTruthy();
    });

    it('should allow optional observaciones', async () => {
      const obra = new Obra({
        codigo: 'OB001',
        descripcion: 'Test Description',
        observaciones: 'Some observations',
        activo: true
      });

      const errors = await validate(obra);
      expect(errors.length).toBe(0);
    });

    it('should allow empty observaciones', async () => {
      const obra = new Obra({
        codigo: 'OB001',
        descripcion: 'Test Description',
        activo: true
      });

      const errors = await validate(obra);
      expect(errors.length).toBe(0);
    });
  });

  describe('Static Methods', () => {
    it('should create obra from external data', () => {
      const externalData = {
        codigo: 'EXT001',
        descripcion: 'External Obra',
        observaciones: 'From external system',
        activo: true
      };

      const obra = Obra.createFromExternal(externalData);

      expect(obra.codigo).toBe(externalData.codigo);
      expect(obra.descripcion).toBe(externalData.descripcion);
      expect(obra.observaciones).toBe(externalData.observaciones);
      expect(obra.activo).toBe(true);
    });

    it('should default activo to true when not specified in external data', () => {
      const externalData = {
        codigo: 'EXT001',
        descripcion: 'External Obra'
      };

      const obra = Obra.createFromExternal(externalData);

      expect(obra.activo).toBe(true);
    });

    it('should respect activo false in external data', () => {
      const externalData = {
        codigo: 'EXT001',
        descripcion: 'External Obra',
        activo: false
      };

      const obra = Obra.createFromExternal(externalData);

      expect(obra.activo).toBe(false);
    });
  });

  describe('Methods', () => {
    it('should allow deactivation by default', () => {
      const obra = new Obra({
        codigo: 'OB001',
        descripcion: 'Test Obra',
        activo: true
      });

      expect(obra.canBeDeactivated()).toBe(true);
    });
  });
});