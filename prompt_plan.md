# Plan de Construcción de la Webapp de Gestión de Actividad Laboral

## Análisis Arquitectónico General

La aplicación requiere:
- **Backend**: API REST con SQL Server
- **Frontend**: Webapp responsive con autenticación Office365
- **Integraciones**: APIs externas para obras/recursos y exportación ERP
- **Roles**: Operario, Jefe de Equipo, Técnico de Transporte, Administrador

## Bloques Funcionales Principales

### **Bloque A**: Infraestructura Base
- Configuración de proyecto y base de datos
- Autenticación y autorización
- Estructura de API base

### **Bloque B**: Gestión de Maestros
- CRUD de Obras
- CRUD de Operarios/Máquinas
- Tipos de Actividad
- Sincronización con APIs externas

### **Bloque C**: Gestión de Actividades
- Registro de actividades
- Validaciones de solapamiento
- Auditoría y versionado

### **Bloque D**: Interfaz de Usuario
- Dashboard principal
- Formularios de registro
- Vistas calendario (diaria/semanal/mensual)
- Sistema de filtros

### **Bloque E**: Integraciones y Reportes
- Exportación a ERP
- API para futuras integraciones GPS

## Subdivisión en Tareas Implementables

### **Bloque A: Infraestructura Base**

#### A1. Configuración del Proyecto
- A1.1: Estructura de directorios y configuración inicial
- A1.2: Configuración de base de datos SQL Server
- A1.3: Setup de testing framework

#### A2. Sistema de Autenticación
- A2.1: Configuración de Office365 Auth
- A2.2: Middleware de autenticación
- A2.3: Sistema de roles y permisos

#### A3. API Base
- A3.1: Configuración de Express/FastAPI
- A3.2: Middlewares de validación y logging
- A3.3: Estructura de respuestas API

### **Bloque B: Gestión de Maestros**

#### B1. Modelo de Datos
- B1.1: Esquema de tablas principales
- B1.2: Relaciones y constraints
- B1.3: Índices y optimizaciones

#### B2. CRUD Obras
- B2.1: Modelo y migraciones para Obras
- B2.2: Endpoints CRUD para Obras
- B2.3: Validaciones y activación/desactivación

#### B3. CRUD Operarios/Máquinas
- B3.1: Modelo unificado de Recursos
- B3.2: Endpoints CRUD para Recursos
- B3.3: Sistema de identificadores únicos

#### B4. Tipos de Actividad
- B4.1: Modelo de Tipos de Actividad
- B4.2: CRUD con códigos únicos
- B4.3: Configuración inicial de tipos

#### B5. Sincronización Externa
- B5.1: Cliente para API n8n
- B5.2: Jobs de sincronización programada
- B5.3: Manejo de errores y reintentos

### **Bloque C: Gestión de Actividades**

#### C1. Modelo de Actividades
- C1.1: Esquema de tabla Actividades
- C1.2: Campos de auditoría
- C1.3: Relaciones con maestros

#### C2. Lógica de Negocio
- C2.1: Validaciones de solapamiento
- C2.2: Cálculo automático de horas de fin
- C2.3: Reglas de jornada abierta

#### C3. CRUD Actividades
- C3.1: Endpoints de creación y consulta
- C3.2: Endpoints de modificación y eliminación
- C3.3: Filtros y búsquedas

#### C4. Sistema de Auditoría
- C4.1: Logging de cambios
- C4.2: Tracking de modificaciones concurrentes
- C4.3: Resolución "último gana"

### **Bloque D: Interfaz de Usuario**

#### D1. Setup Frontend
- D1.1: Configuración de framework React/Vue
- D1.2: Sistema de routing
- D1.3: Estado global y store

#### D2. Autenticación Frontend
- D2.1: Integración con Office365
- D2.2: Manejo de tokens y sesiones
- D2.3: Guards de rutas por rol

#### D3. Componentes Base
- D3.1: Sistema de diseño (colores, tipografía)
- D3.2: Componentes reutilizables
- D3.3: Formularios y validaciones

#### D4. Dashboard Principal
- D4.1: Layout responsive
- D4.2: Vista calendario básica
- D4.3: Lista de actividades

