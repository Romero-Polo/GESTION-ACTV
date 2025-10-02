import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1700000011 implements MigrationInterface {
    name = 'AddPerformanceIndexes1700000011';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Export-related indexes
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_EXPORT_LOG_USER_DATE
            ON export_logs(usuarioId, fecha_creacion)
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_EXPORT_LOG_STATUS_FORMAT
            ON export_logs(status, format)
            WHERE status = 'completed'
        `);

        // Activity performance indexes
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_ACTIVIDAD_FECHA_OBRA_RECURSO
            ON actividades(fecha_inicio, obra_id, recurso_id)
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_ACTIVIDAD_USER_FECHA
            ON actividades(usuario_creacion, fecha_inicio)
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_ACTIVIDAD_RECURSO_TIPO_FECHA
            ON actividades(recurso_id, tipo_actividad_id, fecha_inicio)
        `);

        // Sync-related indexes
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_SYNC_LOG_TYPE_STATUS_DATE
            ON sync_logs(type, status, fecha_creacion)
        `);

        // Resource and work indexes for filtering
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_OBRA_ACTIVO_CODIGO
            ON obras(activo, codigo)
            WHERE activo = true
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_RECURSO_ACTIVO_TIPO
            ON recursos(activo, tipo)
            WHERE activo = true
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_RECURSO_EMPRESA_TIPO
            ON recursos(empresa, tipo)
            WHERE empresa IS NOT NULL
        `);

        // Dashboard performance indexes
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_ACTIVIDAD_FECHA_STATUS
            ON actividades(fecha_inicio, fecha_fin, hora_fin)
            WHERE fecha_fin IS NULL OR hora_fin IS NULL
        `);

        // User activity tracking
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_USUARIO_ACTIVO_ROL
            ON usuarios(activo, rol)
            WHERE activo = true
        `);

        // Composite index for export queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_ACTIVIDAD_EXPORT_COMPOSITE
            ON actividades(fecha_inicio, recurso_id, obra_id)
            INCLUDE (tipo_actividad_id, hora_inicio, fecha_fin, hora_fin, km_recorridos)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop performance indexes
        await queryRunner.query('DROP INDEX IF EXISTS IDX_ACTIVIDAD_EXPORT_COMPOSITE');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_USUARIO_ACTIVO_ROL');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_ACTIVIDAD_FECHA_STATUS');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_RECURSO_EMPRESA_TIPO');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_RECURSO_ACTIVO_TIPO');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_OBRA_ACTIVO_CODIGO');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_SYNC_LOG_TYPE_STATUS_DATE');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_ACTIVIDAD_RECURSO_TIPO_FECHA');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_ACTIVIDAD_USER_FECHA');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_ACTIVIDAD_FECHA_OBRA_RECURSO');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_EXPORT_LOG_STATUS_FORMAT');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_EXPORT_LOG_USER_DATE');
    }
}