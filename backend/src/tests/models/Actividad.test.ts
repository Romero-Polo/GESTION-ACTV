import { validate } from 'class-validator';
import { Actividad } from '../../models/Actividad';
import { Obra } from '../../models/Obra';
import { Recurso, TipoRecurso } from '../../models/Recurso';
import { TipoActividad } from '../../models/TipoActividad';
import { Usuario, RolUsuario } from '../../models/Usuario';

describe('Actividad Model', () => {
  let mockObra: Obra;
  let mockRecurso: Recurso;
  let mockTipoActividad: TipoActividad;
  let mockUsuario: Usuario;

  beforeEach(() => {
    mockObra = new Obra({
      codigo: 'OB001',
      descripcion: 'Test Obra',
      activo: true
    });

    mockRecurso = new Recurso({
      codigo: 'OP001',
      nombre: 'Test Operario',
      tipo: TipoRecurso.OPERARIO,
      agrCoste: 'MANO_OBRA_DIRECTA',
      activo: true
    });

    mockTipoActividad = new TipoActividad({
      codigo: 'TEST',
      nombre: 'Test Activity',
      descripcion: 'Test activity type'
    });

    mockUsuario = new Usuario({
      email: 'test@example.com',
      nombre: 'Test User',
      rol: RolUsuario.OPERARIO,
      activo: true
    });
  });

  describe('Validation', () => {
    it('should create a valid actividad', async () => {
      const actividad = new Actividad({
        obraId: 1,
        recursoId: 1,
        tipoActividadId: 1,
        fechaInicio: '2023-12-15',
        horaInicio: '08:00',
        usuarioCreacionId: 1
      });

      const errors = await validate(actividad);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with invalid fecha format', async () => {
      const actividad = new Actividad({
        obraId: 1,
        recursoId: 1,
        tipoActividadId: 1,
        fechaInicio: 'invalid-date',
        horaInicio: '08:00',
        usuarioCreacionId: 1
      });

      const errors = await validate(actividad);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'fechaInicio')).toBeTruthy();
    });

    it('should allow optional fecha and hora fin', async () => {
      const actividad = new Actividad({
        obraId: 1,
        recursoId: 1,
        tipoActividadId: 1,
        fechaInicio: '2023-12-15',
        horaInicio: '08:00',
        usuarioCreacionId: 1
      });

      const errors = await validate(actividad);
      expect(errors.length).toBe(0);
    });
  });

  describe('Business Logic Methods', () => {
    it('should detect jornada abierta when no end time', () => {
      const actividad = new Actividad({
        fechaInicio: '2023-12-15',
        horaInicio: '08:00',
        obraId: 1,
        recursoId: 1,
        tipoActividadId: 1,
        usuarioCreacionId: 1
      });

      expect(actividad.isJornadaAbierta()).toBe(true);
    });

    it('should not detect jornada abierta when end time is set', () => {
      const actividad = new Actividad({
        fechaInicio: '2023-12-15',
        horaInicio: '08:00',
        fechaFin: '2023-12-15',
        horaFin: '16:00',
        obraId: 1,
        recursoId: 1,
        tipoActividadId: 1,
        usuarioCreacionId: 1
      });

      expect(actividad.isJornadaAbierta()).toBe(false);
    });

    it('should calculate duration correctly', () => {
      const actividad = new Actividad({
        fechaInicio: '2023-12-15',
        horaInicio: '08:00',
        fechaFin: '2023-12-15',
        horaFin: '16:00',
        obraId: 1,
        recursoId: 1,
        tipoActividadId: 1,
        usuarioCreacionId: 1
      });

      expect(actividad.getDurationInMinutes()).toBe(480); // 8 hours = 480 minutes
      expect(actividad.getDurationInHours()).toBe(8);
    });

    it('should return null duration for open shift', () => {
      const actividad = new Actividad({
        fechaInicio: '2023-12-15',
        horaInicio: '08:00',
        obraId: 1,
        recursoId: 1,
        tipoActividadId: 1,
        usuarioCreacionId: 1
      });

      expect(actividad.getDurationInMinutes()).toBeNull();
      expect(actividad.getDurationInHours()).toBeNull();
    });

    it('should get start DateTime correctly', () => {
      const actividad = new Actividad({
        fechaInicio: '2023-12-15',
        horaInicio: '08:30',
        obraId: 1,
        recursoId: 1,
        tipoActividadId: 1,
        usuarioCreacionId: 1
      });

      const startDateTime = actividad.getStartDateTime();
      expect(startDateTime.getFullYear()).toBe(2023);
      expect(startDateTime.getMonth()).toBe(11); // December is month 11 in JS
      expect(startDateTime.getDate()).toBe(15);
      expect(startDateTime.getHours()).toBe(8);
      expect(startDateTime.getMinutes()).toBe(30);
    });

    it('should get end DateTime correctly', () => {
      const actividad = new Actividad({
        fechaInicio: '2023-12-15',
        horaInicio: '08:00',
        fechaFin: '2023-12-15',
        horaFin: '16:30',
        obraId: 1,
        recursoId: 1,
        tipoActividadId: 1,
        usuarioCreacionId: 1
      });

      const endDateTime = actividad.getEndDateTime();
      expect(endDateTime?.getHours()).toBe(16);
      expect(endDateTime?.getMinutes()).toBe(30);
    });

    it('should return null for end DateTime on open shift', () => {
      const actividad = new Actividad({
        fechaInicio: '2023-12-15',
        horaInicio: '08:00',
        obraId: 1,
        recursoId: 1,
        tipoActividadId: 1,
        usuarioCreacionId: 1
      });

      expect(actividad.getEndDateTime()).toBeNull();
    });
  });

  describe('Overlap Detection', () => {
    it('should detect overlap for same resource with overlapping times', () => {
      const actividad1 = new Actividad({
        recursoId: 1,
        fechaInicio: '2023-12-15',
        horaInicio: '08:00',
        fechaFin: '2023-12-15',
        horaFin: '12:00',
        obraId: 1,
        tipoActividadId: 1,
        usuarioCreacionId: 1
      });

      const actividad2 = new Actividad({
        recursoId: 1,
        fechaInicio: '2023-12-15',
        horaInicio: '10:00',
        fechaFin: '2023-12-15',
        horaFin: '14:00',
        obraId: 1,
        tipoActividadId: 1,
        usuarioCreacionId: 1
      });

      expect(actividad1.overlapsWithActivity(actividad2)).toBe(true);
    });

    it('should not detect overlap for different resources', () => {
      const actividad1 = new Actividad({
        recursoId: 1,
        fechaInicio: '2023-12-15',
        horaInicio: '08:00',
        fechaFin: '2023-12-15',
        horaFin: '16:00',
        obraId: 1,
        tipoActividadId: 1,
        usuarioCreacionId: 1
      });

      const actividad2 = new Actividad({
        recursoId: 2,
        fechaInicio: '2023-12-15',
        horaInicio: '08:00',
        fechaFin: '2023-12-15',
        horaFin: '16:00',
        obraId: 1,
        tipoActividadId: 1,
        usuarioCreacionId: 1
      });

      expect(actividad1.overlapsWithActivity(actividad2)).toBe(false);
    });

    it('should not detect overlap for adjacent times', () => {
      const actividad1 = new Actividad({
        recursoId: 1,
        fechaInicio: '2023-12-15',
        horaInicio: '08:00',
        fechaFin: '2023-12-15',
        horaFin: '12:00',
        obraId: 1,
        tipoActividadId: 1,
        usuarioCreacionId: 1
      });

      const actividad2 = new Actividad({
        recursoId: 1,
        fechaInicio: '2023-12-15',
        horaInicio: '12:00',
        fechaFin: '2023-12-15',
        horaFin: '16:00',
        obraId: 1,
        tipoActividadId: 1,
        usuarioCreacionId: 1
      });

      expect(actividad1.overlapsWithActivity(actividad2)).toBe(false);
    });
  });

  describe('Static Methods', () => {
    it('should validate correct time formats', () => {
      expect(Actividad.validateTimeFormat('08:00')).toBe(true);
      expect(Actividad.validateTimeFormat('08:15')).toBe(true);
      expect(Actividad.validateTimeFormat('08:30')).toBe(true);
      expect(Actividad.validateTimeFormat('08:45')).toBe(true);
      expect(Actividad.validateTimeFormat('23:45')).toBe(true);
    });

    it('should reject incorrect time formats', () => {
      expect(Actividad.validateTimeFormat('08:10')).toBe(false); // Minutes not 00, 15, 30, 45
      expect(Actividad.validateTimeFormat('25:00')).toBe(false); // Invalid hour
      expect(Actividad.validateTimeFormat('08:60')).toBe(false); // Invalid minutes
      expect(Actividad.validateTimeFormat('8:00')).toBe(false);  // Wrong format
      expect(Actividad.validateTimeFormat('invalid')).toBe(false);
    });
  });

  describe('ERP Export Format', () => {
    it('should format correctly for ERP export', () => {
      // Mock the relations
      const actividad = new Actividad({
        fechaInicio: '2023-12-15',
        horaInicio: '08:00',
        fechaFin: '2023-12-15',
        horaFin: '16:00',
        obraId: 1,
        recursoId: 1,
        tipoActividadId: 1,
        usuarioCreacionId: 1
      });

      actividad.obra = mockObra;
      actividad.recurso = mockRecurso;
      actividad.tipoActividad = mockTipoActividad;

      const exportData = actividad.toERPExportFormat();

      expect(exportData.fecha).toBe('2023-12-15');
      expect(exportData.recurso).toBe('OP001 - Test Operario');
      expect(exportData.obra).toBe('OB001 - Test Obra');
      expect(exportData.cantidad).toBe(8);
      expect(exportData.agr_coste).toBe('MANO_OBRA_DIRECTA');
      expect(exportData.actividad).toBe('Test Activity');
    });

    it('should include km_recorridos when available', () => {
      const actividad = new Actividad({
        fechaInicio: '2023-12-15',
        horaInicio: '08:00',
        fechaFin: '2023-12-15',
        horaFin: '16:00',
        kmRecorridos: 125.5,
        obraId: 1,
        recursoId: 1,
        tipoActividadId: 1,
        usuarioCreacionId: 1
      });

      actividad.obra = mockObra;
      actividad.recurso = mockRecurso;
      actividad.tipoActividad = mockTipoActividad;

      const exportData = actividad.toERPExportFormat();

      expect(exportData.km_recorridos).toBe(125.5);
    });
  });
});