#### D5. Gestión de Actividades UI
- D5.1: Formulario de registro
- D5.2: Vistas diaria/semanal/mensual
- D5.3: Sistema de filtros

#### D6. Internacionalización
- D6.1: Setup i18n
- D6.2: Traducciones español/catalán
- D6.3: Selector de idioma

### **Bloque E: Integraciones y Reportes**

#### E1. API de Exportación
- E1.1: Endpoint de exportación ERP
- E1.2: Formateo de datos JSON
- E1.3: Filtros por fecha y empresa

#### E2. Preparación para GPS
- E2.1: Estructura para datos GPS futuros
- E2.2: API endpoints preparatorios
- E2.3: Documentación de integración

---

# Prompts de Implementación Test-Driven

## **Prompt 1: Configuración Inicial del Proyecto**

```
Crear la estructura inicial de un proyecto full-stack para una webapp de gestión de actividad laboral con las siguientes características:

BACKEND (Node.js + Express + TypeScript):
- Configurar proyecto con Express, TypeScript, y Jest para testing
- Configurar conexión a SQL Server usando un ORM (TypeORM o Prisma)
- Setup básico de middlewares (cors, helmet, express-validator)
- Estructura de directorios: src/{controllers, models, services, middleware, routes, tests, utils}
- Variables de entorno para configuración de BD y autenticación
- Script básico de salud de la API (GET /health)

FRONTEND (React + TypeScript):
- Crear aplicación React con TypeScript y Vite
- Configurar Testing Library y Jest
- Setup básico de routing con React Router
- Estructura de directorios: src/{components, pages, services, hooks, utils, types, tests}
- Configuración de Tailwind CSS con los colores especificados: #FAA61A, #FBC976, #FDE4BB, #555555, #9a9a9a, #dedede

REQUERIMIENTOS DE TESTING:
- Tests unitarios para el endpoint de salud
- Test de renderizado básico para el componente principal de React
- Scripts de npm para testing, desarrollo y build
- Configuración de CI básica (GitHub Actions o similar)

ENTREGABLES:
- Estructura de proyecto funcional
- Tests pasando
- README con instrucciones de setup
- Scripts de desarrollo listos
```

---

## **Prompt 2: Base de Datos y Modelos**

```
Implementar el esquema de base de datos y modelos de entidades para el sistema de gestión de actividades, basándose en el proyecto ya creado.

ESQUEMA DE BASE DE DATOS:
Crear las siguientes tablas con sus relaciones:

1. **usuarios** (id, email, nombre, rol, activo, fecha_creacion)
2. **obras** (id, codigo, descripcion, observaciones, activo, fecha_creacion, fecha_actualizacion)
3. **recursos** (id, codigo, nombre, tipo, activo, agr_coste, fecha_creacion)
4. **tipos_actividad** (id, codigo, nombre, descripcion, fecha_creacion)
5. **actividades** (id, obra_id, recurso_id, tipo_actividad_id, fecha_inicio, hora_inicio, fecha_fin, hora_fin, observaciones, usuario_creacion, fecha_creacion, usuario_modificacion, fecha_modificacion)

MODELOS Y VALIDACIONES:
- Implementar modelos con TypeORM/Prisma
- Validaciones de campos obligatorios y formatos
- Relaciones entre entidades correctamente definidas
- Constraints de unicidad donde corresponda

TESTING:
- Tests de creación y validación de cada modelo
- Tests de relaciones entre entidades
- Tests de constraints y validaciones
- Migrations de BD funcionando correctamente

ENTREGABLES:
- Modelos implementados con validaciones
- Migrations ejecutables
- Tests de modelos pasando
- Seeders básicos para datos de prueba
```

---

## **Prompt 3: Sistema de Autenticación y Autorización**

