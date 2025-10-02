// Script para insertar recursos via API
const http = require('http');

const API_BASE = 'http://localhost:3001';

// Recursos a insertar
const recursos = [
    // Operarios
    { codigo: 'OP001', nombre: 'Juan Pérez', tipo: 'operario', activo: true, agrCoste: 'MANO_OBRA_001' },
    { codigo: 'OP002', nombre: 'María García', tipo: 'operario', activo: true, agrCoste: 'MANO_OBRA_002' },
    { codigo: 'OP003', nombre: 'Carlos López', tipo: 'operario', activo: true, agrCoste: 'MANO_OBRA_003' },
    { codigo: 'OP004', nombre: 'Ana Martínez', tipo: 'operario', activo: true, agrCoste: 'MANO_OBRA_004' },
    { codigo: 'OP005', nombre: 'Pedro Sánchez', tipo: 'operario', activo: true, agrCoste: 'MANO_OBRA_005' },
    { codigo: 'OP006', nombre: 'Laura Fernández', tipo: 'operario', activo: true, agrCoste: 'MANO_OBRA_006' },
    { codigo: 'OP007', nombre: 'Miguel Rodríguez', tipo: 'operario', activo: true, agrCoste: 'MANO_OBRA_007' },
    { codigo: 'OP008', nombre: 'Elena Jiménez', tipo: 'operario', activo: true, agrCoste: 'MANO_OBRA_008' },
    { codigo: 'OP009', nombre: 'José Morales', tipo: 'operario', activo: true, agrCoste: 'MANO_OBRA_009' },
    { codigo: 'OP010', nombre: 'Carmen Ruiz', tipo: 'operario', activo: true, agrCoste: 'MANO_OBRA_010' },
    { codigo: 'OP011', nombre: 'Francisco Torres', tipo: 'operario', activo: true, agrCoste: 'MANO_OBRA_011' },
    { codigo: 'OP012', nombre: 'Isabel Vargas', tipo: 'operario', activo: true, agrCoste: 'MANO_OBRA_012' },

    // Máquinas
    { codigo: 'MAQ001', nombre: 'Excavadora CAT 320', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_001' },
    { codigo: 'MAQ002', nombre: 'Camión Volquete MAN', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_002' },
    { codigo: 'MAQ003', nombre: 'Retroexcavadora JCB 3CX', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_003' },
    { codigo: 'MAQ004', nombre: 'Compactadora BOMAG BW213', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_004' },
    { codigo: 'MAQ005', nombre: 'Grúa Torre POTAIN MC85', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_005' },
    { codigo: 'MAQ006', nombre: 'Hormigonera LIEBHERR', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_006' },
    { codigo: 'MAQ007', nombre: 'Bulldozer CAT D6', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_007' }
];

function postRecurso(recurso) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(recurso);

        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/recursos',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`✅ ${recurso.codigo} - ${recurso.nombre} insertado`);
                    resolve(JSON.parse(body));
                } else {
                    console.log(`❌ Error ${recurso.codigo}: ${body}`);
                    reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', (err) => {
            console.log(`❌ Error conexión ${recurso.codigo}: ${err.message}`);
            reject(err);
        });

        req.write(data);
        req.end();
    });
}

async function insertarTodosLosRecursos() {
    console.log('🚀 Iniciando inserción de recursos via API...');
    console.log(`📊 Total recursos a insertar: ${recursos.length}`);

    let exitosos = 0;
    let errores = 0;

    for (const recurso of recursos) {
        try {
            await postRecurso(recurso);
            exitosos++;
        } catch (error) {
            errores++;
            // Continuar con el siguiente recurso
        }

        // Pequeña pausa entre requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📋 Resumen de inserción:');
    console.log(`✅ Exitosos: ${exitosos}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📊 Total: ${recursos.length}`);

    if (exitosos > 0) {
        console.log('\n🎯 Recursos insertados correctamente. Ahora verificando...');

        // Verificar recursos insertados
        setTimeout(() => {
            const options = {
                hostname: 'localhost',
                port: 3001,
                path: '/recursos',
                method: 'GET'
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => {
                    body += chunk;
                });
                res.on('end', () => {
                    try {
                        const recursos = JSON.parse(body);
                        console.log(`\n📊 Total recursos en base de datos: ${recursos.length}`);

                        const operarios = recursos.filter(r => r.tipo === 'operario');
                        const maquinas = recursos.filter(r => r.tipo === 'maquina');

                        console.log(`👤 Operarios: ${operarios.length}`);
                        console.log(`🚜 Máquinas: ${maquinas.length}`);

                        if (recursos.length >= 15) {
                            console.log('\n🎉 ¡Inserción completada exitosamente!');
                        }
                    } catch (error) {
                        console.log('❌ Error al verificar recursos:', error.message);
                    }
                });
            });

            req.on('error', (err) => {
                console.log('❌ Error al verificar:', err.message);
            });

            req.end();
        }, 1000);
    }
}

// Ejecutar
insertarTodosLosRecursos();