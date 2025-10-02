# Especificaciones del Proyecto - Gestión de Actividades Laborales

## Información General

**Proyecto:** Sistema de Gestión de Actividades Laborales
**Versión:** 1.6.1
**Fecha de última actualización:** 2025-10-02
**Base de datos:** SQL Server (192.168.0.30:1433/RP_GESTOR_JORNADAS)

## ⚠️ POLÍTICA DE DATOS CRÍTICA

**IMPORTANTE:** Este sistema NO debe NUNCA utilizar datos falsos, mock o de prueba en ninguna circunstancia.

### Principios fundamentales:
1. **Datos Reales Únicamente**: Todos los datos deben provenir EXCLUSIVAMENTE del servidor de base de datos SQL Server.
2. **Sin Datos Mock**: PROHIBIDO implementar o devolver datos de prueba, simulados o hardcodeados.
3. **Transparencia de Errores**: Cuando no hay conexión a la base de datos, el sistema debe:
   - Mostrar errores claros y descriptivos al usuario
   - Devolver códigos de error HTTP apropiados (503 Service Unavailable)
   - NUNCA engañar al usuario mostrando datos falsos
4. **Experiencia del Usuario**: Es preferible mostrar un error claro que permita solucionar el problema, que dar una falsa sensación de funcionamiento con datos inventados.

### Implementación:
- Backend: Debe devolver error 503 cuando no puede conectarse a SQL Server
- Frontend: Debe mostrar alertas visuales claras cuando hay errores de conexión
- Logs: Deben indicar claramente el estado de conexión con la base de datos

## Arquitectura del Sistema

### Backend
- **Tecnología:** Node.js con servidor HTTP nativo
- **Base de datos:** SQL Server
- **Puerto:** 3002
- **Sin dependencias externas:** Utiliza únicamente módulos nativos de Node.js y herramienta CLI `mssql`
- **Conexión SQL:** Utiliza PowerShell wrapper para ejecutar comandos mssql-cli con manejo correcto de caracteres especiales en contraseñas

### Frontend
- **Tecnología:** HTML5, CSS3, JavaScript puro
- **Sin frameworks:** Implementación vanilla para máxima compatibilidad
- **Servidor estático:** Puerto configurable (por defecto 8080)

### Base de Datos
- **Motor:** Microsoft SQL Server
- **Esquema:** Ver archivo `sql_setup.sql` para estructura completa
- **Conexión:** Utiliza autenticación SQL Server con usuario dedicado

## Reglas de Negocio

### 1. Restricciones de Tiempo ⭐ **IMPLEMENTADO**

**Especificación:** Todos los selectores de hora en el sistema deben restringir las entradas de minutos únicamente a los valores: **00, 15, 30, 45**.

**Justificación:** Las actividades laborales se registran en intervalos de 15 minutos para facilitar el cálculo de horas trabajadas y la facturación.

**Implementación técnica:**
- Reemplazar todos los `<input type="time">` por selectores dropdown personalizados
- Estructura HTML:
  ```html
  <div class="time-selector-container">
      <select class="time-select" id="fieldName_horas">
          <option value="">HH</option>
          <!-- 00-23 horas -->
      </select>
      <span class="time-separator">:</span>
      <select class="time-select" id="fieldName_minutos">
          <option value="">MM</option>
          <option value="00">00</option>
          <option value="15">15</option>
          <option value="30">30</option>
          <option value="45">45</option>
      </select>
      <input type="hidden" id="fieldName" name="fieldName">
  </div>
  ```

**CSS requerido:**
```css
.time-selector-container {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.time-select {
    width: auto;
    min-width: 60px;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    text-align: center;
}

.time-separator {
    font-weight: bold;
    color: #6b7280;
    font-size: 1.1rem;
}
```

**JavaScript requerido:**
- Inicialización de selectores con horas 00-23
- Event listeners para sincronizar selectores con campo hidden
- Función para establecer valores desde datos existentes

**Archivos afectados:**
- ✅ `frontend/nueva-actividad.html` - Formulario de creación con placeholder MM corregido
- ✅ `frontend/actividades.html` - Modal de edición con sistema toast mejorado
- ✅ `frontend/agenda.html` - Selectores de tiempo en modal de creación
- 🔄 **Aplicar a futuras páginas con entrada de tiempo**

### 4. Funcionalidad de Duplicación ⭐ **IMPLEMENTADO**

**Especificación:** El sistema debe permitir duplicar actividades existentes para facilitar la creación de actividades similares.

**Comportamiento:**
- Botón "📋 Duplicar" en cada fila de la lista de actividades
- Modal de duplicación que permite cambiar únicamente:
  - Recurso (operario/máquina)
  - Tipo de actividad
