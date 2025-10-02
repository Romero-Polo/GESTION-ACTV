// Script para insertar recursos en SQL Server
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

async function executeSQL(query) {
    try {
        console.log('🔄 Ejecutando SQL:', query.substring(0, 100) + '...');
        const { stdout, stderr } = await execAsync(`sqlcmd -S . -d RP_GESTOR_JORNADAS -Q "${query}" -h -1 -W`);

        if (stderr) {
            console.log('⚠️ SQL Warning:', stderr);
        }

        if (stdout.trim()) {
            // Procesar resultado si hay alguno
            const lines = stdout.trim().split('\n')
                .filter(line => line.trim() && !line.includes('rows affected'))
                .map(line => line.trim());

            if (lines.length > 0) {
                console.log('✅ Resultado SQL:', lines);
                return lines;
            }
        }

        console.log('✅ SQL ejecutado exitosamente');
        return [];

    } catch (error) {
        console.error('❌ Error SQL:', error.message);
        throw new Error(`Error SQL: ${error.message}`);
    }
}

async function insertRecursos() {
    console.log('🚀 Iniciando inserción de recursos en SQL Server...');

    try {
        // Primero verificar los recursos existentes
        console.log('\n📊 Verificando recursos existentes...');
        await executeSQL('SELECT COUNT(*) as total FROM recursos WHERE activo = 1');

        // Insertar operarios
        console.log('\n👤 Insertando operarios...');
        const operarios = [
            "('OP001', 'Juan Pérez', 'operario', 1, 'MANO_OBRA_001')",
            "('OP002', 'María García', 'operario', 1, 'MANO_OBRA_002')",
            "('OP003', 'Carlos López', 'operario', 1, 'MANO_OBRA_003')",
            "('OP004', 'Ana Martínez', 'operario', 1, 'MANO_OBRA_004')",
            "('OP005', 'Pedro Sánchez', 'operario', 1, 'MANO_OBRA_005')",
            "('OP006', 'Laura Fernández', 'operario', 1, 'MANO_OBRA_006')",
            "('OP007', 'Miguel Rodríguez', 'operario', 1, 'MANO_OBRA_007')",
            "('OP008', 'Elena Jiménez', 'operario', 1, 'MANO_OBRA_008')",
            "('OP009', 'José Morales', 'operario', 1, 'MANO_OBRA_009')",
            "('OP010', 'Carmen Ruiz', 'operario', 1, 'MANO_OBRA_010')",
            "('OP011', 'Francisco Torres', 'operario', 1, 'MANO_OBRA_011')",
            "('OP012', 'Isabel Vargas', 'operario', 1, 'MANO_OBRA_012')"
        ];

        const sqlOperarios = `INSERT INTO recursos (codigo, nombre, tipo, activo, agrCoste) VALUES ${operarios.join(', ')}`;
        await executeSQL(sqlOperarios);

        // Insertar máquinas
        console.log('\n🚜 Insertando maquinaria...');
        const maquinas = [
            "('MAQ001', 'Excavadora CAT 320', 'maquina', 1, 'MAQUINA_001')",
            "('MAQ002', 'Camión Volquete MAN', 'maquina', 1, 'MAQUINA_002')",
            "('MAQ003', 'Retroexcavadora JCB 3CX', 'maquina', 1, 'MAQUINA_003')",
            "('MAQ004', 'Compactadora BOMAG BW213', 'maquina', 1, 'MAQUINA_004')",
            "('MAQ005', 'Grúa Torre POTAIN MC85', 'maquina', 1, 'MAQUINA_005')",
            "('MAQ006', 'Hormigonera LIEBHERR', 'maquina', 1, 'MAQUINA_006')",
            "('MAQ007', 'Bulldozer CAT D6', 'maquina', 1, 'MAQUINA_007')"
        ];

        const sqlMaquinas = `INSERT INTO recursos (codigo, nombre, tipo, activo, agrCoste) VALUES ${maquinas.join(', ')}`;
        await executeSQL(sqlMaquinas);

        // Verificar inserción final
        console.log('\n📋 Verificando inserción final...');
        await executeSQL('SELECT COUNT(*) as total_recursos FROM recursos WHERE activo = 1');
        await executeSQL('SELECT tipo, COUNT(*) as cantidad FROM recursos WHERE activo = 1 GROUP BY tipo');

        console.log('\n✅ ¡Recursos insertados exitosamente en SQL Server!');
        console.log('\n📊 Resumen:');
        console.log('- 12 operarios insertados');
        console.log('- 7 máquinas insertadas');
        console.log('- Total: 19 recursos');

    } catch (error) {
        console.error('\n❌ Error durante la inserción:', error.message);
    }
}

// Ejecutar
insertRecursos();