```
Implementar autenticación con Office365 y sistema de roles, construyendo sobre la estructura existente.

AUTENTICACIÓN OFFICE365:
- Configurar Microsoft Graph SDK y passport-azure-ad
- Middleware de autenticación JWT
- Endpoints de login/logout con redirects apropiados
- Manejo de tokens y refresh tokens
- Gestión de sesiones

SISTEMA DE ROLES:
Implementar 4 roles con sus permisos:
- **Operario**: Solo sus propias actividades
- **Jefe de Equipo**: Actividades de sus operarios
- **Técnico de Transporte**: Mismo que Jefe de Equipo
- **Administrador**: Acceso completo

MIDDLEWARE DE AUTORIZACIÓN:
- Decoradores/middleware para proteger endpoints por rol
- Validación de permisos a nivel de recurso (ej: operario solo ve sus actividades)
- Sistema de verificación de propiedad de recursos

FRONTEND:
- Hook de autenticación con Office365
- Context/Store para estado de usuario autenticado
- Guards de rutas basados en roles
- Componente de login/logout

TESTING:
- Tests de autenticación exitosa y fallida
- Tests de autorización por cada rol
- Tests de middleware de permisos
- Tests de componentes de autenticación

ENTREGABLES:
- Sistema de auth completo y funcional
- Middleware de autorización por roles
- Frontend con login integrado
- Todos los tests pasando
```

---

## **Prompt 4: CRUD de Obras y Recursos**

```
Implementar la gestión completa de Obras y Recursos (Operarios/Máquinas), basándose en la autenticación ya implementada.

BACKEND - CRUD OBRAS:
- Endpoints: GET, POST, PUT, DELETE /api/obras
- Validaciones: código único, descripción obligatoria
- Soft delete (campo activo) en lugar de eliminación física
- Filtros: por activo/inactivo, búsqueda por código/descripción
- Autorización: solo Administradores pueden modificar

BACKEND - CRUD RECURSOS:
- Endpoints: GET, POST, PUT, DELETE /api/recursos
- Campos: código único, nombre, tipo (operario/máquina), agr_coste
- Soft delete y filtros similares a obras
- Endpoint adicional: GET /api/recursos/operarios y /api/recursos/maquinas
- Autorización: solo Administradores pueden modificar

VALIDACIONES DE NEGOCIO:
- Códigos únicos y obligatorios
- Formato de agr_coste válido
- No permitir desactivar obras/recursos con actividades activas

FRONTEND:
- Páginas de listado con tabla filtrable y paginada
- Formularios de creación/edición con validación
- Confirmación de eliminación con advertencias
- Búsqueda en tiempo real
- Indicadores visuales de estado (activo/inactivo)

TESTING:
- Tests CRUD completos para ambas entidades
- Tests de validaciones y constraints
- Tests de autorización por rol
- Tests de filtros y búsquedas
- Tests de componentes frontend

ENTREGABLES:
- API completa para obras y recursos
- Interface de usuario intuitiva y responsive
- Validaciones robustas front y backend
- Suite de tests completa
```

---

## **Prompt 5: Gestión de Actividades - Parte 1 (CRUD Básico)**

```
Implementar el CRUD básico de actividades sin validaciones de solapamiento, construyendo sobre el sistema de obras y recursos existente.

BACKEND - MODELO DE ACTIVIDADES:
- Implementar modelo completo con todas las relaciones
- Campos de auditoría: usuario_creacion, fecha_creacion, usuario_modificacion, fecha_modificacion
- Manejo de fecha/hora de inicio obligatorios
- Fecha/hora de fin opcionales (jornada abierta)

ENDPOINTS DE ACTIVIDADES:
- POST /api/actividades - Crear nueva actividad
- GET /api/actividades - Listar con filtros (obra, recurso, fechas, tipo)
- GET /api/actividades/:id - Obtener una actividad
- PUT /api/actividades/:id - Modificar actividad existente
- DELETE /api/actividades/:id - Eliminar actividad

AUTORIZACIÓN POR ROL:
- Operario: solo sus propias actividades
- Jefe/Técnico: actividades de sus recursos asignados
- Administrador: todas las actividades

FRONTEND - FORMULARIO DE ACTIVIDADES:
- Selector de obra (dropdown con búsqueda)
- Selector de fecha (date picker moderno)
- Selector de hora de inicio (dropdown: 00, 15, 30, 45)
- Selector de recurso filtrado por permisos del usuario
- Selector de tipo de actividad
- Campo opcional de observaciones
- Checkbox para "jornada abierta" (sin hora fin)

FRONTEND - LISTA DE ACTIVIDADES:
- Tabla responsive con paginación
- Filtros por obra, recurso, rango de fechas
- Indicadores de jornada abierta
- Acciones: editar, eliminar (según permisos)

TESTING:
- Tests CRUD con diferentes roles
- Tests de filtros y paginación
- Tests de formularios con validaciones
- Tests de autorización de recursos

ENTREGABLES:
- CRUD de actividades funcionando
- Formularios frontend intuitivos
- Sistema de filtros robusto
- Tests completos pasando
```