- Se copian automáticamente:
  - Obra
  - Fechas y horas de inicio/fin
  - Observaciones

**Implementación técnica:**
- Botón con clase `btn-duplicate` y color púrpura (#8b5cf6)
- Modal `duplicateModal` con formulario simplificado
- Función `duplicateActivity(activityId)` para abrir modal
- Envío POST al endpoint `/actividades` con datos duplicados

**Flujo de usuario:**
1. Usuario hace clic en "📋 Duplicar" en una actividad
2. Se abre modal mostrando información de la actividad original
3. Usuario selecciona nuevo recurso y tipo de actividad
4. Sistema crea nueva actividad copiando el resto de datos
5. Modal se cierra y lista se actualiza automáticamente

**Archivos afectados:**
- ✅ `frontend/actividades.html` - Modal y funciones de duplicación

### 5. Vista Agenda - Timeline de Actividades ⭐ **IMPLEMENTADO**

**Especificación:** Visualización tipo timeline que muestra todas las actividades organizadas por recursos en filas horizontales y tiempo en columnas.

**Características principales:**
- **Layout tipo Gantt**: Recursos como filas, horas como columnas (6:00 - 22:00)
- **Filtros dinámicos**: Por fecha, obra y tipo de actividad
- **Visualización inteligente**: Solo muestra recursos con actividades
- **Bloques de actividad**: Coloreados por tipo, con información contextual
- **Responsive**: Adaptable a dispositivos móviles

**Implementación técnica:**
- **Estructura**: Grid CSS con columna fija para recursos y columna scrollable para timeline
- **Datos**: Carga todas las actividades y las organiza por recurso
- **Renderizado**: Calcula posiciones de bloques basado en hora de inicio/fin
- **Interactividad**: Click en actividad muestra detalles completos

**Colores por tipo de actividad:**
- **TRANSP** (Transporte): Azul (#3b82f6)
- **EXTEND** (Extendido): Verde (#10b981)
- **FRESADO**: Naranja (#f59e0b)
- **COMPAC** (Compactación): Púrpura (#8b5cf6)
- **MANT** (Mantenimiento): Rojo (#ef4444)
- **Default**: Gris (#6b7280)

**Navegación:**
- Botón "📅 Vista Agenda" en dashboard principal
- Enlaces de retorno a dashboard

**Archivos creados:**
- ✅ `frontend/agenda.html` - Vista timeline completa con soporte multi-día y anti-solapamiento
- ✅ `frontend/demo.html` - Dashboard reorganizado con mejor jerarquía

### 6. Gestión de Actividades Multi-Día ⭐ **IMPLEMENTADO**

**Especificación:** El sistema debe manejar correctamente actividades que se extienden durante múltiples días, mostrándolas apropiadamente en la vista agenda según el día de visualización.

**Características principales:**
- **Filtrado inteligente**: Las actividades aparecen en todos los días del rango [fechaInicio, fechaFin]
- **Visualización adaptativa**: El bloque de actividad se ajusta según si es día de inicio, intermedio o final
- **Navegación funcional**: Los botones de navegación por días re-renderizan correctamente las actividades
- **Indicadores visuales**: Bordes y estilos especiales para distinguir actividades multi-día

**Implementación técnica:**

**Filtrado de actividades (frontend/agenda.html líneas 1115-1141):**
```javascript
function filterActivities(fecha, obraId, tipoId) {
    return allActivities.filter(activity => {
        if (fecha) {
            const fechaActual = new Date(fecha + 'T00:00:00');
            const fechaInicio = new Date(activity.fechaInicio + 'T00:00:00');
            const fechaFin = activity.fechaFin ? new Date(activity.fechaFin + 'T00:00:00') : fechaInicio;

            // La actividad aparece si la fecha actual está dentro del rango
            if (fechaActual < fechaInicio || fechaActual > fechaFin) {
                return false;
            }
        }
        // ... otros filtros
    });
}
```

**Lógica de renderizado por día:**
- **Día de inicio**: Bloque desde hora real de inicio hasta 22:00
- **Día intermedio**: Bloque completo de 6:00 a 22:00
- **Día final**: Bloque desde 6:00 hasta hora real de fin
- **Día único**: Comportamiento estándar (hora inicio → hora fin)

**Visualización de texto:**
- **Día inicio**: `"09:00 → (2025-01-07)"`
- **Día intermedio**: `"(2025-01-01 → 2025-01-07)"`
- **Día final**: `"(2025-01-01) → 18:00"`

**Estilos CSS distintivos:**
```css
.multi-day-activity {
    border-style: dashed;
    border-width: 2px;
}

.multi-day-activity.start-day {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right-style: none;
}

.multi-day-activity.end-day {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left-style: none;
}

.multi-day-activity.middle-day {
    border-radius: 0;
    border-left-style: none;
    border-right-style: none;
}
```

### 7. Prevención de Solapamientos en Vista Agenda ⭐ **IMPLEMENTADO**

**Especificación:** Cuando múltiples actividades del mismo recurso se solapan en tiempo, deben posicionarse en niveles verticales diferentes para evitar superposiciones visuales.

**Características principales:**
- **Detección automática**: Algoritmo que identifica solapamientos temporales
- **Posicionamiento multi-nivel**: Asignación inteligente de niveles verticales
- **Altura dinámica**: Las filas se expanden automáticamente según el número de niveles
- **Alineación perfecta**: Todas las columnas (acciones, recursos, timeline) mantienen la misma altura

**Implementación técnica:**

**Algoritmo de detección de solapamientos (líneas 1254-1300):**
```javascript
function calculateActivityLevels(activities) {
    const validActivities = activities.filter(a => a.horaInicio)
        .sort((a, b) => parseTime(a.horaInicio) - parseTime(b.horaInicio));

    const levels = [];
    const occupiedLevels = []; // Array de arrays para rastrear ocupación

    validActivities.forEach(activity => {
        const startTime = parseTime(activity.horaInicio);
        const endTime = activity.horaFin ? parseTime(activity.horaFin) : startTime + 1;

        // Encontrar el primer nivel disponible
        let level = 1;
        while (true) {
            if (!occupiedLevels[level - 1]) {
                occupiedLevels[level - 1] = [];
            }

            const hasConflict = occupiedLevels[level - 1].some(occupied => {
                return !(endTime <= occupied.start || startTime >= occupied.end);
            });

            if (!hasConflict) {
                occupiedLevels[level - 1].push({
                    start: startTime,
                    end: endTime,
                    activity: activity
                });
                levels.push({ activity: activity, level: level });
                break;
            } else {
                level++;
            }
        }
    });

    return levels;
}
```

**Cálculo de altura dinámica:**
- **Altura base**: 80px por fila
- **Altura por nivel**: +70px por cada nivel adicional de actividades
- **Sincronización**: Todas las columnas (acciones, recursos, timeline) usan la misma altura calculada

**Posicionamiento vertical:**
```javascript
const topOffset = 10 + (level - 1) * 70; // 70px de separación entre niveles
block.style.top = `${topOffset}px`;
```

### 8. Sistema de Gestión de Tipos de Actividad con Colores ⭐ **IMPLEMENTADO**

**Especificación:** Sistema completo para gestionar tipos de actividad con soporte para colores personalizados que se reflejan en toda la aplicación.

**Características principales:**
- **Gestión CRUD completa**: Crear, leer, actualizar y eliminar tipos de actividad
- **Colores personalizados**: Cada tipo tiene un color único que se aplica en agenda y formularios
- **Interfaz dedicada**: Página independiente con tabla moderna y formularios modales
- **Integración visual**: Los colores se muestran en bloques de agenda y selectores

**Implementación técnica:**

**Base de datos (backend/server-sql-final.js):**
- ✅ Agregada columna `color NVARCHAR(7)` a tabla `tipos_actividad`
- ✅ Endpoint `PUT /tipos-actividad/:id` para actualizaciones
- ✅ Valores por defecto asignados a tipos existentes

**Frontend dedicado (frontend/tipos-actividad.html):**
- ✅ Interfaz completa de gestión con tabla responsive
- ✅ Modal de edición con selector de color nativo
- ✅ Validaciones de formulario y manejo de errores
- ✅ Feedback visual con toast notifications

**Colores por defecto implementados:**
- **TRANSP**: #3B82F6 (Azul)
- **EXTEND**: #10B981 (Verde)
- **FRESADO**: #F59E0B (Naranja)
- **COMPAC**: #8B5CF6 (Púrpura)
- **MANT**: #EF4444 (Rojo)

**Integración en aplicación:**
- ✅ `frontend/agenda.html` - Bloques coloreados según tipo
- ✅ `frontend/configuracion.html` - Enlace y estadísticas
- ✅ Todos los selectores muestran colores apropiados

### 9. Mejoras de UX y Retroalimentación Visual ⭐ **IMPLEMENTADO**

**Especificación:** Conjunto de mejoras enfocadas en la experiencia de usuario con feedback visual inmediato y comportamientos intuitivos.

**Características implementadas:**

**Alertas persistentes para solapamientos:**
- ✅ Las alertas de actividades solapadas permanecen visibles hasta ser cerradas manualmente
- ✅ Botón de cierre (✕) integrado en el mensaje de advertencia
- ✅ Función `closeAlert()` para dismissal manual

**Indicadores de carga para creación:**
- ✅ Spinner animado al pulsar "Crear Actividad"
- ✅ Texto cambia a "Guardando..." durante la operación
- ✅ Botón se deshabilita para prevenir múltiples submissions
- ✅ Estado se restaura automáticamente al completar/fallar

**Automatización de selección de tiempo:**
- ✅ Al seleccionar hora fin, minutos se establecen automáticamente en "00"
- ✅ Implementado en todos los formularios: nueva-actividad.html, agenda.html
- ✅ Mejora la consistencia y velocidad de entrada de datos

**Implementación técnica:**

**Alertas persistentes (agenda.html líneas 2094-2109):**
```javascript
if (type === 'warning') {
    alertElement.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
            <div style="flex: 1;">${message}</div>
            <button onclick="closeAlert(this)" style="...">✕</button>
        </div>
    `;
}
```

**Spinner de carga (agenda.html líneas 1816-1825):**
```javascript
submitBtn.disabled = true;
submitBtn.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
        <div class="loading" style="width: 16px; height: 16px; border-width: 2px;"></div>
        Guardando...
    </div>
`;
```

**Auto-selección de minutos (nueva-actividad.html):**
```javascript
document.getElementById('horaFin_horas').addEventListener('change', function() {
    const horaFinMinutos = document.getElementById('horaFin_minutos');
    if (this.value && horaFinMinutos.value !== '00') {
        horaFinMinutos.value = '00';
    }
});
```

### 10. Botón de Creación de Actividades en Header de Agenda ⭐ **IMPLEMENTADO**

**Especificación:** Botón prominente en el header de la vista agenda que permite crear actividades sin preselección de recurso, mejorando la accesibilidad y flujo de trabajo.

**Características principales:**
- **Ubicación estratégica**: Header de agenda junto al título
- **Funcionalidad completa**: Misma funcionalidad que botones por recurso
- **Sin preselección**: Permite seleccionar cualquier recurso disponible
- **Estilo diferenciado**: Verde para destacar como acción primaria

**Implementación técnica:**

**Botón en header (agenda.html líneas 139-143):**
```html
<button class="btn btn-success" onclick="openNewActivityModal()" id="headerCreateBtn">
    ➕ Nueva Actividad
</button>
```

**Función dedicada (agenda.html líneas 1631-1644):**
```javascript
function openNewActivityModal() {
    console.log('Opening new activity modal from header button');
    // Limpiar y resetear el formulario
    clearCreateTimeSelectors();
    document.getElementById('createActivityForm').reset();
    // No pre-seleccionar ningún recurso
    document.getElementById('createRecursoDisplay').value = '';
    document.getElementById('createRecurso').value = '';
    // Establecer fecha actual por defecto
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('createFechaInicio').value = today;
    // Cargar datos de apoyo y mostrar modal
    loadCreateModalData();
}
```

**Estilo CSS:**
```css
.btn-success {
    background-color: #10b981;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.btn-success:hover {
    background-color: #059669;
}
```

**Flujo de usuario mejorado:**
1. Usuario accede a vista agenda
2. Ve botón prominente "➕ Nueva Actividad" en header
3. Click abre modal con formulario limpio
4. Puede seleccionar cualquier recurso disponible
5. Resto del flujo igual a creación normal

### 11. Actualización Automática de Contenido en Vista Agenda ⭐ **IMPLEMENTADO**

**Especificación:** El sistema actualiza automáticamente el contenido de la vista agenda después de cualquier operación de guardado (crear, editar o eliminar actividades), eliminando la necesidad de refrescar manualmente la página.

**Características principales:**
- **Auto-refresh después de guardar**: Todas las operaciones CRUD activan automáticamente una actualización del contenido
- **Consistencia visual**: Los cambios se reflejan inmediatamente sin pérdida de contexto
- **Feedback claro**: Mensajes informativos sobre el estado del refresh
- **Manejo robusto de errores**: Fallbacks y avisos en caso de fallos de actualización

**Implementación técnica:**

**Auto-refresh para edición de actividades (agenda.html líneas 2307-2317):**
```javascript
onSuccess: async (result) => {
    console.log('✅ Activity updated successfully on server:', result);
    showAlert('✅ Actividad actualizada y guardada correctamente', 'success');

    // Refrescar datos automáticamente para asegurar sincronización
    try {
        console.log('🔄 Refrescando vista automáticamente...');
        const actividades = await fetch(`${API_BASE}/actividades`).then(r => r.json());
        allActivities = actividades;
        await aplicarFiltros();
        console.log('✅ Vista actualizada automáticamente');
    } catch (refreshError) {
        console.error('⚠️ Error al refrescar vista automáticamente:', refreshError);
        showAlert('⚠️ Los cambios se guardaron pero no se pudo actualizar la vista automáticamente. Recarga la página para ver los cambios.', 'warning');
    }
}
```

**Auto-refresh para creación de actividades (agenda.html líneas 3063-3080):**
```javascript
onSuccess: async (result) => {
    console.log('✅ Activity created successfully on server:', result);
    showAlert('✅ Actividad creada y guardada correctamente', 'success');

    // Refrescar datos automáticamente después de crear
    try {
        console.log('🔄 Refrescando vista automáticamente después de crear actividad...');
        const actividades = await fetch(`${API_BASE}/actividades`).then(r => r.json());
        allActivities = actividades;
        await aplicarFiltros();
        console.log('✅ Vista actualizada automáticamente');
    } catch (refreshError) {
        console.error('⚠️ Error al refrescar vista automáticamente:', refreshError);
        // Fallback con manejo doble de errores
        try {
            await loadData();
            await aplicarFiltros();
        } catch (fallbackError) {
            showAlert('⚠️ La actividad se guardó pero no se pudo actualizar la vista automáticamente. Recarga la página para ver los cambios.', 'warning');
        }
    }
}
```

**Auto-refresh para eliminación de actividades (agenda.html líneas 2408-2425):**
```javascript
onSuccess: async (result) => {
    console.log('✅ Activity deleted successfully on server:', result);
    showAlert('✅ Actividad eliminada correctamente', 'success');

    // Refrescar datos automáticamente después de eliminar
    try {
        console.log('🔄 Refrescando vista automáticamente después de eliminar actividad...');
        const actividades = await fetch(`${API_BASE}/actividades`).then(r => r.json());
        allActivities = actividades;
        await aplicarFiltros();
        console.log('✅ Vista actualizada automáticamente');
    } catch (refreshError) {
        console.error('⚠️ Error al refrescar vista automáticamente:', refreshError);
        // Fallback con manejo robusto
        try {
            await loadData();
            await aplicarFiltros();
        } catch (fallbackError) {
            showAlert('⚠️ La actividad se eliminó pero no se pudo actualizar la vista automáticamente. Recarga la página para ver los cambios.', 'warning');
        }
    }
}
```

**Características del sistema de refresh:**
- **Método consistente**: Todas las operaciones usan `aplicarFiltros()` para actualización uniforme
- **Logging detallado**: Mensajes claros en consola para debugging
- **Doble fallback**: Intento con `loadData()` si falla el refresh directo
- **Feedback de usuario**: Alertas informativas sobre éxito o advertencias
- **No interruptivo**: Mantiene filtros y estado de visualización activos

**Flujo de actualización:**
1. ✅ **Actualización optimista**: UI se actualiza inmediatamente con cambios esperados
2. ✅ **Operación en servidor**: Request se envía en background
3. ✅ **Confirmación y refresh**: Al confirmar éxito, se recargan datos frescos del servidor
4. ✅ **Actualización visual**: Vista se re-renderiza con datos actualizados
5. ✅ **Manejo de errores**: Si falla, usuario recibe feedback claro

### 12. Resumen de Archivos Afectados por Mejoras Recientes ⭐ **IMPLEMENTADO**

**Archivos modificados en las últimas mejoras:**

**Backend:**
- ✅ `backend/server-sql-final.js` - PUT endpoint para tipos de actividad, columna color

**Frontend principal:**
- ✅ `frontend/agenda.html` - Header button, alertas persistentes, spinner, auto-minutos
- ✅ `frontend/nueva-actividad.html` - Auto-selección de minutos en hora fin
- ✅ `frontend/configuracion.html` - Enlace a gestión de tipos, estadísticas
- ✅ `frontend/demo.html` - Reorganización del dashboard

**Nuevas páginas:**
- ✅ `frontend/tipos-actividad.html` - Gestión completa de tipos con colores

**Base de datos:**
- ✅ Alteración de tabla `tipos_actividad` - Agregada columna `color NVARCHAR(7)`
- ✅ Datos iniciales - Colores por defecto para tipos existentes

### 13. Mejoras Visuales y UX en Vista Agenda ⭐ **IMPLEMENTADO** (v1.5)

**Especificación:** Conjunto de mejoras visuales enfocadas en la experiencia de usuario y presentación de actividades en la vista agenda, incluyendo comportamiento de actividades abiertas, centrado de contenido y formato de fechas.

**Características implementadas:**

**Gestión visual de actividades abiertas (fecha_fin = 2099-12-31):**
- ✅ **Detección automática**: Reconocimiento de actividades con fecha fin 2099-12-31
- ✅ **Indicación visual clara**: Texto "abierta" en lugar de información de tiempo confusa
- ✅ **Manejo multi-día**: Para actividades que se extienden varios días, muestra formato "fecha_inicio → abierta"
- ✅ **Solo cambio visual**: No afecta datos en base de datos, solo visualización

**Centrado de contenido en bloques de actividad:**
- ✅ **Alineación horizontal**: Todo el texto (obra, actividad, fechas) se centra horizontalmente
- ✅ **Alineación vertical**: Contenido centrado verticalmente usando flexbox
- ✅ **Consistencia visual**: Aplicado a todos los elementos (.activity-title, .activity-time, .activity-obra)

**Eliminación de bordes en bloques:**
- ✅ **Sin bordes visuales**: Removidos todos los bordes (sólidos y discontinuos) de actividades
- ✅ **Limpieza visual**: Solo mantiene color de fondo, esquinas redondeadas y sombra
- ✅ **Actividades multi-día**: Bordes dashed eliminados para presentación más limpia

**Formato de fechas español (dd/mm/aaaa):**
- ✅ **Función formatDate**: Conversión automática de formato ISO a español
- ✅ **Aplicación universal**: Todas las fechas en bloques usan formato dd/mm/aaaa
- ✅ **Consistencia regional**: Adaptado a convenciones españolas

**Implementación técnica:**

**Detección de actividades abiertas (agenda.html líneas 1946-1985):**
```javascript
// Si la fecha fin es 2099-12-31, mostrar "abierta"
if (activity.fechaFin === '2099-12-31') {
    if (isMultiDay) {
        if (isStartDay) {
            time.textContent = `${formatTime(activity.horaInicio)} → abierta`;
        } else if (isEndDay) {
            time.textContent = `(${formatDate(activityStartDate)}) → abierta`;
        } else if (isMiddleDay) {
            time.textContent = `(${formatDate(activityStartDate)} → abierta)`;
        }
    } else {
        time.textContent = 'abierta';
    }
}
```

**Centrado de contenido (agenda.html líneas 505-525):**
```css
.activity-title {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
}

.activity-time {
    font-size: 0.625rem;
    opacity: 0.9;
    text-align: center;
}

.activity-obra {
    font-size: 0.75rem;
    opacity: 0.9;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
    text-align: center;
}
```

**Formato de fechas (agenda.html líneas 1945-1953):**
```javascript
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};
```

**Ejemplos de visualización mejorada:**
- **Actividad abierta simple**: "abierta"
- **Actividad abierta multi-día (día inicio)**: "18:00 → abierta"
- **Actividad abierta multi-día (día intermedio)**: "(28/10/2025 → abierta)"
- **Actividad normal multi-día**: "(28/10/2025 → 30/10/2025)"

**Archivos modificados:**
- ✅ `frontend/agenda.html` - Mejoras visuales, formato de fechas, centrado de contenido

### 14. Optimizaciones de Rendimiento y Estabilidad ⭐ **IMPLEMENTADO**

**Edición de actividades optimizada:**
- ✅ **Actualización automática post-guardado**: Refresh inteligente sin pérdida de contexto
- ✅ **Actualización local optimista**: UI responde inmediatamente mientras procesa en background
- ✅ **Indicadores de carga**: Feedback visual durante operaciones largas
- ✅ **Protección contra múltiples clics**: Prevención de operaciones concurrentes

**Navegación eficiente en vista agenda:**
- ✅ **Re-renderizado inteligente**: Solo actualiza elementos necesarios
- ✅ **Preservación de filtros**: Mantiene estado de visualización después de refresh
- ✅ **Cache de datos**: Navegación rápida entre días sin recargas innecesarias
- ✅ **Debugging detallado**: Console logs para resolución de problemas

**Corrección de bugs críticos (versión 1.4):**
- ✅ **Middleware de logging**: Solucionado problema de readBody() duplicado que causaba timeouts de 2+ minutos
- ✅ **Manejo de NULL en SQL**: Corrección en formato de fechas y valores nulos
- ✅ **Nomenclatura de columnas**: Consistencia entre camelCase y snake_case en consultas
- ✅ **Actualización parcial**: Soporte completo para updates incrementales de actividades

**Archivos afectados por mejoras recientes:**
- ✅ `frontend/agenda.html` - Auto-refresh, soporte multi-día, anti-solapamiento, navegación optimizada
- ✅ `backend/server-sql-final.js` - Corrección middleware logging, manejo robusto de request body
- ✅ `frontend/actividades.html` - Sistema toast, optimización de edición
- ✅ `frontend/nueva-actividad.html` - Placeholder MM en selectores de minutos
- ✅ `frontend/demo.html` - Reorganización del dashboard con jerarquía mejorada

### 2. Funcionalidad de Teclado (ESC Key) ⭐ **IMPLEMENTADO**

**Especificación:** Todas las ventanas modales del sistema deben responder a la tecla ESC para cerrarlas, proporcionando una experiencia de usuario intuitiva y accesible.

**Comportamiento:**
- Al presionar la tecla **Escape (ESC)**, cualquier modal abierto debe cerrarse inmediatamente
- La funcionalidad debe verificar que el modal esté efectivamente abierto antes de cerrarlo
- No debe interferir con otros elementos de la interfaz

**Implementación técnica:**
```javascript
// Cerrar modal con tecla ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
        const modal = document.getElementById('modalId');
        if (modal.style.display === 'block') {
            closeModal();
        }
    }
});
```

**Patrones de verificación de estado de modal:**
- **Estilo CSS**: `modal.style.display === 'block'`
- **Clase CSS**: `modal.classList.contains('active')`

**Archivos implementados:**
- ✅ `frontend/obras.html` - Modal de gestión de obras
- ✅ `frontend/equipos.html` - Modal de gestión de equipos
- ✅ `frontend/tipos-actividad.html` - Modal de gestión de tipos de actividad
- ✅ `frontend/usuarios.html` - Modal de gestión de usuarios
- ✅ `frontend/actividades.html` - Modales de edición y duplicación de actividades
- ✅ `frontend/nueva-actividad.html` - No aplica (sin modales)

**Requerimiento para futuras ampliaciones:**
- **Obligatorio**: Toda nueva ventana modal debe implementar la funcionalidad ESC key
- **Estándar**: Usar uno de los patrones de verificación de estado establecidos
- **Prueba**: Verificar que ESC solo cierre el modal cuando esté abierto

### 3. Validaciones de Fechas y Horas

**Reglas:**
- Las fechas de inicio pueden ser futuras (planificación de actividades)
- Las fechas de fin deben ser posteriores a las de inicio
- Las horas deben cumplir el formato HH:MM con minutos restringidos (00, 15, 30, 45)

### 4. Campos Obligatorios

**Para crear/editar actividades:**
- Obra (obraId) - obligatorio
- Recurso (recursoId) - obligatorio
- Tipo de Actividad (tipoActividadId) - obligatorio
- Fecha de Inicio - obligatorio
- Hora de Inicio - obligatorio

**Campos opcionales:**
- Fecha de Fin
- Hora de Fin
- Observaciones
- Coordenadas GPS (funcionalidad futura)

## Estructura de la Base de Datos

### Tablas Principales

1. **Obras** - Proyectos de construcción
2. **Recursos** - Operarios y maquinaria
3. **TiposActividad** - Tipos de trabajo (Transporte, Extendido, etc.)
4. **Actividades** - Registro principal de actividades laborales
5. **Usuarios** - Usuarios del sistema

### Relaciones
- Actividades → Obras (Many-to-One)
- Actividades → Recursos (Many-to-One)
- Actividades → TiposActividad (Many-to-One)
- Actividades → Usuarios (Many-to-One, usuario creación)

## API Endpoints

### Actividades
- `GET /actividades` - Listar todas las actividades
- `POST /actividades` - Crear nueva actividad
- `PUT /actividades/:id` - Actualizar actividad existente

### Datos de Apoyo
- `GET /obras` - Listar obras activas
- `GET /recursos` - Listar recursos activos
- `GET /tipos-actividad` - Listar tipos de actividad
- `PUT /tipos-actividad/:id` - Actualizar tipo de actividad existente

### Monitoreo
- `GET /` - Estado del servidor
- `GET /health` - Test de conectividad
- `GET /config` - Configuración del sistema

## Patrones de Desarrollo

### Frontend
- **Sin frameworks:** JavaScript vanilla para máxima compatibilidad
- **Responsive design:** Adaptable a dispositivos móviles
- **Progressive enhancement:** Funcionalidad básica sin JavaScript
- **Accesibilidad:** Etiquetas semánticas y navegación por teclado

### Backend
- **Sin dependencias npm:** Solo módulos nativos de Node.js
- **Gestión manual de SQL:** Uso de CLI `mssql` para evitar dependencias
- **CORS habilitado:** Soporte para desarrollo cross-origin
- **Manejo de errores:** Respuestas HTTP estándar y logging

### Base de Datos
- **Nomenclatura consistente:** PascalCase para tablas y columnas
- **Claves primarias:** IDENTITY(1,1) para IDs autoincrementales
- **Auditoría:** Campos de creación y modificación en todas las tablas
- **Integridad referencial:** Foreign keys con CASCADE/SET NULL según corresponda

## Funcionalidades Futuras

### GPS y Geolocalización
- Captura automática de coordenadas al iniciar/finalizar actividades
- Cálculo de kilómetros recorridos
- Visualización en mapa de rutas

### Sincronización con Sistemas Externos
- Integración con ERP empresarial
- Exportación de datos para nómina
- Webhooks para notificaciones en tiempo real

### Reportes y Analytics
- Dashboard con métricas de productividad
- Exportación a Excel/PDF
- Análisis de tiempos por tipo de actividad

## Convenciones de Código

### HTML
- Uso de etiquetas semánticas
- Atributos de accesibilidad (aria-label, role)
- Estructura modular con secciones claramente definidas

### CSS
- Metodología BEM para naming
- CSS variables para temas y colores
- Mobile-first responsive design

### JavaScript
- Funciones puras cuando sea posible
- Event delegation para elementos dinámicos
- Manejo de errores con try/catch
- Async/await para operaciones asíncronas

### SQL
- Nomenclatura PascalCase
- Comentarios para lógica compleja
- Índices para campos de búsqueda frecuente
- Stored procedures para lógica de negocio compleja

## Seguridad

### Autenticación
- Sistema básico de usuarios implementado
- Roles de usuario (administrador, operario)
- Sesiones del lado del servidor

### Validación de Datos
- Validación en frontend y backend
- Sanitización de entradas SQL
- Verificación de tipos de datos

### Conexión a Base de Datos
- Usuario dedicado con permisos mínimos necesarios
- Conexión cifrada cuando sea posible
- Timeout de conexión configurado

---

## Registro de Cambios Recientes

### Versión 1.6.1 (2025-10-02)
- ✅ **Corrección crítica de sintaxis JavaScript** - Eliminado uso incorrecto de template literals en actividades.html y agenda.html
- ✅ **Corrección de configuración API_BASE** - Uso correcto de paréntesis para agrupación en lugar de template literals inválidos
- ✅ **Verificación de conexión SQL** - Confirmada conexión exitosa con backend en puerto 3002
- ✅ **Solución de carga de datos** - Actividades y agenda ahora cargan correctamente las 36 actividades desde SQL Server

### Versión 1.4 (2025-09-29)
- ✅ **Actualización automática en vista agenda** - Auto-refresh completo después de crear, editar o eliminar actividades
- ✅ **Corrección de bugs críticos de rendimiento** - Solucionado problema de timeout de 2+ minutos en edición de actividades
- ✅ **Mejoras en middleware de logging** - Eliminación de readBody() duplicado y manejo robusto de request body
- ✅ **Manejo mejorado de NULL en SQL** - Corrección en formato de fechas y valores nulos
- ✅ **Consistencia en nomenclatura de columnas** - Armonización entre camelCase y snake_case
- ✅ **Fallbacks y error handling** - Sistema robusto de recuperación con feedback claro al usuario

### Versión 1.3 (2025-09-26)
- ✅ **Gestión de tipos de actividad con colores personalizados** - Sistema CRUD completo con frontend dedicado
- ✅ **Mejoras de UX** - Alertas persistentes, spinners de carga, auto-selección de minutos
- ✅ **Botón de creación en header de agenda** - Acceso rápido a creación de actividades sin preselección
- ✅ **Actualización de base de datos** - Columna color en tipos_actividad con valores por defecto
- ✅ **Endpoint PUT /tipos-actividad/:id** - API para actualización de tipos de actividad

### Próximas Funcionalidades Planificadas
- 🔄 **Gestión de Obras** - CRUD completo similar a tipos de actividad
- 🔄 **Gestión de Recursos** - Administración de operarios y maquinaria
- 🔄 **Sistema de usuarios y permisos** - Roles y autenticación avanzada
- 🔄 **Configuración de tiempo y notificaciones** - Opciones del sistema

---

**Nota:** Este documento se actualiza con cada iteración del sistema. Las funcionalidades marcadas con ⭐ **IMPLEMENTADO** están completamente funcionales y probadas.