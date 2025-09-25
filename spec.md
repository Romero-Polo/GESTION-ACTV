Especificación Detallada de la Webapp de Control y Registro de Actividad Laboral
1. Propósito y Objetivo:
Trasladar las actividades de recursos (operarios y máquinas) a partes de trabajo por obra diarios.
Trasladar los costes indirectos (horas de personas, horas/km de máquina) a los proyectos donde trabajan.

2. Roles de Usuario y Permisos:
Operario:
	Registrar y modificar solo sus propias actividades.
	Ver solo sus propias actividades.

Jefe de Equipo:
	Registrar y modificar actividades de sus operarios.
	Ver todas las actividades de sus operarios.
	Funcionalidades adicionales: plantillas de grupos de trabajadores (cuadrillas), herramientas para duplicar actividades existentes a otros operarios.

Técnico de Transporte:
	Mismas funcionalidades y permisos que un Jefe de Equipo.

Administrador:
	Acceso completo y capacidad de modificar cualquier actividad.
	Acceso al panel de control completo.

3. Registro y Gestión de Actividades:
Campos de registro:
	Obra (selección de lista predefinida).
	Día (fecha de inicio).
	Hora de inicio (selección de desplegable: 00, 15, 30, 45 minutos).
	Operario(s) y/o equipo(s) de operarios (selección de lista predefinida).
	Tipo de actividad (selección de lista predefinida, ej. transporte, extendido, fresado, con código único asociado).
	Campo opcional de observaciones.
	Hora de fin (opcional).

Jornada Abierta: Si no se indica fecha/hora de fin, la finalización será la fecha/hora de inicio del siguiente registro del mismo operario.

Validaciones:
	Las actividades no pueden solaparse para el mismo operario.
	No hay restricciones iniciales en el número de horas por día por operario.
	No hay restricciones iniciales en el volumen de horas/km por día y máquina.

Auditoría: Se registrará fecha_creacion, usuario_creacion, fecha_ultima_modificacion, usuario_ultima_modificacion.
Conflictos de Edición: "Último gana" para modificaciones concurrentes.

4. Obras y Recursos (Operarios/Máquinas):
Obras:
	Información: Código, descripción y campo opcional de observaciones.
	Fuente: Lista predefinida obtenida de n8n (API/webhook).
	Posibilidad de desactivar obras para que no aparezcan en listas de selección.

Operarios/Máquinas:
	Fuente: Lista predefinida obtenida de n8n (API/webhook).
	Identificador único para operarios y máquinas.
	Posibilidad de desactivar operarios para que no aparezcan en listas de selección.

Sincronización de Datos Externos: Programada con recurrencia configurable (diaria o por eventos vía webhook).

5. Visualización de Actividades:
Vistas: Opciones para cambiar la vista (diaria, semanal, mensual).
Permitir modificación de actividades en diferentes franjas horarias.
Panel de Control (Dashboard):
	Inicialmente incluirá un calendario con las actividades registradas.
	Una lista filtrable de actividades.
	Opciones de filtrado: por obra, por operario, por rango de fechas, por tipo de actividad.

6. Integraciones y Exportación de Datos:
Integración GPS de Máquinas (Futura):
	Relación mediante la combinación de identificador único de máquina, operario y actividad.
	Resumen por obra incluirá horas totales (operarios + máquinas) y/o km (máquinas) para partes de trabajo diarios.

Exportación a ERP (API/MCP):
	Request: fecha_inicio, fecha_fin, empresa.
	Response (JSON): Fecha (date), Recurso (string), Obra (string), Cantidad (float, horas o km), Agr_coste (string, campo fijo de la ficha del recurso), Actividad (string).

7. Arquitectura y Tecnología:
Base de Datos: SQL Server.
Front-end:
	Amigable, fácil de usar, responsive e intuitivo.
	No hay restricciones de frameworks (se valorará el que mejor se adapte a responsive y rapidez).

	Diseño:
		Naranja principal: #FAA61A (botones de acción).
		Colores secundarios: #FBC976, #FDE4BB.
		Grises: #555555, #9a9a9a, #dedede.
		Tipo de letra: Aller, Calibri o Arial.
		Botones con esquinas redondeadas.
		Controles modernos estilo app de teléfono (ej. date pickers para fechas y horas).

Autenticación: Integración con cuentas de Office365.
Idiomas: Español y Catalán.
Escalabilidad: Diseñada para 300 actividades diarias iniciales.

8. Futuras Consideraciones (Mencionadas pero no para la fase inicial):
	Mecanismos de notificación mediante webhooks.
	Complementar el dashboard con información adicional (gráficos, etc.).
	Aplicaciones móviles nativas (la webapp responsive es suficiente por ahora).