import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGPSFieldsToActividades1700000010 implements MigrationInterface {
    name = 'AddGPSFieldsToActividades1700000010';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if columns already exist before adding them
        const table = await queryRunner.getTable('actividades');
        const hasLatitudInicio = table?.findColumnByName('latitud_inicio');

        if (!hasLatitudInicio) {
            await queryRunner.addColumns('actividades', [
                new TableColumn({
                    name: 'latitud_inicio',
                    type: 'decimal',
                    precision: 10,
                    scale: 7,
                    isNullable: true,
                    comment: 'GPS latitude at activity start (future implementation)'
                }),
                new TableColumn({
                    name: 'longitud_inicio',
                    type: 'decimal',
                    precision: 10,
                    scale: 7,
                    isNullable: true,
                    comment: 'GPS longitude at activity start (future implementation)'
                }),
                new TableColumn({
                    name: 'latitud_fin',
                    type: 'decimal',
                    precision: 10,
                    scale: 7,
                    isNullable: true,
                    comment: 'GPS latitude at activity end (future implementation)'
                }),
                new TableColumn({
                    name: 'longitud_fin',
                    type: 'decimal',
                    precision: 10,
                    scale: 7,
                    isNullable: true,
                    comment: 'GPS longitude at activity end (future implementation)'
                }),
                new TableColumn({
                    name: 'km_recorridos',
                    type: 'decimal',
                    precision: 8,
                    scale: 2,
                    isNullable: true,
                    comment: 'Kilometers traveled during activity (for machinery)'
                })
            ]);

            // Add index for GPS queries (future optimization)
            await queryRunner.query(`
                CREATE INDEX IDX_ACTIVIDAD_GPS_INICIO
                ON actividades(latitud_inicio, longitud_inicio)
                WHERE latitud_inicio IS NOT NULL
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index first
        await queryRunner.query('DROP INDEX IF EXISTS IDX_ACTIVIDAD_GPS_INICIO');

        // Drop GPS columns
        await queryRunner.dropColumns('actividades', [
            'km_recorridos',
            'longitud_fin',
            'latitud_fin',
            'longitud_inicio',
            'latitud_inicio'
        ]);
    }
}