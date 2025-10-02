import { body, query, param } from 'express-validator';
import { ExportFormat } from '../models/ExportLog';

export const exportERPValidation = [
  body('fechaInicio')
    .isDate({ format: 'YYYY-MM-DD' })
    .withMessage('fechaInicio debe ser una fecha válida en formato YYYY-MM-DD')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date > now) {
        throw new Error('fechaInicio no puede ser futura');
      }
      return true;
    }),

  body('fechaFin')
    .isDate({ format: 'YYYY-MM-DD' })
    .withMessage('fechaFin debe ser una fecha válida en formato YYYY-MM-DD')
    .custom((value, { req }) => {
      const startDate = new Date(req.body.fechaInicio);
      const endDate = new Date(value);
      const now = new Date();

      if (endDate > now) {
        throw new Error('fechaFin no puede ser futura');
      }

      if (endDate < startDate) {
        throw new Error('fechaFin debe ser posterior a fechaInicio');
      }

      // Maximum 3 months range
      const maxRangeMs = 90 * 24 * 60 * 60 * 1000; // 90 days
      if (endDate.getTime() - startDate.getTime() > maxRangeMs) {
        throw new Error('El rango de fechas no puede exceder 90 días');
      }

      return true;
    }),

  body('empresa')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('empresa debe ser una cadena de 1-200 caracteres'),

  body('tipoRecurso')
    .optional()
    .isIn(['operario', 'maquina'])
    .withMessage('tipoRecurso debe ser "operario" o "maquina"'),

  body('obraIds')
    .optional()
    .custom((value) => {
      if (!Array.isArray(value) && typeof value !== 'number') {
        throw new Error('obraIds debe ser un número o array de números');
      }
      const ids = Array.isArray(value) ? value : [value];
      if (!ids.every(id => Number.isInteger(id) && id > 0)) {
        throw new Error('Todos los obraIds deben ser enteros positivos');
      }
      return true;
    }),

  body('recursoIds')
    .optional()
    .custom((value) => {
      if (!Array.isArray(value) && typeof value !== 'number') {
        throw new Error('recursoIds debe ser un número o array de números');
      }
      const ids = Array.isArray(value) ? value : [value];
      if (!ids.every(id => Number.isInteger(id) && id > 0)) {
        throw new Error('Todos los recursoIds deben ser enteros positivos');
      }
      return true;
    }),

  body('format')
    .optional()
    .isIn(Object.values(ExportFormat))
    .withMessage(`format debe ser uno de: ${Object.values(ExportFormat).join(', ')}`)
];

export const exportPreviewValidation = [
  body('fechaInicio')
    .isDate({ format: 'YYYY-MM-DD' })
    .withMessage('fechaInicio debe ser una fecha válida en formato YYYY-MM-DD')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date > now) {
        throw new Error('fechaInicio no puede ser futura');
      }
      return true;
    }),

  body('fechaFin')
    .isDate({ format: 'YYYY-MM-DD' })
    .withMessage('fechaFin debe ser una fecha válida en formato YYYY-MM-DD')
    .custom((value, { req }) => {
      const startDate = new Date(req.body.fechaInicio);
      const endDate = new Date(value);
      const now = new Date();

      if (endDate > now) {
        throw new Error('fechaFin no puede ser futura');
      }

      if (endDate < startDate) {
        throw new Error('fechaFin debe ser posterior a fechaInicio');
      }

      // Maximum 3 months range
      const maxRangeMs = 90 * 24 * 60 * 60 * 1000; // 90 days
      if (endDate.getTime() - startDate.getTime() > maxRangeMs) {
        throw new Error('El rango de fechas no puede exceder 90 días');
      }

      return true;
    }),

  body('empresa')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('empresa debe ser una cadena de 1-200 caracteres'),

  body('tipoRecurso')
    .optional()
    .isIn(['operario', 'maquina'])
    .withMessage('tipoRecurso debe ser "operario" o "maquina"'),

  body('obraIds')
    .optional()
    .custom((value) => {
      if (!Array.isArray(value) && typeof value !== 'number') {
        throw new Error('obraIds debe ser un número o array de números');
      }
      const ids = Array.isArray(value) ? value : [value];
      if (!ids.every(id => Number.isInteger(id) && id > 0)) {
        throw new Error('Todos los obraIds deben ser enteros positivos');
      }
      return true;
    }),

  body('recursoIds')
    .optional()
    .custom((value) => {
      if (!Array.isArray(value) && typeof value !== 'number') {
        throw new Error('recursoIds debe ser un número o array de números');
      }
      const ids = Array.isArray(value) ? value : [value];
      if (!ids.every(id => Number.isInteger(id) && id > 0)) {
        throw new Error('Todos los recursoIds deben ser enteros positivos');
      }
      return true;
    })
];

export const getExportLogsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page debe ser un entero mayor a 0'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit debe ser un entero entre 1 y 100')
];

export const exportLogIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un entero positivo')
];