import { body, query, param } from 'express-validator';

export const createObraValidation = [
  body('codigo')
    .notEmpty()
    .withMessage('El código es obligatorio')
    .isLength({ min: 2, max: 50 })
    .withMessage('El código debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('El código solo puede contener letras, números, guiones y guiones bajos'),

  body('descripcion')
    .notEmpty()
    .withMessage('La descripción es obligatoria')
    .isLength({ min: 3, max: 255 })
    .withMessage('La descripción debe tener entre 3 y 255 caracteres'),

  body('observaciones')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden superar los 1000 caracteres'),

  body('activo')
    .optional()
    .isBoolean()
    .withMessage('El campo activo debe ser un valor booleano')
];

export const updateObraValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID debe ser un número entero positivo'),

  body('codigo')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El código debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('El código solo puede contener letras, números, guiones y guiones bajos'),

  body('descripcion')
    .optional()
    .isLength({ min: 3, max: 255 })
    .withMessage('La descripción debe tener entre 3 y 255 caracteres'),

  body('observaciones')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden superar los 1000 caracteres'),

  body('activo')
    .optional()
    .isBoolean()
    .withMessage('El campo activo debe ser un valor booleano')
];

export const getObrasValidation = [
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

  query('search')
    .optional()
    .isLength({ min: 2 })
    .withMessage('La búsqueda debe tener al menos 2 caracteres'),

  query('codigo')
    .optional()
    .isLength({ min: 1 })
    .withMessage('El filtro código no puede estar vacío'),

  query('descripcion')
    .optional()
    .isLength({ min: 1 })
    .withMessage('El filtro descripción no puede estar vacío')
];

export const obraIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID debe ser un número entero positivo')
];

export const importObrasValidation = [
  body('obras')
    .isArray({ min: 1 })
    .withMessage('Se debe proporcionar un array de obras con al menos un elemento'),

  body('obras.*.codigo')
    .notEmpty()
    .withMessage('El código es obligatorio para cada obra')
    .isLength({ min: 2, max: 50 })
    .withMessage('El código debe tener entre 2 y 50 caracteres'),

  body('obras.*.descripcion')
    .notEmpty()
    .withMessage('La descripción es obligatoria para cada obra')
    .isLength({ min: 3, max: 255 })
    .withMessage('La descripción debe tener entre 3 y 255 caracteres')
];