---

## **Prompt 6: Validaciones de Solapamiento y Jornada Abierta**

```
Implementar las validaciones de negocio críticas: no solapamiento de actividades y manejo de jornada abierta, basándose en el CRUD ya implementado.

LÓGICA DE VALIDACIÓN DE SOLAPAMIENTO:
- Función para detectar solapamiento entre actividades del mismo recurso
- Validación al crear nueva actividad
- Validación al modificar actividad existente
- Considerar jornadas abiertas en el cálculo

ALGORITMO DE JORNADA ABIERTA:
- Si una actividad no tiene hora_fin, buscar la siguiente actividad del mismo recurso
- La hora_fin será la hora_inicio de la siguiente actividad
- Si no hay siguiente actividad, la jornada queda abierta hasta nuevo aviso

BACKEND - VALIDACIONES:
- Middleware de validación de solapamiento pre-save
- Endpoint de validación: POST /api/actividades/validate
- Manejo de errores descriptivos para solapamientos
- Recálculo automático de horas_fin cuando se insertan actividades intermedias

SERVICE LAYER:
- ActividadService con métodos:
  - validarSolapamiento(actividad)
  - calcularHoraFin(actividad)
  - recalcularJornadaAberta(recurso_id, fecha)
  - obtenerActividadesPorRecurso(recurso_id, fecha)

FRONTEND - VALIDACIÓN TIEMPO REAL:
- Validación de solapamiento mientras el usuario escribe
- Indicadores visuales de conflictos
- Sugerencias automáticas de horarios disponibles
- Preview de cómo quedará la jornada tras el cambio

TESTING:
- Tests de solapamiento en múltiples escenarios
- Tests de cálculo de jornada abierta
- Tests de recálculo cuando se modifican/eliminan actividades
- Tests de validación en tiempo real
- Tests de casos edge (medianoche, cambios de día)

ENTREGABLES:
- Sistema de validaciones robusto
- Cálculo automático de jornadas
- UX intuitiva para evitar errores
- Tests exhaustivos de casos límite
```

---

## **Prompt 7: Dashboard y Visualizaciones**

```
Crear el dashboard principal con calendario y vistas de actividades, integrando todos los componentes desarrollados anteriormente.

DASHBOARD LAYOUT:
- Header con información del usuario y selector de idioma (ES/CA)
- Sidebar con navegación por secciones
- Área principal con widgets configurables
- Layout responsive que funcione en móvil y desktop

CALENDARIO DE ACTIVIDADES:
- Vista mensual con actividades resumidas por día
- Vistas semanal y diaria con detalles
- Navegación entre periodos (anterior/siguiente)
- Color-coding por tipo de actividad o estado
- Click en día para crear nueva actividad
- Drag & drop para mover actividades (opcional en esta fase)

WIDGETS DEL DASHBOARD:
- Resumen de actividades del día actual
- Lista de jornadas abiertas pendientes
- Estadísticas rápidas (horas del mes, actividades pendientes)
- Obras más activas del periodo

SISTEMA DE FILTROS:
- Panel de filtros colapsible
- Filtros por: obra, recurso, tipo de actividad, rango de fechas
- Filtros rápidos: "Hoy", "Esta semana", "Este mes"
- Persistencia de filtros en localStorage

RESPONSIVE DESIGN:
- Breakpoints para móvil, tablet y desktop
- Navegación móvil con hamburger menu
- Cards que se adapten al tamaño de pantalla
- Touch-friendly para dispositivos móviles

INTERNACIONALIZACIÓN:
- Setup de react-i18next
- Traducciones para español y catalán
- Selector de idioma en header
- Formatos de fecha/hora según idioma

TESTING:
- Tests de renderizado de cada vista
- Tests de navegación entre periodos
- Tests de filtros y persistencia
- Tests de responsive en diferentes tamaños
- Tests de cambio de idioma

ENTREGABLES:
- Dashboard completo y funcional
- Vistas de calendario responsive
- Sistema de filtros integrado
- Soporte completo de idiomas
- Tests de UI/UX pasando
```

