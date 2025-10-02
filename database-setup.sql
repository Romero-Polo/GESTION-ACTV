-- ===============================================
-- SCRIPT DE CREACIÓN DE BASE DE DATOS COMPLETA
-- Sistema de Gestión de Actividades v0.1.1
-- ===============================================

USE RP_GESTOR_JORNADAS;
GO

-- ===============================================
-- TABLA: configuration
-- Configuraciones del sistema
-- ===============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'configuration')
BEGIN
    CREATE TABLE configuration (
        id INT IDENTITY(1,1) PRIMARY KEY,
        config_key NVARCHAR(100) NOT NULL UNIQUE,
        config_value NVARCHAR(500) NOT NULL,
        description NVARCHAR(255) NULL,
        config_type NVARCHAR(50) NOT NULL DEFAULT 'string', -- string, boolean, number, json
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    -- Insertar configuraciones por defecto
    INSERT INTO configuration (config_key, config_value, description, config_type) VALUES
    ('debug_mode', 'false', 'Activar modo debug para registrar llamadas API', 'boolean'),
    ('log_retention_days', '30', 'Días de retención de logs', 'number'),
    ('system_name', 'Sistema de Gestión de Actividades', 'Nombre del sistema', 'string'),
    ('version', '0.1.1', 'Versión actual del sistema', 'string');

    PRINT '✅ Tabla configuration creada con configuraciones por defecto';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla configuration ya existe';
END
GO

-- ===============================================
-- TABLA: api_logs
-- Registro de llamadas API para debug y optimización
-- ===============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'api_logs')
BEGIN
    CREATE TABLE api_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        method NVARCHAR(10) NOT NULL,           -- GET, POST, PUT, DELETE
        endpoint NVARCHAR(500) NOT NULL,        -- URL del endpoint
        status_code INT NOT NULL,               -- Código de respuesta HTTP
        response_time_ms INT NOT NULL,          -- Tiempo de respuesta en milisegundos
        request_body NVARCHAR(MAX) NULL,        -- Cuerpo de la petición (JSON)
        response_body NVARCHAR(MAX) NULL,       -- Cuerpo de la respuesta (JSON)
        user_agent NVARCHAR(500) NULL,         -- User-Agent del cliente
        ip_address NVARCHAR(45) NULL,          -- Dirección IP del cliente
        error_message NVARCHAR(1000) NULL,     -- Mensaje de error si aplica
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        INDEX IX_api_logs_created_at (created_at),
        INDEX IX_api_logs_method (method),
        INDEX IX_api_logs_status_code (status_code),
        INDEX IX_api_logs_endpoint (endpoint)
    );

    PRINT '✅ Tabla api_logs creada con índices optimizados';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla api_logs ya existe';
END
GO

