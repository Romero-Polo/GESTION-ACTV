import { body, query, param } from 'express-validator';

export const createActividadValidation = [
  body('obraId')
    .isInt({ min: 1 })
    .withMessage('ID de obra debe ser un número entero positivo'),

  body('recursoId')
    .isInt({ min: 1 })
    .withMessage('ID de recurso debe ser un número entero positivo'),

  body('tipoActividadId')
    .isInt({ min: 1 })
    .withMessage('ID de tipo de actividad debe ser un número entero positivo'),

  body('fechaInicio')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Fecha de inicio debe tener formato YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('Fecha de inicio debe ser una fecha válida'),

  body('horaInicio')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Hora de inicio debe tener formato HH:MM y ser válida'),

  body('fechaFin')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Fecha de fin debe tener formato YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('Fecha de fin debe ser una fecha válida'),

  body('horaFin')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Hora de fin debe tener formato HH:MM y ser válida'),

  body('observaciones')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden superar los 1000 caracteres'),

  // Custom validation to ensure if fechaFin is provided, horaFin is too (and vice versa)
  body().custom((value) => {
    const { fechaFin, horaFin } = value;

    if ((fechaFin && !horaFin) || (!fechaFin && horaFin)) {
      throw new Error('Si se proporciona fecha de fin, también se debe proporcionar hora de fin (y viceversa)');
    }

    return true;
  })
];

export const updateActividadValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID debe ser un número entero positivo'),

  body('obraId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de obra debe ser un número entero positivo'),

  body('recursoId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de recurso debe ser un número entero positivo'),

  body('tipoActividadId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de tipo de actividad debe ser un número entero positivo'),

  body('fechaInicio')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Fecha de inicio debe tener formato YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('Fecha de inicio debe ser una fecha válida'),

  body('horaInicio')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Hora de inicio debe tener formato HH:MM y ser válida'),

  body('fechaFin')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Fecha de fin debe tener formato YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('Fecha de fin debe ser una fecha válida'),

  body('horaFin')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Hora de fin debe tener formato HH:MM y ser válida'),

  body('observaciones')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden superar los 1000 caracteres')
];

export const getActividadesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero positivo'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),

  query('obraId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de obra debe ser un número entero positivo'),

  query('recursoId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de recurso debe ser un número entero positivo'),

  query('tipoActividadId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de tipo de actividad debe ser un número entero positivo'),

  query('usuarioId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de usuario debe ser un número entero positivo'),

  query('fechaDesde')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Fecha desde debe tener formato YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('Fecha desde debe ser una fecha válida'),

  query('fechaHasta')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Fecha hasta debe tener formato YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('Fecha hasta debe ser una fecha válida'),

  query('jornada')
    .optional()
    .isIn(['abierta', 'cerrada'])
    .withMessage('El filtro de jornada debe ser "abierta" o "cerrada"')
];

export const actividadIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID debe ser un número entero positivo')
];

export const cerrarJornadaValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID debe ser un número entero positivo'),

  body('fechaFin')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Fecha de fin debe tener formato YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('Fecha de fin debe ser una fecha válida'),

  body('horaFin')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Hora de fin debe tener formato HH:MM y ser válida')
];

export const getStatisticsValidation = [
  query('fechaDesde')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Fecha desde debe tener formato YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('Fecha desde debe ser una fecha válida'),

  query('fechaHasta')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Fecha hasta debe tener formato YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('Fecha hasta debe ser una fecha válida')
];

export const getAbiertasValidation = [
  query('recursoId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de recurso debe ser un número entero positivo')
];

export const validateActividadValidation = [
  body('recursoId')
    .isInt({ min: 1 })
    .withMessage('ID de recurso debe ser un número entero positivo'),

  body('fechaInicio')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Fecha de inicio debe tener formato YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('Fecha de inicio debe ser una fecha válida'),

  body('horaInicio')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Hora de inicio debe tener formato HH:MM y ser válida'),

  body('fechaFin')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Fecha de fin debe tener formato YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('Fecha de fin debe ser una fecha válida'),

  body('horaFin')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Hora de fin debe tener formato HH:MM y ser válida'),

  query('excludeId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('excludeId debe ser un número entero positivo')
];

export const getSuggestedSlotsValidation = [
  query('recursoId')
    .isInt({ min: 1 })
    .withMessage('ID de recurso debe ser un número entero positivo'),

  query('fecha')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Fecha debe tener formato YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('Fecha debe ser una fecha válida'),

  query('duration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('Duración debe ser un número entre 15 y 480 minutos')
];

export const getByResourceDateValidation = [
  query('recursoId')
    .isInt({ min: 1 })
    .withMessage('ID de recurso debe ser un número entero positivo'),

  query('fecha')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Fecha debe tener formato YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('Fecha debe ser una fecha válida')
];