---

## **Prompt 8: Sincronización con APIs Externas**

```
Implementar la sincronización con n8n para obtener obras y recursos externos, construyendo sobre la gestión de maestros ya existente.

CONFIGURACIÓN DE INTEGRACIÓN:
- Variables de entorno para URLs y autenticación de n8n
- Configuración de timeouts y reintentos
- Logging detallado de sincronizaciones

CLIENTE HTTP PARA N8N:
- Service para comunicación con n8n
- Manejo de autenticación (API keys, tokens)
- Parseo y validación de respuestas
- Manejo de errores de red y timeouts

SINCRONIZACIÓN DE OBRAS:
- Endpoint GET en n8n para obtener obras
- Mapeo de campos externos a modelo interno
- Detección de cambios (nuevas, modificadas, desactivadas)
- Merge inteligente preservando datos locales

SINCRONIZACIÓN DE RECURSOS:
- Endpoint GET en n8n para obtener recursos
- Distinción entre operarios y máquinas
- Manejo de códigos únicos y conflictos
- Preservación de asignaciones locales

JOBS PROGRAMADOS:
- Sistema de cron jobs para sincronización automática
- Configuración de frecuencia (diaria/semanal)
- Jobs manuales desde panel de administración
- Monitoreo de estado y historial de sincronizaciones

WEBHOOK ENDPOINT:
- Endpoint POST /api/sync/webhook para notificaciones inmediatas
- Validación de autenticidad del webhook
- Procesamiento asíncrono de notificaciones
- Log de eventos recibidos

PANEL DE ADMINISTRACIÓN:
- Vista de estado de sincronizaciones
- Botones para forzar sync manual
- Logs de errores y éxitos
- Configuración de frecuencias

TESTING:
- Mock de APIs externas para testing
- Tests de sincronización exitosa y con errores
- Tests de detección de cambios
- Tests de webhooks y jobs programados
- Tests de manejo de conflictos

ENTREGABLES:
- Sistema de sincronización robusto
- Panel de monitoreo para administradores
- Manejo de errores y recuperación automática
- Suite de tests con mocks de APIs externas
```

---

## **Prompt 9: API de Exportación para ERP**

```
Crear la API de exportación de datos para integración con sistemas ERP, basándose en toda la funcionalidad de actividades ya implementada.

ENDPOINT DE EXPORTACIÓN:
- POST /api/export/erp con parámetros: fecha_inicio, fecha_fin, empresa
- Validación de rangos de fechas máximos (ej: 3 meses)
- Autorización: solo Administradores y Técnicos
- Rate limiting para evitar abuso

FORMATO DE RESPUESTA JSON:
{
  "fecha": "2023-12-15",
  "recurso": "OP001 - Juan Pérez",
  "obra": "OB001 - Construcción Edificio A",
  "cantidad": 8.5,
  "agr_coste": "MANO_OBRA_DIRECTA",
  "actividad": "Extendido de asfalto"
}

LÓGICA DE AGREGACIÓN:
- Agrupar actividades por fecha, recurso, obra y tipo
- Sumar horas totales por agrupación
- Para máquinas: incluir km si están disponibles (preparar para GPS futuro)
- Manejo de jornadas abiertas en el cálculo

OPTIMIZACIÓN Y PERFORMANCE:
- Queries optimizadas para grandes volúmenes
- Paginación de resultados si exceden límite
- Cache de consultas frecuentes
- Índices de BD para consultas de exportación

SEGURIDAD:
- Validación de empresa contra recursos del usuario
- Log de todas las exportaciones (quién, cuándo, qué datos)
- Encriptación de datos sensibles en tránsito
- Headers de seguridad apropiados

DOCUMENTACIÓN API:
- Swagger/OpenAPI documentation
- Ejemplos de requests y responses
- Códigos de error específicos
- Guía de integración para desarrolladores ERP

FRONTEND - PANEL DE EXPORTACIÓN:
- Formulario para seleccionar rangos y empresa
- Preview de datos antes de exportar
- Descarga como JSON/CSV
- Historial de exportaciones realizadas

TESTING:
- Tests de agregación con datasets complejos
- Tests de performance con volúmenes altos
- Tests de autorización y seguridad
- Tests de validación de parámetros
- Tests de formatos de salida

ENTREGABLES:
- API de exportación completa y documentada
- Panel de administración para exportaciones
- Optimizaciones de performance implementadas
- Documentación técnica para integradores
- Tests de carga y funcionalidad pasando
```

