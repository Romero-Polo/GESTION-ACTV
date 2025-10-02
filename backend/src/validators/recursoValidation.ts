import { body, query, param } from 'express-validator';
import { TipoRecurso } from '../models/Recurso';

export const createRecursoValidation = [
  body('codigo')
    .notEmpty()
    .withMessage('El código es obligatorio')
    .isLength({ min: 2, max: 50 })
    .withMessage('El código debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('El código solo puede contener letras, números, guiones y guiones bajos'),

  body('nombre')
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),

  body('tipo')
    .notEmpty()
    .withMessage('El tipo es obligatorio')
    .isIn(Object.values(TipoRecurso))
    .withMessage(`El tipo debe ser uno de: ${Object.values(TipoRecurso).join(', ')}`),

  body('agrCoste')
    .notEmpty()
    .withMessage('El agregado de coste es obligatorio')
    .isLength({ min: 1, max: 50 })
    .withMessage('El agregado de coste debe tener entre 1 y 50 caracteres'),

  body('activo')
    .optional()
    .isBoolean()
    .withMessage('El campo activo debe ser un valor booleano')
];

export const updateRecursoValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID debe ser un número entero positivo'),

  body('codigo')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El código debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('El código solo puede contener letras, números, guiones y guiones bajos'),

  body('nombre')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),

  body('tipo')
    .optional()
    .isIn(Object.values(TipoRecurso))
    .withMessage(`El tipo debe ser uno de: ${Object.values(TipoRecurso).join(', ')}`),

  body('agrCoste')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('El agregado de coste debe tener entre 1 y 50 caracteres'),

  body('activo')
    .optional()
    .isBoolean()
    .withMessage('El campo activo debe ser un valor booleano')
];

export const getRecursosValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero positivo'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),

  query('activo')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('El filtro activo debe ser true o false'),

  query('tipo')
    .optional()
    .isIn(Object.values(TipoRecurso))
    .withMessage(`El tipo debe ser uno de: ${Object.values(TipoRecurso).join(', ')}`),

  query('search')
    .optional()
    .isLength({ min: 2 })
    .withMessage('La búsqueda debe tener al menos 2 caracteres'),

  query('codigo')
    .optional()
    .isLength({ min: 1 })
    .withMessage('El filtro código no puede estar vacío'),

  query('nombre')
    .optional()
    .isLength({ min: 1 })
    .withMessage('El filtro nombre no puede estar vacío')
];

export const recursoIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID debe ser un número entero positivo')
];

export const searchRecursosValidation = [
  query('q')
    .notEmpty()
    .withMessage('El parámetro de búsqueda es obligatorio')
    .isLength({ min: 2 })
    .withMessage('La búsqueda debe tener al menos 2 caracteres'),

  query('tipo')
    .optional()
    .isIn(Object.values(TipoRecurso))
    .withMessage(`El tipo debe ser uno de: ${Object.values(TipoRecurso).join(', ')}`),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('El límite debe ser un número entre 1 y 50')
];

export const importRecursosValidation = [
  body('recursos')
    .isArray({ min: 1 })
    .withMessage('Se debe proporcionar un array de recursos con al menos un elemento'),

  body('recursos.*.codigo')
    .notEmpty()
    .withMessage('El código es obligatorio para cada recurso')
    .isLength({ min: 2, max: 50 })
    .withMessage('El código debe tener entre 2 y 50 caracteres'),

  body('recursos.*.nombre')
    .notEmpty()
    .withMessage('El nombre es obligatorio para cada recurso')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),

  body('recursos.*.tipo')
    .notEmpty()
    .withMessage('El tipo es obligatorio para cada recurso')
    .isIn(Object.values(TipoRecurso))
    .withMessage(`El tipo debe ser uno de: ${Object.values(TipoRecurso).join(', ')}`),

  body('recursos.*.agrCoste')
    .notEmpty()
    .withMessage('El agregado de coste es obligatorio para cada recurso')
];