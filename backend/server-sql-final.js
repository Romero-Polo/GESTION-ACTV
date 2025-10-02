// Servidor Node.js con conexión real a SQL Server usando mssql CLI
const http = require('http');
const url = require('url');
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = util.promisify(exec);

// Cargar configuración desde config.json
let dbConfig = {
    host: '192.168.0.30',
    port: 1433,
    username: 'rp-gestorjornadas',
    password: 'KBNYERNCK8EKK7389RXB7CEQZTF39GCT.',
    database: 'RP_GESTOR_JORNADAS'
};

try {
    const configPath = path.resolve(__dirname, '../config.json');
    if (fs.existsSync(configPath)) {
        const configFile = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const env = configFile.current_environment || 'development';
        if (configFile[env] && configFile[env].database) {
            dbConfig = configFile[env].database;
            console.log(`📋 Configuración de base de datos cargada desde config.json (${env})`);
        }
    }
} catch (error) {
    console.log('⚠️  No se pudo cargar config.json, usando valores por defecto');
}

// Sistema sin datos de respaldo - solo SQL Server

let dbConnected = false;

// Utilidades
function parseJSON(str) {
    try {
        return JSON.parse(str);
    } catch {
        return null;
    }
}

function sendJSON(res, data, status = 200) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    const responseData = JSON.stringify(data);

    // Store for logging
    res._statusCode = status;
    res._responseBody = responseData;

    res.end(responseData);
}

function sendError(res, message, status = 500) {
    sendJSON(res, { error: message, timestamp: new Date().toISOString() }, status);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            const data = parseJSON(body);
            if (data === null && body.length > 0) {
                reject(new Error('Invalid JSON'));
            } else {
                resolve(data || {});
            }
        });
        req.on('error', reject);
    });
}

// Funciones de logging
async function isDebugModeEnabled() {
    try {
        const result = await executeSQL("SELECT config_value FROM configuration WHERE config_key = 'debug_mode'");
        return result.length > 0 && result[0].config_value === 'true';
    } catch (error) {
        console.error('❌ Error checking debug mode:', error.message);
        return false;
    }
}