-- ===============================================
-- TABLA: tipos_actividad
-- Tipos de actividad disponibles
-- ===============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tipos_actividad')
BEGIN
    CREATE TABLE tipos_actividad (
        id INT IDENTITY(1,1) PRIMARY KEY,
        codigo NVARCHAR(50) NOT NULL UNIQUE,
        nombre NVARCHAR(200) NOT NULL,
        descripcion NVARCHAR(500) NULL,
        color NVARCHAR(7) NOT NULL DEFAULT '#3B82F6',
        activo BIT NOT NULL DEFAULT 1,
        fecha_creacion DATETIME2 NOT NULL DEFAULT GETDATE(),
        fecha_actualizacion DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    -- Insertar tipos por defecto
    INSERT INTO tipos_actividad (codigo, nombre, descripcion, color) VALUES
    ('EXCAVACION', 'Excavación', 'Trabajos de excavación y movimiento de tierras', '#F59E0B'),
    ('HORMIGON', 'Hormigonado', 'Trabajos de hormigonado y vertido', '#10B981'),
    ('FERRALLA', 'Ferralla', 'Trabajos de armado y ferralla', '#EF4444'),
    ('TRANSPORTE', 'Transporte', 'Transporte de materiales y equipos', '#8B5CF6'),
    ('MANTENIMIENTO', 'Mantenimiento', 'Mantenimiento de equipos y maquinaria', '#6B7280');

    PRINT '✅ Tabla tipos_actividad creada con datos por defecto';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla tipos_actividad ya existe';
END
GO

-- ===============================================
-- TABLA: obras
-- Obras del proyecto
-- ===============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'obras')
BEGIN
    CREATE TABLE obras (
        id INT IDENTITY(1,1) PRIMARY KEY,
        codigo NVARCHAR(50) NOT NULL UNIQUE,
        descripcion NVARCHAR(500) NOT NULL,
        direccion NVARCHAR(300) NULL,
        fecha_inicio DATE NULL,
        fecha_fin DATE NULL,
        activo BIT NOT NULL DEFAULT 1,
        fecha_creacion DATETIME2 NOT NULL DEFAULT GETDATE(),
        fecha_actualizacion DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    -- Insertar obras por defecto
    INSERT INTO obras (codigo, descripcion, direccion) VALUES
    ('OBRA001', 'Construcción Edificio Residencial', 'Calle Principal 123, Ciudad'),
    ('OBRA002', 'Infraestructura Vial Sector Norte', 'Avenida Norte, Km 15'),
    ('OBRA003', 'Centro Comercial Plaza Central', 'Plaza Central s/n');

    PRINT '✅ Tabla obras creada con datos por defecto';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla obras ya existe';
END
GO

-- ===============================================
-- TABLA: recursos
-- Recursos (operarios y maquinaria)
-- ===============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'recursos')
BEGIN
    CREATE TABLE recursos (
        id INT IDENTITY(1,1) PRIMARY KEY,
        codigo NVARCHAR(50) NOT NULL UNIQUE,
        nombre NVARCHAR(200) NOT NULL,
        tipo NVARCHAR(50) NOT NULL, -- 'operario' o 'maquina'
        agrCoste NVARCHAR(100) NOT NULL,
        telefono_movil NVARCHAR(20) NULL,
        activo BIT NOT NULL DEFAULT 1,
        externalId NVARCHAR(100) NULL,
        empresa NVARCHAR(200) NULL,
        categoria NVARCHAR(100) NULL,
        costeHora DECIMAL(10,2) NULL,
        lastSyncDate DATETIME2 NULL,
        fecha_creacion DATETIME2 NOT NULL DEFAULT GETDATE(),
        codigoNAV NVARCHAR(50) NULL,
        tacografo NVARCHAR(50) NULL,
        CHECK (tipo IN ('operario', 'maquina'))
    );

    -- Insertar recursos por defecto
    INSERT INTO recursos (codigo, nombre, tipo, agrCoste) VALUES
    ('OP001', 'Juan Pérez', 'operario', 'MANO_OBRA_001'),
    ('OP002', 'María García', 'operario', 'MANO_OBRA_002'),
    ('OP003', 'Carlos López', 'operario', 'MANO_OBRA_003'),
    ('MAQ001', 'Excavadora CAT 320', 'maquina', 'MAQUINA_001'),
    ('MAQ002', 'Dumper Volvo A30', 'maquina', 'MAQUINA_002');

    PRINT '✅ Tabla recursos creada con datos por defecto';
END
ELSE
BEGIN
    -- Verificar si existe la columna telefono_movil
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'recursos' AND COLUMN_NAME = 'telefono_movil')
    BEGIN
        ALTER TABLE recursos ADD telefono_movil NVARCHAR(20) NULL;
        PRINT '✅ Columna telefono_movil añadida a tabla recursos';
    END
END
GO

-- ===============================================
-- TABLA: equipos
-- Equipos (agrupaciones de recursos)
-- ===============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'equipos')
BEGIN
    CREATE TABLE equipos (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(200) NOT NULL,
        descripcion NVARCHAR(500) NULL,
        activo BIT NOT NULL DEFAULT 1,
        fecha_creacion DATETIME2 NOT NULL DEFAULT GETDATE(),
        fecha_actualizacion DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    PRINT '✅ Tabla equipos creada';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla equipos ya existe';
END
GO

-- ===============================================
-- TABLA: equipos_recursos
-- Relación entre equipos y recursos
-- ===============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'equipos_recursos')
BEGIN
    CREATE TABLE equipos_recursos (
        id INT IDENTITY(1,1) PRIMARY KEY,
        equipoId INT NOT NULL,
        recursoId INT NOT NULL,
        fecha_asignacion DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (equipoId) REFERENCES equipos(id) ON DELETE CASCADE,
        FOREIGN KEY (recursoId) REFERENCES recursos(id) ON DELETE CASCADE,
        UNIQUE(equipoId, recursoId)
    );

    PRINT '✅ Tabla equipos_recursos creada';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla equipos_recursos ya existe';
END
GO

-- ===============================================
-- TABLA: actividades
-- Actividades programadas
-- ===============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'actividades')
BEGIN
    CREATE TABLE actividades (
        id INT IDENTITY(1,1) PRIMARY KEY,
        obra_id INT NOT NULL,
        recurso_id INT NOT NULL,
        tipo_actividad_id INT NOT NULL,
        fecha_inicio DATE NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        descripcion NVARCHAR(500) NULL,
        observaciones NVARCHAR(1000) NULL,
        estado NVARCHAR(50) NOT NULL DEFAULT 'programada',
        fecha_creacion DATETIME2 NOT NULL DEFAULT GETDATE(),
        fecha_actualizacion DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (obra_id) REFERENCES obras(id),
        FOREIGN KEY (recurso_id) REFERENCES recursos(id),
        FOREIGN KEY (tipo_actividad_id) REFERENCES tipos_actividad(id),
        CHECK (estado IN ('programada', 'en_curso', 'completada', 'cancelada'))
    );

    PRINT '✅ Tabla actividades creada';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla actividades ya existe';
