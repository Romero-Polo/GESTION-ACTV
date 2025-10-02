-- Script SQL para insertar recursos de prueba
-- Base de datos: RP_GESTOR_JORNADAS
-- Tabla: recursos

USE RP_GESTOR_JORNADAS;
GO

-- Verificar recursos existentes antes de insertar
SELECT 'ANTES DE INSERTAR:' as Estado, COUNT(*) as Total_Recursos FROM recursos WHERE activo = 1;
GO

-- Insertar operarios (12 personas)
INSERT INTO recursos (codigo, nombre, tipo, activo, agrCoste) VALUES
('OP001', 'Juan Pérez', 'operario', 1, 'MANO_OBRA_001'),
('OP002', 'María García', 'operario', 1, 'MANO_OBRA_002'),
('OP003', 'Carlos López', 'operario', 1, 'MANO_OBRA_003'),
('OP004', 'Ana Martínez', 'operario', 1, 'MANO_OBRA_004'),
('OP005', 'Pedro Sánchez', 'operario', 1, 'MANO_OBRA_005'),
('OP006', 'Laura Fernández', 'operario', 1, 'MANO_OBRA_006'),
('OP007', 'Miguel Rodríguez', 'operario', 1, 'MANO_OBRA_007'),
('OP008', 'Elena Jiménez', 'operario', 1, 'MANO_OBRA_008'),
('OP009', 'José Morales', 'operario', 1, 'MANO_OBRA_009'),
('OP010', 'Carmen Ruiz', 'operario', 1, 'MANO_OBRA_010'),
('OP011', 'Francisco Torres', 'operario', 1, 'MANO_OBRA_011'),
('OP012', 'Isabel Vargas', 'operario', 1, 'MANO_OBRA_012');
GO

PRINT '✅ 12 operarios insertados correctamente';
GO

-- Insertar maquinaria (7 máquinas)
INSERT INTO recursos (codigo, nombre, tipo, activo, agrCoste) VALUES
('MAQ001', 'Excavadora CAT 320', 'maquina', 1, 'MAQUINA_001'),
('MAQ002', 'Camión Volquete MAN', 'maquina', 1, 'MAQUINA_002'),
('MAQ003', 'Retroexcavadora JCB 3CX', 'maquina', 1, 'MAQUINA_003'),
('MAQ004', 'Compactadora BOMAG BW213', 'maquina', 1, 'MAQUINA_004'),
('MAQ005', 'Grúa Torre POTAIN MC85', 'maquina', 1, 'MAQUINA_005'),
('MAQ006', 'Hormigonera LIEBHERR', 'maquina', 1, 'MAQUINA_006'),
('MAQ007', 'Bulldozer CAT D6', 'maquina', 1, 'MAQUINA_007');
GO

PRINT '✅ 7 máquinas insertadas correctamente';
GO

-- Verificar inserción final
SELECT 'DESPUÉS DE INSERTAR:' as Estado, COUNT(*) as Total_Recursos FROM recursos WHERE activo = 1;
GO

-- Mostrar resumen por tipo
SELECT
    tipo as Tipo_Recurso,
    COUNT(*) as Cantidad
FROM recursos
WHERE activo = 1
GROUP BY tipo
ORDER BY tipo;
GO

-- Mostrar todos los recursos insertados
SELECT
    id as ID,
    codigo as Código,
    nombre as Nombre,
    tipo as Tipo,
    agrCoste as Agrupación_Coste
FROM recursos
WHERE activo = 1
ORDER BY tipo, codigo;
GO

PRINT '🎯 Inserción de recursos completada exitosamente';
PRINT '📊 Total: 19 recursos (12 operarios + 7 máquinas)';
GO