async function logApiCall(method, endpoint, statusCode, responseTimeMs, requestBody = null, responseBody = null, userAgent = null, ipAddress = null, errorMessage = null) {
    try {
        const debugEnabled = await isDebugModeEnabled();
        if (!debugEnabled) {
            return;
        }

        // Truncate large bodies to avoid command line length issues
        const MAX_REQUEST_BODY_LENGTH = 500; // Longer limit for request payloads
        const MAX_RESPONSE_BODY_LENGTH = 100; // Keep response bodies short
        const MAX_USER_AGENT_LENGTH = 50;

        // Safe truncation function that avoids breaking JSON or leaving unterminated strings
        const safeTruncate = (text, maxLength) => {
            if (!text || text.length <= maxLength) return text;

            // For very long JSON, provide minimal but valid JSON
            if ((text.startsWith('[') || text.startsWith('{')) && text.length > maxLength) {
                if (text.startsWith('[')) {
                    return '["TRUNCATED"]'; // Valid JSON array indicating truncation
                } else {
                    return '{"truncated":true}'; // Valid JSON object indicating truncation
                }
            }

            let truncated = text.substring(0, maxLength);
            // Ensure we don't end in the middle of an escaped character or quote
            if (truncated.endsWith('\\') || truncated.endsWith('"')) {
                truncated = truncated.substring(0, maxLength - 1);
            }
            return truncated + '...';
        };

        const truncatedRequestBody = requestBody ? safeTruncate(requestBody, MAX_REQUEST_BODY_LENGTH) : null;
        const truncatedResponseBody = responseBody ? safeTruncate(responseBody, MAX_RESPONSE_BODY_LENGTH) : null;
        const truncatedUserAgent = userAgent ? safeTruncate(userAgent, MAX_USER_AGENT_LENGTH) : null;

        const escapedRequestBody = truncatedRequestBody ? truncatedRequestBody.replace(/'/g, "''") : null;
        const escapedResponseBody = truncatedResponseBody ? truncatedResponseBody.replace(/'/g, "''") : null;
        const escapedUserAgent = truncatedUserAgent ? truncatedUserAgent.replace(/'/g, "''") : null;
        const escapedErrorMessage = errorMessage ? errorMessage.replace(/'/g, "''") : null;
        const escapedEndpoint = endpoint.replace(/'/g, "''");

        const sql = `INSERT INTO api_logs (method, endpoint, status_code, response_time_ms, request_body, response_body, user_agent, ip_address, error_message) VALUES ('${method}', '${escapedEndpoint}', ${statusCode}, ${responseTimeMs}, ${escapedRequestBody ? `'${escapedRequestBody}'` : 'NULL'}, ${escapedResponseBody ? `'${escapedResponseBody}'` : 'NULL'}, ${escapedUserAgent ? `'${escapedUserAgent}'` : 'NULL'}, ${ipAddress ? `'${ipAddress}'` : 'NULL'}, ${escapedErrorMessage ? `'${escapedErrorMessage}'` : 'NULL'})`;

        await executeSQL(sql);
    } catch (error) {
        console.error('❌ Error logging API call:', error.message);
    }
}

// Ejecutar consulta SQL usando mssql CLI
async function executeSQL(query) {
    try {
        console.log('🔍 Ejecutando SQL:', query.substring(0, 80) + '...');

        // Usar single quotes para evitar interpretación de shell de las comillas simples dentro del SQL
        const escapedQuery = query.replace(/'/g, "''"); // Escapar comillas simples para SQL Server
        // Usar powershell para ejecutar el comando y evitar problemas con caracteres especiales
        const command = `powershell -Command "mssql -s ${dbConfig.host} -u ${dbConfig.username} -p '${dbConfig.password}' -d ${dbConfig.database} -q '${escapedQuery}'"`;

        const { stdout, stderr } = await execAsync(command, { timeout: 30000 });

        if (stderr && stderr.includes('Error')) {
            throw new Error(stderr);
        }

        // Procesar resultado para mssql CLI
        const lines = stdout.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
            return [];
        }

        // Buscar línea con "row(s) returned" o "row(s) affected"
        const returnedMatch = stdout.match(/(\d+) row\(s\) returned/);
        const affectedMatch = stdout.match(/(\d+) row\(s\) affected/);

        if (affectedMatch) {
            return { affectedRows: parseInt(affectedMatch[1]) };
        }

        if (!returnedMatch) {
            return [];
        }

        // Encontrar donde empiezan los datos (después de la línea de separación ---)
        let dataStartIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('--')) {
                dataStartIndex = i + 1;
                break;
            }
        }

        if (dataStartIndex === -1 || dataStartIndex >= lines.length) {
            return [];
        }

        // Obtener headers
        const headerLine = dataStartIndex - 2 >= 0 ? lines[dataStartIndex - 2] : '';
        if (!headerLine) return [];

        const headers = headerLine.split(/\s{2,}/).map(h => h.trim()).filter(h => h);

        // Procesar datos
        const data = [];
        for (let i = dataStartIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.includes('row(s)') && !line.includes('Executed in')) {
                const values = line.split(/\s{2,}/).map(v => v.trim());

                if (values.length >= headers.length) {
                    const row = {};
                    headers.forEach((header, index) => {
                        const value = values[index];
                        // Intentar convertir números
                        if (value && !isNaN(value) && value !== '') {
                            row[header] = Number(value);
                        } else {
                            row[header] = value || null;
                        }
                    });
                    data.push(row);
                }
            }
        }

        return data;
    } catch (error) {
        console.error('❌ Error SQL:', error.message);
        dbConnected = false;
        throw new Error(`Database error: ${error.message}`);
    }
}

function validateTimeFormat(time) {
    const validMinutes = ['00', '15', '30', '45'];
    const timePattern = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;

    if (!timePattern.test(time)) {
        return false;
    }

    const minutes = time.split(':')[1];
    return validMinutes.includes(minutes);
}

// Función para convertir tiempo a minutos desde medianoche
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// Función para convertir minutos a formato HH:MM
function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Función para verificar y ajustar solapamientos de actividades
async function checkAndAdjustOverlaps(newActivity, activityId = null) {
    console.log('🔍 Verificando solapamientos para actividad:', {
        recursoId: newActivity.recursoId,
        fechaInicio: newActivity.fechaInicio,
        horaInicio: newActivity.horaInicio,
        horaFin: newActivity.horaFin,
        activityId
    });

    // Validar datos de entrada
    if (!newActivity.recursoId || !newActivity.fechaInicio || !newActivity.horaInicio) {
        console.log('⚠️ Datos insuficientes para verificar solapamientos');
        return newActivity;
    }

    try {
        // Obtener actividades existentes del mismo recurso en la misma fecha
        let query = `SELECT id, hora_inicio, hora_fin FROM actividades WHERE recurso_id = ${newActivity.recursoId} AND fecha_inicio = '${newActivity.fechaInicio}'`;

        // Si es una actualización, excluir la actividad actual
        if (activityId) {
            query += ` AND id != ${activityId}`;
        }

        query += ` ORDER BY hora_inicio`;

        console.log('🔍 Ejecutando query de solapamiento:', query);
        const existingActivities = await executeSQL(query);
        console.log('📋 Actividades existentes encontradas:', existingActivities.length);

        if (existingActivities.length === 0) {
            console.log('✅ No hay conflictos de solapamiento');
            return newActivity; // No hay conflictos
        }

        const newStartMinutes = timeToMinutes(newActivity.horaInicio);
        let newEndMinutes = newActivity.horaFin ? timeToMinutes(newActivity.horaFin) : newStartMinutes + 60; // Default 1 hora

        // Ordenar actividades por hora de inicio
        const sortedActivities = existingActivities.map(act => ({
            ...act,
            startMinutes: timeToMinutes(act.hora_inicio),
            endMinutes: act.hora_fin ? timeToMinutes(act.hora_fin) : timeToMinutes(act.hora_inicio) + 60
        })).sort((a, b) => a.startMinutes - b.startMinutes);

        // Encontrar el lugar apropiado para insertar la nueva actividad
        let adjustedStartMinutes = newStartMinutes;
        let adjustedEndMinutes = newEndMinutes;
        let hasOverlap = false;

        // Verificar solapamiento con actividades anteriores
        for (const existing of sortedActivities) {
            if (existing.startMinutes < adjustedEndMinutes && existing.endMinutes > adjustedStartMinutes) {
                hasOverlap = true;

                // Si la nueva actividad empieza antes, ajustar para que termine cuando empiece la existente
                if (adjustedStartMinutes < existing.startMinutes) {
                    adjustedEndMinutes = existing.startMinutes;
                } else {
                    // Si la nueva actividad empieza después, moverla para que empiece cuando termine la existente
                    const duration = adjustedEndMinutes - adjustedStartMinutes;
                    adjustedStartMinutes = existing.endMinutes;
                    adjustedEndMinutes = adjustedStartMinutes + duration;
                }
            }
        }

        // Validar que los tiempos ajustados sigan siendo válidos (intervalos de 15 min)
        adjustedStartMinutes = Math.ceil(adjustedStartMinutes / 15) * 15; // Redondear hacia arriba a múltiplo de 15
        adjustedEndMinutes = Math.ceil(adjustedEndMinutes / 15) * 15;

        // Crear actividad ajustada
        const adjustedActivity = {
            ...newActivity,
            horaInicio: minutesToTime(adjustedStartMinutes),
            horaFin: newActivity.horaFin ? minutesToTime(adjustedEndMinutes) : null
        };

        // Si hubo ajustes, registrar en logs
        if (hasOverlap) {
            console.log(`⚠️ Solapamiento detectado - Actividad ajustada:
                Original: ${newActivity.horaInicio} - ${newActivity.horaFin || 'Sin fin'}
                Ajustada: ${adjustedActivity.horaInicio} - ${adjustedActivity.horaFin || 'Sin fin'}
                Recurso: ${newActivity.recursoId}, Fecha: ${newActivity.fechaInicio}`);
        }

        return adjustedActivity;

    } catch (error) {
        console.error('Error checking overlaps:', error);
        return newActivity; // En caso de error, devolver original
    }
}

// Endpoints

async function handleRoot(req, res) {
    try {
        await executeSQL('SELECT COUNT(*) as total FROM usuarios');
        dbConnected = true;

        sendJSON(res, {
            message: 'Backend API funcionando - Conectado a SQL Server Real',
            version: '2.1.0',
            timestamp: new Date().toISOString(),
            database: {
                host: '192.168.0.30',
                database: 'RP_GESTOR_JORNADAS',
                user: 'rp-gestorjornadas',
                status: 'Conectado a SQL Server Real ✅'
            }
        });
    } catch (error) {
        sendJSON(res, {
            message: 'Backend API funcionando - Fallback a Mock Data',
            version: '2.1.0',
            timestamp: new Date().toISOString(),
            database: {
                host: '192.168.0.30',
                database: 'RP_GESTOR_JORNADAS',
                user: 'rp-gestorjornadas',
                status: 'Mock Data (Error conexión SQL Server) ⚠️',
                error: error.message
            }
        });
    }
}

async function handleHealth(req, res) {
    try {
        const result = await executeSQL('SELECT COUNT(*) as count FROM usuarios');
        dbConnected = true;

        sendJSON(res, {
            status: 'OK',
            database: 'SQL Server Connected ✅',
            usuarios_count: result[0]?.count || 0,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        sendJSON(res, {
            status: 'OK',
            database: 'Mock Data (SQL Server Error) ⚠️',
            usuarios_count: 1,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

async function handleGetTiposActividad(req, res) {
    try {
        const result = await executeSQL('SELECT id, codigo, nombre, descripcion, color FROM tipos_actividad ORDER BY codigo');
        sendJSON(res, result);
    } catch (error) {
        console.error('❌ Error al obtener tipos de actividad:', error.message);
        sendError(res, 'Error al conectar con la base de datos. Verifica que SQL Server esté ejecutándose.', 503);
    }
}

async function handleCreateTipoActividad(req, res) {
    try {
        const data = await readBody(req);

        // Validaciones básicas
        if (!data.codigo || !data.nombre || !data.color) {
            return sendError(res, 'Campos obligatorios faltantes: codigo, nombre, color', 400);
        }

        // Validar formato de color
        if (!/^#[0-9A-F]{6}$/i.test(data.color)) {
            return sendError(res, 'Color debe estar en formato hexadecimal #RRGGBB', 400);
        }

        // Construir la consulta INSERT
        let fields = ['codigo', 'nombre', 'color'];
        let values = [`'${data.codigo.toUpperCase()}'`, `'${data.nombre.replace(/'/g, "''")}'`, `'${data.color}'`];

        if (data.descripcion) {
            fields.push('descripcion');
            values.push(`'${data.descripcion.replace(/'/g, "''")}'`);
        }

        const insertSQL = `INSERT INTO tipos_actividad (${fields.join(', ')}) VALUES (${values.join(', ')})`;

        try {
            const result = await executeSQL(insertSQL);

            console.log('💾 Tipo de actividad creado:', {
                codigo: data.codigo,
                nombre: data.nombre,
                color: data.color
            });

            sendJSON(res, {
                message: '✅ Tipo de actividad creado exitosamente',
                tipoActividad: data,
                database: 'SQL Server Real'
            }, 201);

        } catch (sqlError) {
            console.error('❌ Error creando tipo de actividad:', sqlError.message);
            if (sqlError.message.includes('UNIQUE') || sqlError.message.includes('duplicate')) {
                sendError(res, 'Ya existe un tipo de actividad con ese código', 400);
            } else {
                sendError(res, `Error creando en base de datos: ${sqlError.message}`, 500);
            }
        }

    } catch (error) {
        sendError(res, `Error processing request: ${error.message}`, 400);
    }
}

async function handleUpdateTipoActividad(req, res, id) {
    try {
        const data = await readBody(req);

        // Validaciones básicas
        if (!data.codigo || !data.nombre || !data.color) {
            return sendError(res, 'Campos obligatorios faltantes: codigo, nombre, color', 400);
        }

        // Validar formato de color
        if (!/^#[0-9A-F]{6}$/i.test(data.color)) {
            return sendError(res, 'Color debe estar en formato hexadecimal #RRGGBB', 400);
        }

        // Verificar que el tipo existe
        const existingTipo = await executeSQL(`SELECT id FROM tipos_actividad WHERE id = ${id}`);
        if (existingTipo.length === 0) {
            return sendError(res, `Tipo de actividad no encontrado con ID: ${id}`, 404);
        }

        // Construir la consulta UPDATE
        let updateFields = [
            `codigo = '${data.codigo.toUpperCase()}'`,
            `nombre = '${data.nombre.replace(/'/g, "''")}'`,
            `color = '${data.color}'`
        ];

        if (data.descripcion !== undefined) {
            if (data.descripcion) {
                updateFields.push(`descripcion = '${data.descripcion.replace(/'/g, "''")}'`);
            } else {
                updateFields.push(`descripcion = NULL`);
            }
        }

        const updateSQL = `UPDATE tipos_actividad SET ${updateFields.join(', ')} WHERE id = ${id}`;

        try {
            const result = await executeSQL(updateSQL);

            console.log('✏️ Tipo de actividad actualizado:', {
                id: id,
                codigo: data.codigo,
                nombre: data.nombre,
                color: data.color
            });

            sendJSON(res, {
                message: '✅ Tipo de actividad actualizado exitosamente',
                tipoActividad: { id: parseInt(id), ...data },
                database: 'SQL Server Real'
            });

        } catch (sqlError) {
            console.error('❌ Error actualizando tipo de actividad:', sqlError.message);
            if (sqlError.message.includes('UNIQUE') || sqlError.message.includes('duplicate')) {
                sendError(res, 'Ya existe un tipo de actividad con ese código', 400);
            } else {
                sendError(res, `Error actualizando en base de datos: ${sqlError.message}`, 500);
            }
        }

    } catch (error) {
        sendError(res, `Error processing request: ${error.message}`, 400);
    }
}

async function handleDeleteTipoActividad(req, res, id) {
    try {
        console.log(`🗑️ Eliminando tipo de actividad con ID: ${id}`);

        // Verificar que el tipo existe
        const existingTipo = await executeSQL(`SELECT id, codigo, nombre FROM tipos_actividad WHERE id = ${id}`);
        if (existingTipo.length === 0) {
            return sendError(res, `Tipo de actividad no encontrado con ID: ${id}`, 404);
        }

        // Verificar si hay actividades que usan este tipo
        const activitiesUsingType = await executeSQL(`SELECT COUNT(*) as count FROM actividades WHERE tipo_actividad_id = ${id}`);
        if (activitiesUsingType[0]?.count > 0) {
            return sendError(res, `No se puede eliminar el tipo de actividad porque tiene ${activitiesUsingType[0].count} actividades asociadas`, 400);
        }

        const deleteSQL = `DELETE FROM tipos_actividad WHERE id = ${id}`;
        const result = await executeSQL(deleteSQL);

        console.log(`✅ Tipo de actividad ${id} eliminado exitosamente`);

        sendJSON(res, {
            message: `✅ Tipo de actividad "${existingTipo[0].nombre}" eliminado exitosamente`,
            id: parseInt(id),
            database: 'SQL Server Real'
        });

    } catch (error) {
        console.error(`❌ Error eliminando tipo de actividad ${id}:`, error.message);
        sendError(res, `Error eliminando tipo de actividad: ${error.message}`, 500);
    }
}

async function handleGetObras(req, res) {
    try {
        const result = await executeSQL('SELECT id, codigo, descripcion, activo FROM obras WHERE activo = 1 ORDER BY codigo');
        sendJSON(res, result);
    } catch (error) {
        console.error('❌ Error al obtener obras:', error.message);
        sendError(res, 'Error de conexión: No se pudo conectar con la base de datos. Verifica la configuración de SQL Server.', 503);
    }
}

async function handleCreateObra(req, res) {
    try {
        const body = await readBody(req);
        const data = JSON.parse(body);

        console.log('📝 Creando nueva obra:', data);

        // Validaciones
        if (!data.codigo || !data.descripcion) {
            return sendError(res, 'Código y descripción son obligatorios', 400);
        }

        // Verificar que el código no exista
        const existingObra = await executeSQL(`SELECT id FROM obras WHERE codigo = '${data.codigo.replace(/'/g, "''")}'`);
        if (existingObra.length > 0) {
            return sendError(res, 'Ya existe una obra con ese código', 400);
        }

        const query = `
            INSERT INTO obras (codigo, descripcion, activo)
            VALUES ('${data.codigo.trim().replace(/'/g, "''")}', '${data.descripcion.trim().replace(/'/g, "''")}', 1)
        `;

        const result = await executeSQL(query);

        console.log('✅ Obra creada exitosamente:', result);
        sendJSON(res, {
            success: true,
            id: result.insertId,
            message: 'Obra creada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error al crear obra:', error.message);
        sendError(res, 'Error al crear la obra: ' + error.message, 500);
    }
}

async function handleUpdateObra(req, res, id) {
    try {
        const body = await readBody(req);
        const data = JSON.parse(body);

        console.log(`📝 Actualizando obra ${id}:`, data);

        // Validaciones
        if (!data.codigo || !data.descripcion) {
            return sendError(res, 'Código y descripción son obligatorios', 400);
        }

        // Verificar que la obra existe
        const existingObra = await executeSQL('SELECT id FROM obras WHERE id = ?', [id]);
        if (existingObra.length === 0) {
            return sendError(res, 'Obra no encontrada', 404);
        }

        // Verificar que el código no esté en uso por otra obra
        const duplicateObra = await executeSQL('SELECT id FROM obras WHERE codigo = ? AND id != ?', [data.codigo, id]);
        if (duplicateObra.length > 0) {
            return sendError(res, 'Ya existe otra obra con ese código', 400);
        }

        const query = `
            UPDATE obras
            SET codigo = ?, descripcion = ?
            WHERE id = ?
        `;

        await executeSQL(query, [
            data.codigo.trim(),
            data.descripcion.trim(),
            id
        ]);

        console.log('✅ Obra actualizada exitosamente');
        sendJSON(res, {
            success: true,
            message: 'Obra actualizada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error al actualizar obra:', error.message);
        sendError(res, 'Error al actualizar la obra: ' + error.message, 500);
    }
}

async function handleDeleteObra(req, res, id) {
    try {
        console.log(`🗑️ Eliminando obra ${id}`);

        // Verificar que la obra existe
        const existingObra = await executeSQL('SELECT id FROM obras WHERE id = ?', [id]);
        if (existingObra.length === 0) {
            return sendError(res, 'Obra no encontrada', 404);
        }

        // Verificar si la obra está siendo usada en actividades
        const activitiesCount = await executeSQL('SELECT COUNT(*) as count FROM actividades WHERE obra_id = ?', [id]);
        if (activitiesCount[0].count > 0) {
            return sendError(res, 'No se puede eliminar la obra porque tiene actividades asociadas', 400);
        }

        // Soft delete - marcar como inactivo
        const query = 'UPDATE obras SET activo = 0 WHERE id = ?';
        await executeSQL(query, [id]);

        console.log('✅ Obra eliminada exitosamente');
        sendJSON(res, {
            success: true,
            message: 'Obra eliminada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error al eliminar obra:', error.message);
        sendError(res, 'Error al eliminar la obra: ' + error.message, 500);
    }
}

async function handleGetRecursos(req, res) {
    try {
        const result = await executeSQL('SELECT id, codigo, nombre, tipo, activo, agrCoste, telefono_movil FROM recursos WHERE activo = 1 ORDER BY tipo, codigo');
        sendJSON(res, result);
    } catch (error) {
        console.error('❌ Error al obtener recursos:', error.message);
        sendError(res, 'Error de conexión: No se pudo conectar con la base de datos. Verifica la configuración de SQL Server.', 503);
    }
}

async function handleGetRecursosDisponibles(req, res) {
    const url = new URL(req.url, `http://localhost`);
    const equipoId = url.searchParams.get('equipoId');

    try {
        let query;
        if (equipoId) {
            // Recursos disponibles + recursos del equipo específico (para edición)
            query = `SELECT r.id, r.codigo, r.nombre, r.tipo, r.activo, r.agrCoste, r.telefono_movil FROM recursos r WHERE r.activo = 1 AND (r.id NOT IN (SELECT er.recursoId FROM equipos_recursos er INNER JOIN equipos e ON er.equipoId = e.id WHERE e.activo = 1 AND e.id != ${equipoId}) OR r.id IN (SELECT er.recursoId FROM equipos_recursos er WHERE er.equipoId = ${equipoId})) ORDER BY r.tipo, r.codigo`;
        } else {
            // Solo recursos disponibles (no asignados a ningún equipo)
            query = 'SELECT r.id, r.codigo, r.nombre, r.tipo, r.activo, r.agrCoste, r.telefono_movil FROM recursos r WHERE r.activo = 1 AND r.id NOT IN (SELECT er.recursoId FROM equipos_recursos er INNER JOIN equipos e ON er.equipoId = e.id WHERE e.activo = 1) ORDER BY r.tipo, r.codigo';
        }

        const result = await executeSQL(query);
        sendJSON(res, result);
    } catch (error) {
        console.error('❌ Error al obtener recursos disponibles:', error.message);
        sendError(res, 'Error al conectar con la base de datos. Verifica que SQL Server esté ejecutándose.', 503);
    }
}

async function handleCreateRecurso(req, res) {
    try {
        const data = await readBody(req);
        const { codigo, nombre, tipo, activo = true, agrCoste, telefono_movil } = data;

        if (!codigo || !nombre || !tipo) {
            sendJSON(res, { error: 'Faltan campos obligatorios: codigo, nombre, tipo' }, 400);
            return;
        }

        const sql = `
            INSERT INTO recursos (codigo, nombre, tipo, activo, agrCoste, telefono_movil)
            VALUES ('${codigo}', '${nombre}', '${tipo}', ${activo ? 1 : 0}, '${agrCoste || ''}', '${telefono_movil || ''}')
        `;

        await executeSQL(sql);

        const newRecurso = { codigo, nombre, tipo, activo, agrCoste, telefono_movil };
        console.log('✅ Recurso creado en BD:', newRecurso);
        sendJSON(res, { message: 'Recurso creado exitosamente', recurso: newRecurso });

    } catch (error) {
        console.error('❌ Error al crear recurso:', error.message);
        sendError(res, 'Error al conectar con la base de datos. Verifica que SQL Server esté ejecutándose.', 503);
    }
}

async function handleSeedRecursos(req, res) {
    try {
        console.log('🌱 Iniciando seeding de recursos...');

        // Datos de recursos a insertar
        const recursos = [
            // Operarios
            { codigo: 'OP001', nombre: 'Juan Pérez', tipo: 'operario', agrCoste: 'MANO_OBRA_001' },
            { codigo: 'OP002', nombre: 'María García', tipo: 'operario', agrCoste: 'MANO_OBRA_002' },
            { codigo: 'OP003', nombre: 'Carlos López', tipo: 'operario', agrCoste: 'MANO_OBRA_003' },
            { codigo: 'OP004', nombre: 'Ana Martínez', tipo: 'operario', agrCoste: 'MANO_OBRA_004' },
            { codigo: 'OP005', nombre: 'Pedro Sánchez', tipo: 'operario', agrCoste: 'MANO_OBRA_005' },
            { codigo: 'OP006', nombre: 'Laura Fernández', tipo: 'operario', agrCoste: 'MANO_OBRA_006' },
            { codigo: 'OP007', nombre: 'Miguel Rodríguez', tipo: 'operario', agrCoste: 'MANO_OBRA_007' },
            { codigo: 'OP008', nombre: 'Elena Jiménez', tipo: 'operario', agrCoste: 'MANO_OBRA_008' },
            { codigo: 'OP009', nombre: 'José Morales', tipo: 'operario', agrCoste: 'MANO_OBRA_009' },
            { codigo: 'OP010', nombre: 'Carmen Ruiz', tipo: 'operario', agrCoste: 'MANO_OBRA_010' },
            { codigo: 'OP011', nombre: 'Francisco Torres', tipo: 'operario', agrCoste: 'MANO_OBRA_011' },
            { codigo: 'OP012', nombre: 'Isabel Vargas', tipo: 'operario', agrCoste: 'MANO_OBRA_012' },

            // Máquinas
            { codigo: 'MAQ001', nombre: 'Excavadora CAT 320', tipo: 'maquina', agrCoste: 'MAQUINA_001' },
            { codigo: 'MAQ002', nombre: 'Camión Volquete MAN', tipo: 'maquina', agrCoste: 'MAQUINA_002' },
            { codigo: 'MAQ003', nombre: 'Retroexcavadora JCB 3CX', tipo: 'maquina', agrCoste: 'MAQUINA_003' },
            { codigo: 'MAQ004', nombre: 'Compactadora BOMAG BW213', tipo: 'maquina', agrCoste: 'MAQUINA_004' },
            { codigo: 'MAQ005', nombre: 'Grúa Torre POTAIN MC85', tipo: 'maquina', agrCoste: 'MAQUINA_005' },
            { codigo: 'MAQ006', nombre: 'Hormigonera LIEBHERR', tipo: 'maquina', agrCoste: 'MAQUINA_006' },
            { codigo: 'MAQ007', nombre: 'Bulldozer CAT D6', tipo: 'maquina', agrCoste: 'MAQUINA_007' }
        ];

        let exitosos = 0;
        let errores = 0;

        for (const recurso of recursos) {
            try {
                const sql = `
                    INSERT INTO recursos (codigo, nombre, tipo, activo, agrCoste, telefono_movil)
                    VALUES ('${recurso.codigo}', '${recurso.nombre}', '${recurso.tipo}', 1, '${recurso.agrCoste}', NULL)
                `;

                await executeSQL(sql);
                console.log(`✅ ${recurso.codigo} - ${recurso.nombre} insertado`);
                exitosos++;

            } catch (error) {
                console.log(`❌ Error ${recurso.codigo}: ${error.message}`);
                errores++;
            }
        }

        // Verificar total
        const totalResult = await executeSQL('SELECT COUNT(*) as total FROM recursos WHERE activo = 1');
        const countResult = await executeSQL('SELECT tipo, COUNT(*) as cantidad FROM recursos WHERE activo = 1 GROUP BY tipo');

        console.log('📊 Resumen de seeding:');
        console.log(`✅ Exitosos: ${exitosos}`);
        console.log(`❌ Errores: ${errores}`);
        console.log(`📊 Total en BD: ${totalResult[0]?.total || 0}`);

        sendJSON(res, {
            message: 'Seeding completado',
            exitosos,
            errores,
            total: recursos.length,
            totalEnBD: totalResult[0]?.total || 0,
            detalles: countResult
        });

    } catch (error) {
        console.error('❌ Error durante seeding:', error.message);
        sendJSON(res, { error: 'Error durante seeding: ' + error.message }, 500);
    }
}

async function handleAddMobileFieldMigration(req, res) {
    try {
        console.log('🔧 Iniciando migración: Añadir campo telefono_movil a recursos...');

        // Check if column already exists
        const checkResult = await executeSQL(`
            SELECT COUNT(*) as column_exists
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'recursos'
            AND COLUMN_NAME = 'telefono_movil'
        `);

        if (checkResult[0].column_exists > 0) {
            console.log('⚠️ El campo telefono_movil ya existe en la tabla recursos');
            sendJSON(res, {
                success: true,
                message: 'El campo telefono_movil ya existe en la tabla recursos',
                field_exists: true
            });
            return;
        }

        // Add the column
        await executeSQL(`
            ALTER TABLE recursos
            ADD telefono_movil nvarchar(20) NULL
        `);

        console.log('✅ Campo telefono_movil añadido exitosamente a la tabla recursos');

        // Verify the column was added
        const verifyResult = await executeSQL(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'recursos'
            ORDER BY ORDINAL_POSITION
        `);

        sendJSON(res, {
            success: true,
            message: 'Campo telefono_movil añadido exitosamente',
            field_exists: false,
            table_structure: verifyResult
        });

    } catch (error) {
        console.error('❌ Error durante migración:', error.message);
        sendJSON(res, { error: 'Error durante migración: ' + error.message }, 500);
    }
}

// === FUNCIONES DE MANEJO DE EQUIPOS ===

async function handleGetEquipos(req, res) {
    try {
        // Obtener equipos con sus recursos asociados
        const equipos = await executeSQL('SELECT e.id, e.nombre, e.descripcion, e.activo FROM equipos e WHERE e.activo = 1 ORDER BY e.nombre');

        // Para cada equipo, obtener sus recursos
        for (let equipo of equipos) {
            const recursos = await executeSQL(`SELECT r.id, r.codigo, r.nombre, r.tipo FROM equipos_recursos er INNER JOIN recursos r ON er.recursoId = r.id WHERE er.equipoId = ${equipo.id} AND r.activo = 1 ORDER BY r.tipo, r.nombre`);
            equipo.recursos = recursos;
        }

        sendJSON(res, equipos);
    } catch (error) {
        console.error('❌ Error al obtener equipos:', error.message);
        sendError(res, 'Error al conectar con la base de datos. Verifica que SQL Server esté ejecutándose.', 503);
    }
}

async function handleCreateEquipo(req, res) {
    try {
        const data = await readBody(req);

        // Validaciones básicas
        if (!data.nombre) {
            return sendError(res, 'El nombre del equipo es obligatorio', 400);
        }

        if (data.recursos && !Array.isArray(data.recursos)) {
            return sendError(res, 'Los recursos deben ser un array de IDs', 400);
        }

        try {
            // Insertar equipo
            const insertSQL = `INSERT INTO equipos (nombre, descripcion, activo) VALUES ('${data.nombre.replace(/'/g, "''")}', '${(data.descripcion || '').replace(/'/g, "''")}', 1)`;

            await executeSQL(insertSQL);

            // Obtener el ID del equipo creado
            const equipoResult = await executeSQL(`SELECT TOP 1 id FROM equipos WHERE nombre = '${data.nombre.replace(/'/g, "''")}' ORDER BY id DESC`);

            const equipoId = equipoResult[0].id;

            // Insertar recursos del equipo si se proporcionaron
            if (data.recursos && data.recursos.length > 0) {
                for (const recursoId of data.recursos) {
                    await executeSQL(`INSERT INTO equipos_recursos (equipoId, recursoId) VALUES (${equipoId}, ${recursoId})`);
                }
            }

            console.log('✅ Equipo creado:', {
                id: equipoId,
                nombre: data.nombre,
                recursos: data.recursos?.length || 0
            });

            sendJSON(res, {
                success: true,
                id: equipoId,
                message: 'Equipo creado exitosamente'
            }, 201);

        } catch (dbError) {
            console.error('❌ Error SQL al crear equipo:', dbError.message);
            throw dbError;
        }

    } catch (error) {
        sendError(res, `Error al crear equipo: ${error.message}`, 400);
    }
}

async function handleUpdateEquipo(req, res, id) {
    try {
        const data = await readBody(req);

        // Validaciones básicas
        if (!data.nombre) {
            return sendError(res, 'El nombre del equipo es obligatorio', 400);
        }

        // Verificar que el equipo existe
        const existingEquipo = await executeSQL(`SELECT id FROM equipos WHERE id = ${id}`);
        if (existingEquipo.length === 0) {
            return sendError(res, `Equipo no encontrado con ID: ${id}`, 404);
        }

        try {
            // Actualizar equipo
            const updateSQL = `UPDATE equipos SET nombre = '${data.nombre.replace(/'/g, "''")}', descripcion = '${(data.descripcion || '').replace(/'/g, "''")}', activo = ${data.activo !== undefined ? (data.activo ? 1 : 0) : 1} WHERE id = ${id}`;

            await executeSQL(updateSQL);

            // Si se proporcionaron recursos, actualizar las relaciones
            if (data.recursos && Array.isArray(data.recursos)) {
                // Eliminar relaciones existentes
                await executeSQL(`DELETE FROM equipos_recursos WHERE equipoId = ${id}`);

                // Insertar nuevas relaciones
                for (const recursoId of data.recursos) {
                    await executeSQL(`INSERT INTO equipos_recursos (equipoId, recursoId) VALUES (${id}, ${recursoId})`);
                }
            }

            console.log('✏️ Equipo actualizado:', {
                id: id,
                nombre: data.nombre,
                recursos: data.recursos?.length || 'sin cambios'
            });

            sendJSON(res, {
                success: true,
                message: 'Equipo actualizado exitosamente'
            });

        } catch (dbError) {
            console.error('❌ Error SQL al actualizar equipo:', dbError.message);
            throw dbError;
        }

    } catch (error) {
        sendError(res, `Error al actualizar equipo: ${error.message}`, 400);
    }
}

async function handleDeleteEquipo(req, res, id) {
    try {
        try {
            // Verificar que el equipo existe
            const existingEquipo = await executeSQL(`SELECT id FROM equipos WHERE id = ${id}`);
            if (existingEquipo.length === 0) {
                return sendError(res, `Equipo no encontrado con ID: ${id}`, 404);
            }

            // Eliminar relaciones de recursos primero
            await executeSQL(`DELETE FROM equipos_recursos WHERE equipoId = ${id}`);

            // Marcar equipo como inactivo (soft delete)
            await executeSQL(`UPDATE equipos SET activo = 0 WHERE id = ${id}`);

            console.log('🗑️ Equipo eliminado (soft delete):', { id: id });

            sendJSON(res, {
                success: true,
                message: 'Equipo eliminado exitosamente'
            });

        } catch (dbError) {
            console.error('❌ Error SQL al eliminar equipo:', dbError.message);
            throw dbError;
        }

    } catch (error) {
        sendError(res, `Error al eliminar equipo: ${error.message}`, 400);
    }
}

// ============== FUNCIONES DE USUARIOS ==============

async function handleGetUsuarios(req, res) {
    try {
        console.log('📋 Obteniendo lista de usuarios...');

        const usuarios = await executeSQL('SELECT id, username, email, nombre, isAdmin, isTeamLeader, teamId, resourceId, isActive, fecha_creacion FROM usuarios ORDER BY fecha_creacion DESC');

        // Convertir valores numéricos/string a booleanos para el frontend
        const usuariosFormatted = usuarios.map(user => ({
            ...user,
            isAdmin: user.isAdmin === true || user.isAdmin === 1 || user.isAdmin === 'true',
            isTeamLeader: user.isTeamLeader === true || user.isTeamLeader === 1 || user.isTeamLeader === 'true',
            isActive: user.isActive === true || user.isActive === 1 || user.isActive === 'true'
        }));

        console.log(`✅ ${usuariosFormatted.length} usuarios encontrados`);
        sendJSON(res, usuariosFormatted);

    } catch (error) {
        console.error('❌ Error obteniendo usuarios:', error.message);
        sendError(res, `Error al obtener usuarios: ${error.message}`, 400);
    }
}

async function handleCreateUsuario(req, res) {
    try {
        const data = await readBody(req);

        // Validaciones básicas
        if (!data.username || !data.email || !data.nombre || !data.password) {
            return sendError(res, 'Username, email, nombre y password son requeridos', 400);
        }

        // Validar email
        if (!data.email.includes('@')) {
            return sendError(res, 'Email debe tener formato válido', 400);
        }

        // Validar roles
        if (data.isAdmin && data.isTeamLeader) {
            return sendError(res, 'Un usuario no puede ser administrador y jefe de equipo al mismo tiempo', 400);
        }

        if (data.isTeamLeader && !data.teamId) {
            return sendError(res, 'Los jefes de equipo deben tener un equipo asignado', 400);
        }

        if (!data.isAdmin && !data.isTeamLeader && !data.resourceId) {
            return sendError(res, 'Los operarios deben tener un recurso asignado', 400);
        }

        // Verificar que username y email son únicos
        const existingUser = await executeSQL(`SELECT id FROM usuarios WHERE username = '${data.username}' OR email = '${data.email}'`);

        if (existingUser.length > 0) {
            return sendError(res, 'Ya existe un usuario con ese username o email', 400);
        }

        console.log('👤 Creando nuevo usuario:', {
            username: data.username,
            email: data.email,
            isAdmin: data.isAdmin,
            isTeamLeader: data.isTeamLeader
        });

        try {
            const insertQuery = `INSERT INTO usuarios (username, email, nombre, password, isAdmin, isTeamLeader, teamId, resourceId, isActive) VALUES ('${data.username}', '${data.email}', '${data.nombre}', '${data.password}', ${data.isAdmin ? 1 : 0}, ${data.isTeamLeader ? 1 : 0}, ${data.teamId || 'NULL'}, ${data.resourceId || 'NULL'}, ${data.isActive ? 1 : 0})`;

            await executeSQL(insertQuery);

            // Obtener el usuario creado
            const newUser = await executeSQL(`SELECT id, username, email, nombre, isAdmin, isTeamLeader, teamId, resourceId, isActive FROM usuarios WHERE username = '${data.username}'`);

            console.log('✅ Usuario creado exitosamente:', newUser[0]);

            sendJSON(res, {
                success: true,
                message: 'Usuario creado exitosamente',
                user: newUser[0]
            }, 201);

        } catch (dbError) {
            console.error('❌ Error SQL al crear usuario:', dbError.message);
            throw dbError;
        }

    } catch (error) {
        console.error('❌ Error al crear usuario:', error.message);
        sendError(res, `Error al crear usuario: ${error.message}`, 400);
    }
}

async function handleUpdateUsuario(req, res, id) {
    try {
        const data = await readBody(req);

        // Verificar que el usuario existe
        const existingUser = await executeSQL(`SELECT id FROM usuarios WHERE id = ${id}`);
        if (existingUser.length === 0) {
            return sendError(res, `Usuario no encontrado con ID: ${id}`, 404);
        }

        // Validaciones básicas
        if (!data.username || !data.email || !data.nombre) {
            return sendError(res, 'Username, email y nombre son requeridos', 400);
        }

        // Validar email
        if (!data.email.includes('@')) {
            return sendError(res, 'Email debe tener formato válido', 400);
        }

        // Validar roles
        if (data.isAdmin && data.isTeamLeader) {
            return sendError(res, 'Un usuario no puede ser administrador y jefe de equipo al mismo tiempo', 400);
        }

        if (data.isTeamLeader && !data.teamId) {
            return sendError(res, 'Los jefes de equipo deben tener un equipo asignado', 400);
        }

        if (!data.isAdmin && !data.isTeamLeader && !data.resourceId) {
            return sendError(res, 'Los operarios deben tener un recurso asignado', 400);
        }

        // Verificar que username y email son únicos (excluyendo el usuario actual)
        const existingOtherUser = await executeSQL(`SELECT id FROM usuarios WHERE (username = '${data.username}' OR email = '${data.email}') AND id != ${id}`);

        if (existingOtherUser.length > 0) {
            return sendError(res, 'Ya existe otro usuario con ese username o email', 400);
        }

        console.log('🔄 Actualizando usuario:', { id, username: data.username });

        try {
            let updateQuery = `UPDATE usuarios SET username = '${data.username}', email = '${data.email}', nombre = '${data.nombre}', isAdmin = ${data.isAdmin ? 1 : 0}, isTeamLeader = ${data.isTeamLeader ? 1 : 0}, teamId = ${data.teamId || 'NULL'}, resourceId = ${data.resourceId || 'NULL'}, isActive = ${data.isActive ? 1 : 0}`;

            // Solo actualizar contraseña si se proporciona
            if (data.password) {
                updateQuery += `, password = '${data.password}'`;
            }

            updateQuery += ` WHERE id = ${id}`;

            await executeSQL(updateQuery);

            // Obtener el usuario actualizado
            const updatedUser = await executeSQL(`SELECT id, username, email, nombre, isAdmin, isTeamLeader, teamId, resourceId, isActive FROM usuarios WHERE id = ${id}`);

            console.log('✅ Usuario actualizado exitosamente:', updatedUser[0]);

            sendJSON(res, {
                success: true,
                message: 'Usuario actualizado exitosamente',
                user: updatedUser[0]
            });

        } catch (dbError) {
            console.error('❌ Error SQL al actualizar usuario:', dbError.message);
            throw dbError;
        }

    } catch (error) {
        console.error('❌ Error al actualizar usuario:', error.message);
        sendError(res, `Error al actualizar usuario: ${error.message}`, 400);
    }
}


// ============== FIN FUNCIONES DE USUARIOS ==============

async function handleCreateActividad(req, res) {
    try {
        const data = req.parsedBody;

        // Validaciones básicas
        if (!data.obraId || !data.recursoId || !data.tipoActividadId) {
            return sendError(res, 'Campos obligatorios faltantes: obraId, recursoId, tipoActividadId', 400);
        }

        if (!data.fechaInicio || !data.horaInicio) {
            return sendError(res, 'Fecha y hora de inicio son obligatorias', 400);
        }

        if (!validateTimeFormat(data.horaInicio)) {
            return sendError(res, 'Hora de inicio debe ser en intervalos de 15 minutos', 400);
        }

        if (data.horaFin && !validateTimeFormat(data.horaFin)) {
            return sendError(res, 'Hora de fin debe ser en intervalos de 15 minutos', 400);
        }

        // Verificar y ajustar solapamientos
        const adjustedData = await checkAndAdjustOverlaps(data);

        // Si se ajustaron los horarios, informar al cliente
        const wasAdjusted = adjustedData.horaInicio !== data.horaInicio ||
                           adjustedData.horaFin !== data.horaFin;

        // Intentar insertar en SQL Server
        try {
            // Construir la consulta dinámicamente, solo incluyendo campos con valores (usando datos ajustados)
            let fields = ['obra_id', 'recurso_id', 'tipo_actividad_id', 'fecha_inicio', 'hora_inicio', 'usuario_creacion', 'fecha_creacion', 'fecha_modificacion'];
            let values = [`${adjustedData.obraId}`, `${adjustedData.recursoId}`, `${adjustedData.tipoActividadId}`, `'${adjustedData.fechaInicio}'`, `'${adjustedData.horaInicio}'`, '1', 'GETDATE()', 'GETDATE()'];

            // Agregar campos opcionales solo si tienen valor
            if (adjustedData.fechaFin) {
                fields.push('fecha_fin');
                values.push(`'${adjustedData.fechaFin}'`);
            }
            if (adjustedData.horaFin) {
                fields.push('hora_fin');
                values.push(`'${adjustedData.horaFin}'`);
            }
            if (data.observaciones) {
                fields.push('observaciones');
                values.push(`'${data.observaciones.replace(/'/g, "''")}'`);
            }
            if (data.latitudInicio) {
                fields.push('latitud_inicio');
                values.push(`${data.latitudInicio}`);
            }
            if (data.longitudInicio) {
                fields.push('longitud_inicio');
                values.push(`${data.longitudInicio}`);
            }
            if (data.latitudFin) {
                fields.push('latitud_fin');
                values.push(`${data.latitudFin}`);
            }
            if (data.longitudFin) {
                fields.push('longitud_fin');
                values.push(`${data.longitudFin}`);
            }
            if (data.kmRecorridos) {
                fields.push('km_recorridos');
                values.push(`${data.kmRecorridos}`);
            }

            const insertSQL = `INSERT INTO actividades (${fields.join(', ')}) VALUES (${values.join(', ')})`;

            const result = await executeSQL(insertSQL);

            console.log('💾 Actividad guardada en SQL Server:', {
                obra: adjustedData.obraId,
                recurso: adjustedData.recursoId,
                tipo: adjustedData.tipoActividadId,
                fecha: adjustedData.fechaInicio,
                hora: adjustedData.horaInicio,
                ajustada: wasAdjusted
            });

            const message = wasAdjusted ?
                '✅ Actividad guardada exitosamente (horarios ajustados para evitar solapamientos)' :
                '✅ Actividad guardada exitosamente en SQL Server';

            sendJSON(res, {
                message: message,
                actividad: {
                    ...adjustedData,
                    fechaCreacion: new Date().toISOString(),
                    database: 'SQL Server Real',
                    rowsAffected: result.affectedRows || 1
                },
                ajustes: wasAdjusted ? {
                    horaInicioOriginal: data.horaInicio,
                    horaFinOriginal: data.horaFin,
                    horaInicioAjustada: adjustedData.horaInicio,
                    horaFinAjustada: adjustedData.horaFin
                } : null
            }, 201);

        } catch (sqlError) {
            console.error('❌ Error guardando en SQL Server:', sqlError.message);
            sendError(res, `Error guardando en base de datos: ${sqlError.message}`, 500);
        }

    } catch (error) {
        sendError(res, `Error processing request: ${error.message}`, 400);
    }
}

async function handleGetActividades(req, res) {
    try {
        // Obtener actividades básicas
        const actividades = await executeSQL('SELECT * FROM actividades ORDER BY fecha_creacion DESC');

        // Obtener datos de referencia
        const [obras, recursos, tiposActividad] = await Promise.all([
            executeSQL('SELECT * FROM obras'),
            executeSQL('SELECT * FROM recursos'),
            executeSQL('SELECT * FROM tipos_actividad')
        ]);

        // Crear mapas para lookups rápidos
        const obrasMap = obras.reduce((map, obra) => {
            map[obra.id] = obra;
            return map;
        }, {});

        const recursosMap = recursos.reduce((map, recurso) => {
            map[recurso.id] = recurso;
            return map;
        }, {});

        const tiposMap = tiposActividad.reduce((map, tipo) => {
            map[tipo.id] = tipo;
            return map;
        }, {});

        // Formatear respuesta combinando datos
        const actividadesFormatted = actividades.map(row => ({
            id: row.id,
            obraId: row.obra_id,
            recursoId: row.recurso_id,
            tipoActividadId: row.tipo_actividad_id,
            fechaInicio: row.fecha_inicio?.split('T')[0], // Extraer solo la fecha
            horaInicio: row.hora_inicio?.split('T')[1]?.split('.')[0] || row.hora_inicio, // Extraer solo la hora
            fechaFin: row.fecha_fin?.split('T')[0] || null,
            horaFin: row.hora_fin?.split('T')[1]?.split('.')[0] || row.hora_fin || null,
            observaciones: row.observaciones,
            fechaCreacion: row.fecha_creacion,
            obra: obrasMap[row.obra_id] ? {
                id: row.obra_id,
                codigo: obrasMap[row.obra_id].codigo,
                descripcion: obrasMap[row.obra_id].descripcion
            } : null,
            recurso: recursosMap[row.recurso_id] ? {
                id: row.recurso_id,
                codigo: recursosMap[row.recurso_id].codigo,
                nombre: recursosMap[row.recurso_id].nombre,
                tipo: recursosMap[row.recurso_id].tipo
            } : null,
            tipoActividad: tiposMap[row.tipo_actividad_id] ? {
                id: row.tipo_actividad_id,
                codigo: tiposMap[row.tipo_actividad_id].codigo,
                nombre: tiposMap[row.tipo_actividad_id].nombre
            } : null
        }));

        console.log(`✅ ${actividadesFormatted.length} actividades obtenidas de SQL Server`);
        sendJSON(res, actividadesFormatted);
    } catch (error) {
        console.log('⚠️ Error obteniendo actividades de SQL Server:', error.message);
        sendJSON(res, []);
    }
}

async function handleUpdateActividad(req, res, id) {
    try {
        const data = req.parsedBody;

        // Verificar que la actividad existe y obtener datos actuales
        const existingActivityResult = await executeSQL(`SELECT * FROM actividades WHERE id = ${id}`);
        if (existingActivityResult.length === 0) {
            return sendError(res, 'Actividad no encontrada', 404);
        }

        const existingActivity = existingActivityResult[0];

        // Helper function to format date as YYYY-MM-DD
        const formatDate = (dateValue) => {
            if (!dateValue || dateValue === 'null') return null;
            if (typeof dateValue === 'string' && dateValue.includes('T')) {
                // ISO string like '2025-09-29T00:00:00.000Z'
                return dateValue.split('T')[0];
            }
            if (dateValue instanceof Date) {
                return dateValue.toISOString().split('T')[0];
            }
            return dateValue;
        };

        // Helper function to format time as HH:MM
        const formatTime = (timeValue) => {
            if (!timeValue || timeValue === 'null') return null;
            if (typeof timeValue === 'string') {
                // If it's already a string in HH:MM format, return as is
                if (timeValue.match(/^\d{2}:\d{2}$/)) {
                    return timeValue;
                }
                // If it's an ISO string, extract time part
                if (timeValue.includes('T')) {
                    const timePart = timeValue.split('T')[1];
                    return timePart ? timePart.substring(0, 5) : null;
                }
            }
            if (timeValue instanceof Date) {
                return timeValue.toTimeString().substring(0, 5);
            }
            return timeValue;
        };

        // Para actualizaciones parciales, combinar datos existentes con nuevos datos
        const updateData = {
            obraId: data.obraId || existingActivity.obra_id,
            recursoId: data.recursoId || existingActivity.recurso_id,
            tipoActividadId: data.tipoActividadId || existingActivity.tipo_actividad_id,
            fechaInicio: data.fechaInicio || formatDate(existingActivity.fecha_inicio),
            horaInicio: data.horaInicio || formatTime(existingActivity.hora_inicio),
            // Para fechaFin y horaFin, permitir que null se guarde explícitamente
            fechaFin: data.fechaFin !== undefined ? data.fechaFin : formatDate(existingActivity.fecha_fin),
            horaFin: data.horaFin !== undefined ? data.horaFin : formatTime(existingActivity.hora_fin),
            observaciones: data.observaciones !== undefined ? data.observaciones : existingActivity.observaciones
        };

        // Validaciones solo sobre los campos que se están actualizando
        if (data.horaInicio && !validateTimeFormat(data.horaInicio)) {
            return sendError(res, 'Hora de inicio debe ser en intervalos de 15 minutos', 400);
        }

        if (data.horaFin && !validateTimeFormat(data.horaFin)) {
            return sendError(res, 'Hora de fin debe ser en intervalos de 15 minutos', 400);
        }

        // Verificar y ajustar solapamientos solo si hay cambios de horario (excluyendo la actividad actual)
        let adjustedData = updateData;
        if (data.horaInicio || data.horaFin || data.fechaInicio) {
            adjustedData = await checkAndAdjustOverlaps(updateData, id);
        }

        // Si se ajustaron los horarios, informar al cliente
        const wasAdjusted = adjustedData.horaInicio !== updateData.horaInicio ||
                           adjustedData.horaFin !== updateData.horaFin;

        // Construir la consulta UPDATE dinámicamente (usando datos ajustados)
        let updateFields = [
            `obra_id = ${adjustedData.obraId}`,
            `recurso_id = ${adjustedData.recursoId}`,
            `tipo_actividad_id = ${adjustedData.tipoActividadId}`,
            `fecha_inicio = '${adjustedData.fechaInicio}'`,
            `hora_inicio = '${adjustedData.horaInicio}'`,
            `fecha_modificacion = GETDATE()`
        ];

        // Agregar campos opcionales - usar NULL para valores nulos
        if (adjustedData.fechaFin !== null) {
            updateFields.push(`fecha_fin = ${adjustedData.fechaFin ? `'${adjustedData.fechaFin}'` : 'NULL'}`);
        }
        if (adjustedData.horaFin !== null) {
            updateFields.push(`hora_fin = ${adjustedData.horaFin ? `'${adjustedData.horaFin}'` : 'NULL'}`);
        }
        if (adjustedData.observaciones !== undefined) {
            updateFields.push(`observaciones = ${adjustedData.observaciones ? `'${adjustedData.observaciones.replace(/'/g, "''")}'` : 'NULL'}`);
        }

        const updateSQL = `UPDATE actividades SET ${updateFields.join(', ')} WHERE id = ${id}`;

        try {
            const result = await executeSQL(updateSQL);

            console.log('✏️ Actividad actualizada en SQL Server:', {
                id: id,
                obra: data.obraId,
                recurso: data.recursoId,
                tipo: data.tipoActividadId,
                fecha: data.fechaInicio,
                hora: data.horaInicio
            });

            sendJSON(res, {
                message: '✅ Actividad actualizada exitosamente en SQL Server',
                actividad: {
                    id: parseInt(id),
                    ...data,
                    fechaModificacion: new Date().toISOString(),
                    database: 'SQL Server Real'
                }
            });

        } catch (sqlError) {
            console.error('❌ Error actualizando en SQL Server:', sqlError.message);
            sendError(res, `Error actualizando en base de datos: ${sqlError.message}`, 500);
        }

    } catch (error) {
        sendError(res, `Error processing request: ${error.message}`, 400);
    }
}

// Borrar una actividad específica
async function handleDeleteActividad(req, res, id) {
    try {
        console.log(`🗑️ Eliminando actividad con ID: ${id}`);

        // Verificar que la actividad existe
        const existingActivity = await executeSQL(`SELECT id FROM actividades WHERE id = ${id}`);
        if (existingActivity.length === 0) {
            return sendError(res, `Actividad no encontrada con ID: ${id}`, 404);
        }

        const deleteSQL = `DELETE FROM actividades WHERE id = ${id}`;

        const result = await executeSQL(deleteSQL);

        console.log(`✅ Actividad ${id} eliminada exitosamente`);

        sendJSON(res, {
            message: `✅ Actividad ${id} eliminada exitosamente`,
            id: parseInt(id),
            result: result,
            database: 'SQL Server Real'
        });

    } catch (error) {
        console.error(`❌ Error eliminando actividad ${id}:`, error.message);
        sendError(res, `Error eliminando actividad: ${error.message}`, 500);
    }
}

// Borrar todas las actividades
async function handleDeleteAllActividades(req, res) {
    try {
        console.log('🗑️ Eliminando todas las actividades...');

        const deleteSQL = 'DELETE FROM actividades';

        const result = await executeSQL(deleteSQL);

        console.log('✅ Todas las actividades han sido eliminadas');

        sendJSON(res, {
            message: '✅ Todas las actividades han sido eliminadas exitosamente',
            result: result,
            database: 'SQL Server Real'
        });

    } catch (error) {
        console.error('❌ Error eliminando actividades:', error.message);
        sendError(res, `Error eliminando actividades: ${error.message}`, 500);
    }
}

// Handlers para API logs y configuración
async function handleGetApiLogs(req, res) {
    try {
        const parsedUrl = url.parse(req.url, true);
        const query = parsedUrl.query;

        let sql = 'SELECT * FROM api_logs';
        const conditions = [];

        // Aplicar filtros
        if (query.method) {
            conditions.push(`method = '${query.method.replace(/'/g, "''")}'`);
        }
        if (query.status_code) {
            conditions.push(`status_code = ${parseInt(query.status_code)}`);
        }
        if (query.endpoint) {
            conditions.push(`endpoint LIKE '%${query.endpoint.replace(/'/g, "''")}%'`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY created_at DESC';

        // Limitar resultados
        const limit = parseInt(query.limit) || 100;
        sql += ` OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY`;

        const result = await executeSQL(sql);
        sendJSON(res, result);
    } catch (error) {
        console.error('❌ Error al obtener logs API:', error.message);
        sendError(res, 'Error al obtener logs de API', 500);
    }
}

async function handleGetDebugMode(req, res) {
    try {
        const result = await executeSQL("SELECT config_value FROM configuration WHERE config_key = 'debug_mode'");
        const debugMode = result.length > 0 ? result[0].config_value === 'true' : false;
        sendJSON(res, { debug_mode: debugMode });
    } catch (error) {
        console.error('❌ Error al obtener modo debug:', error.message);
        sendError(res, 'Error al obtener configuración de debug', 500);
    }
}

async function handleSetDebugMode(req, res) {
    try {
        const data = await readBody(req);
        const debugMode = data.debug_mode ? 'true' : 'false';

        const sql = `UPDATE configuration SET config_value = '${debugMode}', updated_at = GETDATE() WHERE config_key = 'debug_mode'`;
        await executeSQL(sql);

        console.log(`✅ Modo debug ${debugMode === 'true' ? 'activado' : 'desactivado'}`);

        sendJSON(res, {
            success: true,
            message: `Modo debug ${debugMode === 'true' ? 'activado' : 'desactivado'}`,
            debug_mode: debugMode === 'true'
        });
    } catch (error) {
        console.error('❌ Error al configurar modo debug:', error.message);
        sendError(res, 'Error al configurar modo debug', 500);
    }
}

// Handler para ejecutar SQL manual (solo para administradores)
async function handleExecuteSQL(req, res) {
    try {
        const data = await readBody(req);
        const sqlQuery = data.query;

        if (!sqlQuery || typeof sqlQuery !== 'string') {
            return sendError(res, 'Se requiere una consulta SQL válida', 400);
        }

        console.log('🔧 Ejecutando SQL manual:', sqlQuery.substring(0, 100) + (sqlQuery.length > 100 ? '...' : ''));

        const result = await executeSQL(sqlQuery);

        sendJSON(res, {
            success: true,
            rowCount: Array.isArray(result) ? result.length : 0,
            data: result,
            message: 'Consulta ejecutada correctamente'
        });
    } catch (error) {
        console.error('❌ Error ejecutando SQL manual:', error.message);
        sendError(res, `Error ejecutando SQL: ${error.message}`, 500);
    }
}

// Crear servidor
const server = http.createServer(async (req, res) => {
    const startTime = Date.now();
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.connection.remoteAddress || req.socket.remoteAddress || (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0]);

    let requestBody = null;
    let responseBody = null;
    let statusCode = 200;
    let errorMessage = null;

    if (method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end();

        // Log OPTIONS request
        const responseTime = Date.now() - startTime;
        await logApiCall(method, path, 200, responseTime, null, null, userAgent, ipAddress);
        return;
    }

    try {
        // Read request body for POST/PUT requests
        if (method === 'POST' || method === 'PUT') {
            try {
                const body = await readBody(req);
                requestBody = JSON.stringify(body);
                // Store parsed body in request for handlers to use
                req.parsedBody = body;
            } catch (err) {
                requestBody = 'Invalid JSON';
                req.parsedBody = null;
            }
        }
        if (path === '/' && method === 'GET') {
            await handleRoot(req, res);
        } else if (path === '/health' && method === 'GET') {
            await handleHealth(req, res);
        } else if (path === '/tipos-actividad' && method === 'GET') {
            await handleGetTiposActividad(req, res);
        } else if (path === '/tipos-actividad' && method === 'POST') {
            await handleCreateTipoActividad(req, res);
        } else if (path.startsWith('/tipos-actividad/') && method === 'PUT') {
            const id = path.split('/')[2];
            await handleUpdateTipoActividad(req, res, id);
        } else if (path.startsWith('/tipos-actividad/') && method === 'DELETE') {
            const id = path.split('/')[2];
            await handleDeleteTipoActividad(req, res, id);
        } else if (path === '/obras' && method === 'GET') {
            await handleGetObras(req, res);
        } else if (path === '/obras' && method === 'POST') {
            await handleCreateObra(req, res);
        } else if (path.startsWith('/obras/') && method === 'PUT') {
            const id = path.split('/')[2];
            await handleUpdateObra(req, res, id);
        } else if (path.startsWith('/obras/') && method === 'DELETE') {
            const id = path.split('/')[2];
            await handleDeleteObra(req, res, id);
        } else if (path === '/recursos' && method === 'GET') {
            await handleGetRecursos(req, res);
        } else if (path === '/recursos' && method === 'POST') {
            await handleCreateRecurso(req, res);
        } else if (path.startsWith('/recursos/disponibles') && method === 'GET') {
            await handleGetRecursosDisponibles(req, res);
        } else if (path === '/recursos/seed' && method === 'POST') {
            await handleSeedRecursos(req, res);
        } else if (path === '/recursos/migrate-mobile-field' && method === 'POST') {
            await handleAddMobileFieldMigration(req, res);
        } else if (path === '/equipos' && method === 'GET') {
            await handleGetEquipos(req, res);
        } else if (path === '/equipos' && method === 'POST') {
            await handleCreateEquipo(req, res);
        } else if (path.startsWith('/equipos/') && method === 'PUT') {
            const id = path.split('/')[2];
            await handleUpdateEquipo(req, res, id);
        } else if (path.startsWith('/equipos/') && method === 'DELETE') {
            const id = path.split('/')[2];
            await handleDeleteEquipo(req, res, id);
        } else if (path === '/usuarios' && method === 'GET') {
            await handleGetUsuarios(req, res);
        } else if (path === '/usuarios' && method === 'POST') {
            await handleCreateUsuario(req, res);
        } else if (path.startsWith('/usuarios/') && method === 'PUT') {
            const id = path.split('/')[2];
            await handleUpdateUsuario(req, res, id);
        } else if (path === '/actividades' && method === 'POST') {
            await handleCreateActividad(req, res);
        } else if (path === '/actividades' && method === 'GET') {
            await handleGetActividades(req, res);
        } else if (path === '/api-logs' && method === 'GET') {
            await handleGetApiLogs(req, res);
        } else if (path === '/configuration/debug-mode' && method === 'GET') {
            await handleGetDebugMode(req, res);
        } else if (path === '/configuration/debug-mode' && method === 'PUT') {
            await handleSetDebugMode(req, res);
        } else if (path === '/sql/execute' && method === 'POST') {
            await handleExecuteSQL(req, res);
        } else if (path.startsWith('/actividades/') && method === 'PUT') {
            const id = path.split('/')[2];
            await handleUpdateActividad(req, res, id);
        } else if (path.startsWith('/actividades/') && method === 'DELETE') {
            const pathParts = path.split('/');
            if (pathParts[2] === 'delete-all') {
                await handleDeleteAllActividades(req, res);
            } else {
                const id = pathParts[2];
                await handleDeleteActividad(req, res, id);
            }
        } else {
            statusCode = 404;
            sendError(res, `Endpoint not found: ${method} ${path}`, 404);
        }
    } catch (error) {
        console.error('❌ Server error:', error);
        statusCode = 500;
        errorMessage = error.message;
        sendError(res, 'Internal server error');
    } finally {
        // Log the API call
        const responseTime = Date.now() - startTime;
        const finalStatusCode = res._statusCode || statusCode || 200;
        const finalResponseBody = res._responseBody || responseBody;

        await logApiCall(method, path, finalStatusCode, responseTime, requestBody, finalResponseBody, userAgent, ipAddress, errorMessage);
    }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
    console.log(`🚀 Servidor SQL Server Real ejecutándose en puerto ${PORT}`);
    console.log(`📡 Base de datos: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    console.log(`👤 Usuario: ${dbConfig.username}`);

    // Test de conexión inicial
    try {
        const testResult = await executeSQL('SELECT COUNT(*) as count FROM tipos_actividad');
        dbConnected = true;
        console.log(`✅ Conexión SQL Server exitosa - ${testResult[0]?.count || 0} tipos de actividad encontrados`);
    } catch (error) {
        console.log(`❌ SQL Server no disponible: ${error.message}`);
        console.log(`⚠️ ADVERTENCIA: El servidor no podrá procesar solicitudes sin conexión a la base de datos.`);
        dbConnected = false;
    }

    console.log(`\n📋 Endpoints disponibles:`);
    console.log(`- GET    http://localhost:${PORT}/ - Estado del servidor`);
    console.log(`- GET    http://localhost:${PORT}/health - Test de conectividad`);
    console.log(`- GET    http://localhost:${PORT}/tipos-actividad - Lista tipos de actividad`);
    console.log(`- POST   http://localhost:${PORT}/tipos-actividad - Crear tipo de actividad`);
    console.log(`- PUT    http://localhost:${PORT}/tipos-actividad/:id - Actualizar tipo de actividad`);
    console.log(`- DELETE http://localhost:${PORT}/tipos-actividad/:id - Eliminar tipo de actividad`);
    console.log(`- GET    http://localhost:${PORT}/obras - Lista obras`);
    console.log(`- GET    http://localhost:${PORT}/recursos - Lista recursos`);
    console.log(`- POST   http://localhost:${PORT}/recursos - Crear recurso`);
    console.log(`- GET    http://localhost:${PORT}/equipos - Lista equipos`);
    console.log(`- POST   http://localhost:${PORT}/equipos - Crear equipo`);
    console.log(`- PUT    http://localhost:${PORT}/equipos/:id - Actualizar equipo`);
    console.log(`- DELETE http://localhost:${PORT}/equipos/:id - Eliminar equipo`);
    console.log(`- POST   http://localhost:${PORT}/actividades - Crear actividad`);
    console.log(`- GET    http://localhost:${PORT}/actividades - Listar actividades`);
    console.log(`- PUT    http://localhost:${PORT}/actividades/:id - Actualizar actividad`);
    console.log(`- DELETE http://localhost:${PORT}/actividades/:id - Eliminar actividad`);
    console.log(`- DELETE http://localhost:${PORT}/actividades/delete-all - Eliminar todas`);
    console.log(`- GET    http://localhost:${PORT}/usuarios - Lista usuarios`);
    console.log(`- POST   http://localhost:${PORT}/usuarios - Crear usuario`);
    console.log(`- PUT    http://localhost:${PORT}/usuarios/:id - Actualizar usuario`);
    console.log(`\n💾 Estado: ${dbConnected ? '✅ CONECTADO A SQL SERVER' : '❌ SIN CONEXIÓN A BASE DE DATOS'}`);
});

server.on('error', (error) => {
    console.error('❌ Error del servidor:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Puerto ${PORT} ya está en uso`);
    }
});

process.on('SIGINT', () => {
    console.log('\n🔄 Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado');
        process.exit(0);
    });
});