END
GO

-- ===============================================
-- TABLA: usuarios
-- Usuarios del sistema
-- ===============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'usuarios')
BEGIN
    CREATE TABLE usuarios (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(100) NOT NULL UNIQUE,
        email NVARCHAR(255) NOT NULL UNIQUE,
        nombre NVARCHAR(200) NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        rol NVARCHAR(50) NOT NULL DEFAULT 'usuario',
        activo BIT NOT NULL DEFAULT 1,
        ultimo_acceso DATETIME2 NULL,
        fecha_creacion DATETIME2 NOT NULL DEFAULT GETDATE(),
        fecha_actualizacion DATETIME2 NOT NULL DEFAULT GETDATE(),
        CHECK (rol IN ('administrador', 'supervisor', 'operador', 'usuario'))
    );

    -- Insertar usuario administrador por defecto
    INSERT INTO usuarios (username, email, nombre, password_hash, rol) VALUES
    ('admin', 'admin@sistema.com', 'Administrador', 'hash_password_admin', 'administrador');

    PRINT '✅ Tabla usuarios creada con usuario administrador por defecto';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla usuarios ya existe';
END
GO

-- ===============================================
-- PROCEDIMIENTOS DE LIMPIEZA DE LOGS
-- ===============================================

-- Procedimiento para limpiar logs antiguos
IF OBJECT_ID('sp_cleanup_old_logs', 'P') IS NOT NULL
DROP PROCEDURE sp_cleanup_old_logs;
GO

CREATE PROCEDURE sp_cleanup_old_logs
AS
BEGIN
    DECLARE @retention_days INT;

    -- Obtener días de retención desde configuración
    SELECT @retention_days = CAST(config_value AS INT)
    FROM configuration
    WHERE config_key = 'log_retention_days';

    -- Valor por defecto si no se encuentra configuración
    IF @retention_days IS NULL
        SET @retention_days = 30;

    -- Eliminar logs antiguos
    DELETE FROM api_logs
    WHERE created_at < DATEADD(DAY, -@retention_days, GETDATE());

    PRINT '✅ Logs antiguos limpiados (retención: ' + CAST(@retention_days AS NVARCHAR(10)) + ' días)';
END
GO

-- ===============================================
-- FUNCIONES DE UTILIDAD
-- ===============================================

-- Función para obtener configuración
IF OBJECT_ID('fn_get_config', 'FN') IS NOT NULL
DROP FUNCTION fn_get_config;
GO

CREATE FUNCTION fn_get_config(@config_key NVARCHAR(100))
RETURNS NVARCHAR(500)
AS
BEGIN
    DECLARE @value NVARCHAR(500);

    SELECT @value = config_value
    FROM configuration
    WHERE config_key = @config_key;

    RETURN @value;
END
GO

-- ===============================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ===============================================

-- Índices para tabla actividades
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('actividades') AND name = 'IX_actividades_fecha_inicio')
BEGIN
    CREATE INDEX IX_actividades_fecha_inicio ON actividades(fecha_inicio);
    PRINT '✅ Índice IX_actividades_fecha_inicio creado';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('actividades') AND name = 'IX_actividades_recurso_fecha')
BEGIN
    CREATE INDEX IX_actividades_recurso_fecha ON actividades(recurso_id, fecha_inicio);
    PRINT '✅ Índice IX_actividades_recurso_fecha creado';
END

-- ===============================================
-- RESUMEN DE CREACIÓN
-- ===============================================
PRINT '';
PRINT '===============================================';
PRINT 'RESUMEN DE CREACIÓN DE BASE DE DATOS';
PRINT '===============================================';
PRINT '✅ Sistema de Gestión de Actividades v0.1.1';
PRINT '✅ Todas las tablas y estructuras creadas';
PRINT '✅ Datos por defecto insertados';
PRINT '✅ Índices optimizados creados';
PRINT '✅ Procedimientos y funciones instalados';
PRINT '===============================================';

-- Mostrar estadísticas finales
SELECT
    'configuration' as tabla,
    COUNT(*) as registros
FROM configuration
UNION ALL
SELECT
    'tipos_actividad' as tabla,
    COUNT(*) as registros
FROM tipos_actividad
UNION ALL
SELECT
    'obras' as tabla,
    COUNT(*) as registros
FROM obras
UNION ALL
SELECT
    'recursos' as tabla,
    COUNT(*) as registros
FROM recursos
UNION ALL
SELECT
    'equipos' as tabla,
    COUNT(*) as registros
FROM equipos
UNION ALL
SELECT
    'actividades' as tabla,
    COUNT(*) as registros
FROM actividades
UNION ALL
SELECT
    'usuarios' as tabla,
    COUNT(*) as registros
FROM usuarios
UNION ALL
SELECT
    'api_logs' as tabla,
    COUNT(*) as registros
FROM api_logs;

PRINT 'Base de datos lista para usar 🚀';