// Export all models
export { Usuario, RolUsuario } from './Usuario';
export { Obra } from './Obra';
export { Recurso, TipoRecurso } from './Recurso';
export { TipoActividad } from './TipoActividad';
export { Actividad } from './Actividad';

// Export array for TypeORM configuration
import { Usuario } from './Usuario';
import { Obra } from './Obra';
import { Recurso } from './Recurso';
import { TipoActividad } from './TipoActividad';
import { Actividad } from './Actividad';

export const entities = [
  Usuario,
  Obra,
  Recurso,
  TipoActividad,
  Actividad
];