---

## **Prompt 10: Preparación para GPS y Funcionalidades Futuras**

```
Preparar la arquitectura para futuras integraciones GPS y completar funcionalidades finales, integrando todo el sistema desarrollado.

PREPARACIÓN PARA INTEGRACIÓN GPS:
- Extensión del modelo Actividades para datos GPS
- Campos: latitud_inicio, longitud_inicio, latitud_fin, longitud_fin, km_recorridos
- Endpoints placeholder: POST /api/gps/activity/:id/location
- Estructura de datos para tracks GPS futuros

MEJORAS EN EXPORTACIÓN ERP:
- Incluir km_recorridos en el formato de salida cuando esté disponible
- Endpoint GET /api/export/preview para previsualizar datos
- Soporte para múltiples formatos: JSON, CSV, XML
- Filtros adicionales por tipo de recurso

OPTIMIZACIONES FINALES:
- Índices de BD para queries más frecuentes
- Cache Redis para consultas de dashboard
- Compresión de respuestas API (gzip)
- Logs estructurados para mejor monitoreo

FUNCIONALIDADES DE ADMINISTRACIÓN:
- Panel de métricas del sistema (actividades/día, usuarios activos)
- Backup automático de configuraciones
- Sistema de notificaciones internas
- Gestión de logs y limpieza automática

TESTING INTEGRAL:
- Tests end-to-end del flujo completo
- Tests de carga con 300 actividades diarias
- Tests de compatibilidad multi-idioma
- Tests de seguridad (OWASP Top 10)

DOCUMENTACIÓN FINAL:
- README completo con setup y deployment
- Documentación de API actualizada
- Guías de usuario por rol
- Guías de troubleshooting

DEPLOYMENT:
- Scripts de deployment automatizado
- Configuración de CI/CD
- Configuración de monitoreo (health checks)
- Variables de entorno para producción

ENTREGABLES:
- Sistema completo y optimizado
- Preparación para funcionalidades futuras
- Documentación completa
- Scripts de deployment listos
- Suite de tests completa pasando
- Aplicación lista para producción
```

---

## Resumen de la Estrategia de Implementación

Esta serie de 10 prompts sigue una progresión lógica y test-driven:

1. **Fundación sólida**: Estructura base con testing desde el inicio
2. **Datos consistentes**: Modelos y relaciones bien definidas
3. **Seguridad robusta**: Autenticación y autorización apropiadas
4. **Funcionalidad incremental**: CRUDs básicos antes de lógica compleja
5. **Validaciones críticas**: Reglas de negocio implementadas gradualmente
6. **Experiencia de usuario**: Dashboard intuitivo y responsive
7. **Integraciones externas**: Sincronización con sistemas existentes
8. **Integración empresarial**: APIs para conectar con ERPs
9. **Preparación futura**: Arquitectura extensible para nuevas funcionalidades

Cada prompt construye sobre el anterior, manteniendo la funcionalidad existente mientras añade nuevas capacidades. Los tests aseguran que no hay regresiones y que cada nueva funcionalidad es robusta desde su implementación.

### Mejores Prácticas Aplicadas:
- **Test-Driven Development**: Tests antes del código
- **Incrementalidad**: Cada paso añade valor funcional
- **Integración continua**: No hay código "huérfano"
- **Robustez**: Manejo de errores y casos límite
- **Escalabilidad**: Diseño para 300+ actividades diarias
- **Mantenibilidad**: Código limpio y documentado