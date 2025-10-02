import { AppDataSource } from '../../utils/database';
import { ActividadService, CreateActividadData } from '../../services/ActividadService';
import { Actividad } from '../../models/Actividad';
import { Recurso, TipoRecurso } from '../../models/Recurso';
import { Obra } from '../../models/Obra';
import { TipoActividad } from '../../models/TipoActividad';
import { Usuario, RolUsuario } from '../../models/Usuario';

describe('ActividadService - Overlap Validation', () => {
  let actividadService: ActividadService;
  let testRecurso: Recurso;
  let testObra: Obra;
  let testTipoActividad: TipoActividad;
  let testUsuario: Usuario;

  beforeAll(async () => {
    // Initialize in-memory database for testing
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    actividadService = new ActividadService();

    // Create test entities
    testRecurso = new Recurso({
      codigo: 'TEST001',
      nombre: 'Test Operario',
      tipo: TipoRecurso.OPERARIO,
      agrCoste: 'MOD',
      activo: true
    });
    await AppDataSource.getRepository(Recurso).save(testRecurso);

    testObra = new Obra({
      codigo: 'OBR001',
      descripcion: 'Test Obra',
      activo: true
    });
    await AppDataSource.getRepository(Obra).save(testObra);

    testTipoActividad = new TipoActividad({
      codigo: 'ACT001',
      nombre: 'Test Activity',
      activo: true
    });
    await AppDataSource.getRepository(TipoActividad).save(testTipoActividad);

    testUsuario = new Usuario({
      email: 'test@example.com',
      name: 'Test User',
      rol: RolUsuario.ADMINISTRADOR,
      activo: true
    });
    await AppDataSource.getRepository(Usuario).save(testUsuario);
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    // Clear all activities before each test
    await AppDataSource.getRepository(Actividad).clear();
  });

  describe('validarSolapamiento', () => {
    it('should detect no overlap for non-overlapping activities', async () => {
      // Create first activity
      await actividadService.createActividad({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '08:00',
        fechaFin: '2024-01-15',
        horaFin: '12:00',
        usuarioCreacionId: testUsuario.id
      });

      // Test non-overlapping activity
      const validationResult = await actividadService.validarSolapamiento({
        recursoId: testRecurso.id,
        fechaInicio: '2024-01-15',
        horaInicio: '13:00',
        fechaFin: '2024-01-15',
        horaFin: '17:00'
      });

      expect(validationResult.hasOverlap).toBe(false);
      expect(validationResult.conflictingActivities).toHaveLength(0);
    });

    it('should detect overlap for overlapping activities', async () => {
      // Create first activity
      await actividadService.createActividad({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '08:00',
        fechaFin: '2024-01-15',
        horaFin: '12:00',
        usuarioCreacionId: testUsuario.id
      });

      // Test overlapping activity
      const validationResult = await actividadService.validarSolapamiento({
        recursoId: testRecurso.id,
        fechaInicio: '2024-01-15',
        horaInicio: '10:00',
        fechaFin: '2024-01-15',
        horaFin: '14:00'
      });

      expect(validationResult.hasOverlap).toBe(true);
      expect(validationResult.conflictingActivities).toHaveLength(1);
      expect(validationResult.message).toContain('se solapa con');
    });

    it('should handle open shifts correctly', async () => {
      // Create open shift
      await actividadService.createActividad({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '08:00',
        usuarioCreacionId: testUsuario.id
      });

      // Test activity that would overlap with open shift
      const validationResult = await actividadService.validarSolapamiento({
        recursoId: testRecurso.id,
        fechaInicio: '2024-01-15',
        horaInicio: '10:00',
        fechaFin: '2024-01-15',
        horaFin: '12:00'
      });

      expect(validationResult.hasOverlap).toBe(true);
      expect(validationResult.conflictingActivities).toHaveLength(1);
    });

    it('should not detect overlap for different resources', async () => {
      // Create second resource
      const testRecurso2 = new Recurso({
        codigo: 'TEST002',
        nombre: 'Test Operario 2',
        tipo: TipoRecurso.OPERARIO,
        agrCoste: 'MOD',
        activo: true
      });
      await AppDataSource.getRepository(Recurso).save(testRecurso2);

      // Create activity for first resource
      await actividadService.createActividad({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '08:00',
        fechaFin: '2024-01-15',
        horaFin: '12:00',
        usuarioCreacionId: testUsuario.id
      });

      // Test overlapping time for different resource
      const validationResult = await actividadService.validarSolapamiento({
        recursoId: testRecurso2.id,
        fechaInicio: '2024-01-15',
        horaInicio: '10:00',
        fechaFin: '2024-01-15',
        horaFin: '14:00'
      });

      expect(validationResult.hasOverlap).toBe(false);
      expect(validationResult.conflictingActivities).toHaveLength(0);
    });
  });

  describe('calcularHoraFin', () => {
    it('should calculate end time based on next activity', async () => {
      // Create open activity
      const openActivity = await actividadService.createActividad({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '08:00',
        usuarioCreacionId: testUsuario.id
      });

      // Create next activity
      await actividadService.createActividad({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '12:00',
        fechaFin: '2024-01-15',
        horaFin: '16:00',
        usuarioCreacionId: testUsuario.id
      });

      const calculation = await actividadService.calcularHoraFin(openActivity);

      expect(calculation.calculatedEndTime).toBeDefined();
      expect(calculation.calculatedEndTime?.fecha).toBe('2024-01-15');
      expect(calculation.calculatedEndTime?.hora).toBe('12:00');
      expect(calculation.affectedActividades).toHaveLength(1);
    });

    it('should return no calculation for closed activity', async () => {
      // Create closed activity
      const closedActivity = await actividadService.createActividad({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '08:00',
        fechaFin: '2024-01-15',
        horaFin: '12:00',
        usuarioCreacionId: testUsuario.id
      });

      const calculation = await actividadService.calcularHoraFin(closedActivity);

      expect(calculation.calculatedEndTime).toBeUndefined();
      expect(calculation.affectedActividades).toHaveLength(0);
    });
  });

  describe('getSuggestedTimeSlots', () => {
    it('should suggest full day when no activities exist', async () => {
      const suggestions = await actividadService.getSuggestedTimeSlots(
        testRecurso.id,
        '2024-01-15',
        60
      );

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].start).toBe('06:00');
      expect(suggestions[0].end).toBe('07:00');
    });

    it('should suggest slots between activities', async () => {
      // Create morning activity
      await actividadService.createActividad({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '08:00',
        fechaFin: '2024-01-15',
        horaFin: '10:00',
        usuarioCreacionId: testUsuario.id
      });

      // Create afternoon activity
      await actividadService.createActividad({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '14:00',
        fechaFin: '2024-01-15',
        horaFin: '16:00',
        usuarioCreacionId: testUsuario.id
      });

      const suggestions = await actividadService.getSuggestedTimeSlots(
        testRecurso.id,
        '2024-01-15',
        60
      );

      expect(suggestions.length).toBeGreaterThan(0);
      // Should suggest slots before 8:00, between 10:00-14:00, and after 16:00
      const slotTimes = suggestions.map(s => s.start);
      expect(slotTimes).toContain('06:00'); // Before first activity
      expect(slotTimes).toContain('10:00'); // Between activities
      expect(slotTimes).toContain('16:00'); // After last activity
    });

    it('should not suggest slots when there is insufficient time', async () => {
      // Create activities with only 30 minutes gap
      await actividadService.createActividad({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '08:00',
        fechaFin: '2024-01-15',
        horaFin: '10:00',
        usuarioCreacionId: testUsuario.id
      });

      await actividadService.createActividad({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '10:30',
        fechaFin: '2024-01-15',
        horaFin: '12:00',
        usuarioCreacionId: testUsuario.id
      });

      const suggestions = await actividadService.getSuggestedTimeSlots(
        testRecurso.id,
        '2024-01-15',
        60 // Need 60 minutes but only 30 available
      );

      // Should not suggest the 30-minute slot between activities
      const betweenSlot = suggestions.find(s => s.start === '10:00');
      expect(betweenSlot).toBeUndefined();
    });
  });

  describe('recalcularJornadaAbierta', () => {
    it('should automatically close open shifts when new activities are added', async () => {
      // Create open activity
      const openActivity = await actividadService.createActividad({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '08:00',
        usuarioCreacionId: testUsuario.id
      });

      // Create next activity
      await actividadService.createActividad({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '12:00',
        fechaFin: '2024-01-15',
        horaFin: '16:00',
        usuarioCreacionId: testUsuario.id
      });

      // Trigger recalculation
      await actividadService.recalcularJornadaAbierta(testRecurso.id, '2024-01-15');

      // Check that open activity now has end time
      const updatedActivity = await AppDataSource.getRepository(Actividad).findOne({
        where: { id: openActivity.id }
      });

      expect(updatedActivity?.fechaFin).toBe('2024-01-15');
      expect(updatedActivity?.horaFin).toBe('12:00');
    });
  });

  describe('createActividadWithValidation', () => {
    it('should prevent creation of overlapping activities', async () => {
      // Create first activity
      await actividadService.createActividadWithValidation({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '08:00',
        fechaFin: '2024-01-15',
        horaFin: '12:00',
        usuarioCreacionId: testUsuario.id
      });

      // Attempt to create overlapping activity
      await expect(
        actividadService.createActividadWithValidation({
          obraId: testObra.id,
          recursoId: testRecurso.id,
          tipoActividadId: testTipoActividad.id,
          fechaInicio: '2024-01-15',
          horaInicio: '10:00',
          fechaFin: '2024-01-15',
          horaFin: '14:00',
          usuarioCreacionId: testUsuario.id
        })
      ).rejects.toThrow('se solapa con actividades existentes');
    });

    it('should allow creation of non-overlapping activities', async () => {
      // Create first activity
      await actividadService.createActividadWithValidation({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '08:00',
        fechaFin: '2024-01-15',
        horaFin: '12:00',
        usuarioCreacionId: testUsuario.id
      });

      // Create non-overlapping activity
      const secondActivity = await actividadService.createActividadWithValidation({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '13:00',
        fechaFin: '2024-01-15',
        horaFin: '17:00',
        usuarioCreacionId: testUsuario.id
      });

      expect(secondActivity).toBeDefined();
      expect(secondActivity.horaInicio).toBe('13:00');
    });
  });

  describe('Edge Cases', () => {
    it('should handle activities spanning midnight', async () => {
      // Create activity that goes past midnight
      await actividadService.createActividad({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '22:00',
        fechaFin: '2024-01-16',
        horaFin: '02:00',
        usuarioCreacionId: testUsuario.id
      });

      // Test overlapping activity on next day
      const validationResult = await actividadService.validarSolapamiento({
        recursoId: testRecurso.id,
        fechaInicio: '2024-01-16',
        horaInicio: '01:00',
        fechaFin: '2024-01-16',
        horaFin: '03:00'
      });

      expect(validationResult.hasOverlap).toBe(true);
    });

    it('should handle same start/end times (touching activities)', async () => {
      // Create first activity
      await actividadService.createActividad({
        obraId: testObra.id,
        recursoId: testRecurso.id,
        tipoActividadId: testTipoActividad.id,
        fechaInicio: '2024-01-15',
        horaInicio: '08:00',
        fechaFin: '2024-01-15',
        horaFin: '12:00',
        usuarioCreacionId: testUsuario.id
      });

      // Test activity that starts exactly when first one ends
      const validationResult = await actividadService.validarSolapamiento({
        recursoId: testRecurso.id,
        fechaInicio: '2024-01-15',
        horaInicio: '12:00',
        fechaFin: '2024-01-15',
        horaFin: '16:00'
      });

      // Touching activities should not overlap
      expect(validationResult.hasOverlap).toBe(false);
    });
  });
});