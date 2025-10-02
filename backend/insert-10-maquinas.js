// Script para insertar 10 máquinas nuevas via API
const http = require('http');

const API_BASE = 'http://localhost:3002';

// 10 máquinas nuevas a insertar
const nuevasMaquinas = [
    { codigo: 'MAQ008', nombre: 'Pala Cargadora CAT 950', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_008' },
    { codigo: 'MAQ009', nombre: 'Dumper AUSA D600', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_009' },
    { codigo: 'MAQ010', nombre: 'Martillo Hidráulico ATLAS COPCO', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_010' },
    { codigo: 'MAQ011', nombre: 'Camión Grúa LIEBHERR LTM 1030', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_011' },
    { codigo: 'MAQ012', nombre: 'Plataforma Elevadora JLG 2630', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_012' },
    { codigo: 'MAQ013', nombre: 'Fresadora WIRTGEN W120', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_013' },
    { codigo: 'MAQ014', nombre: 'Pavimentadora VOLVO ABG2820', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_014' },
    { codigo: 'MAQ015', nombre: 'Motoniveladora CAT 140M', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_015' },
    { codigo: 'MAQ016', nombre: 'Equipo de Soldadura MILLER', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_016' },
    { codigo: 'MAQ017', nombre: 'Generador CATERPILLAR 100KW', tipo: 'maquina', activo: true, agrCoste: 'MAQUINA_017' }
];

function postRecurso(recurso) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(recurso);

        const options = {
            hostname: 'localhost',
            port: 3002,
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

async function insertarNuevasMaquinas() {
    console.log('🚜 Iniciando inserción de 10 máquinas nuevas via API...');
    console.log(`📊 Total máquinas a insertar: ${nuevasMaquinas.length}`);

    let exitosos = 0;
    let errores = 0;

    for (const maquina of nuevasMaquinas) {
        try {
            await postRecurso(maquina);
            exitosos++;
        } catch (error) {
            errores++;
            // Continuar con la siguiente máquina
        }

        // Pequeña pausa entre requests
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n📋 Resumen de inserción:');
    console.log(`✅ Exitosos: ${exitosos}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📊 Total: ${nuevasMaquinas.length}`);

    if (exitosos > 0) {
        console.log('\n🎯 Máquinas insertadas correctamente. Ahora verificando...');

        // Verificar recursos insertados
        setTimeout(() => {
            const options = {
                hostname: 'localhost',
                port: 3002,
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

                        console.log('\n🚜 Máquinas en base de datos:');
                        maquinas.forEach(m => {
                            console.log(`  - ${m.codigo}: ${m.nombre}`);
                        });

                        console.log('\n🎉 ¡Inserción de máquinas completada exitosamente!');
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
insertarNuevasMaquinas();