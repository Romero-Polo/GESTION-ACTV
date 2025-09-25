import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialTables1640000000000 implements MigrationInterface {
  name = 'CreateInitialTables1640000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create usuarios table
    await queryRunner.query(`
      CREATE TABLE [usuarios] (
        [id] int IDENTITY(1,1) NOT NULL,
        [email] nvarchar(255) NOT NULL,
        [nombre] nvarchar(255) NOT NULL,
        [rol] nvarchar(20) NOT NULL DEFAULT 'operario',
        [activo] bit NOT NULL DEFAULT 1,
        [fecha_creacion] datetime2 NOT NULL DEFAULT getdate(),
        CONSTRAINT [PK_usuarios] PRIMARY KEY ([id]),
        CONSTRAINT [UQ_usuarios_email] UNIQUE ([email]),
        CONSTRAINT [CK_usuarios_rol] CHECK ([rol] IN ('operario', 'jefe_equipo', 'tecnico_transporte', 'administrador'))
      )
    `);

    // Create obras table
    await queryRunner.query(`
      CREATE TABLE [obras] (
        [id] int IDENTITY(1,1) NOT NULL,
        [codigo] nvarchar(50) NOT NULL,
        [descripcion] nvarchar(500) NOT NULL,
        [observaciones] ntext NULL,
        [activo] bit NOT NULL DEFAULT 1,
        [fecha_creacion] datetime2 NOT NULL DEFAULT getdate(),
        [fecha_actualizacion] datetime2 NOT NULL DEFAULT getdate(),
        CONSTRAINT [PK_obras] PRIMARY KEY ([id]),
        CONSTRAINT [UQ_obras_codigo] UNIQUE ([codigo])
      )
    `);

    // Create recursos table
    await queryRunner.query(`
      CREATE TABLE [recursos] (
        [id] int IDENTITY(1,1) NOT NULL,
        [codigo] nvarchar(50) NOT NULL,
        [nombre] nvarchar(255) NOT NULL,
        [tipo] nvarchar(20) NOT NULL,
        [activo] bit NOT NULL DEFAULT 1,
        [agrCoste] nvarchar(100) NOT NULL,
        [fecha_creacion] datetime2 NOT NULL DEFAULT getdate(),
        CONSTRAINT [PK_recursos] PRIMARY KEY ([id]),
        CONSTRAINT [UQ_recursos_codigo] UNIQUE ([codigo]),
        CONSTRAINT [CK_recursos_tipo] CHECK ([tipo] IN ('operario', 'maquina'))
      )
    `);

    // Create tipos_actividad table
    await queryRunner.query(`
      CREATE TABLE [tipos_actividad] (
        [id] int IDENTITY(1,1) NOT NULL,
        [codigo] nvarchar(20) NOT NULL,
        [nombre] nvarchar(255) NOT NULL,
        [descripcion] ntext NULL,
        [fecha_creacion] datetime2 NOT NULL DEFAULT getdate(),
        CONSTRAINT [PK_tipos_actividad] PRIMARY KEY ([id]),
        CONSTRAINT [UQ_tipos_actividad_codigo] UNIQUE ([codigo])
      )
    `);

    // Create actividades table
    await queryRunner.query(`
      CREATE TABLE [actividades] (
        [id] int IDENTITY(1,1) NOT NULL,
        [obra_id] int NOT NULL,
        [recurso_id] int NOT NULL,
        [tipo_actividad_id] int NOT NULL,
        [fecha_inicio] date NOT NULL,
        [hora_inicio] time NOT NULL,
        [fecha_fin] date NULL,
        [hora_fin] time NULL,
        [observaciones] ntext NULL,
        [usuario_creacion] int NOT NULL,
        [fecha_creacion] datetime2 NOT NULL DEFAULT getdate(),
        [usuario_modificacion] int NULL,
        [fecha_modificacion] datetime2 NOT NULL DEFAULT getdate(),
        [latitud_inicio] decimal(10,7) NULL,
        [longitud_inicio] decimal(10,7) NULL,
        [latitud_fin] decimal(10,7) NULL,
        [longitud_fin] decimal(10,7) NULL,
        [km_recorridos] decimal(8,2) NULL,
        CONSTRAINT [PK_actividades] PRIMARY KEY ([id])
      )
    `);

    // Create foreign keys
    await queryRunner.query(`
      ALTER TABLE [actividades]
      ADD CONSTRAINT [FK_actividades_obra]
      FOREIGN KEY ([obra_id]) REFERENCES [obras]([id])
    `);

    await queryRunner.query(`
      ALTER TABLE [actividades]
      ADD CONSTRAINT [FK_actividades_recurso]
      FOREIGN KEY ([recurso_id]) REFERENCES [recursos]([id])
    `);

    await queryRunner.query(`
      ALTER TABLE [actividades]
      ADD CONSTRAINT [FK_actividades_tipo]
      FOREIGN KEY ([tipo_actividad_id]) REFERENCES [tipos_actividad]([id])
    `);

    await queryRunner.query(`
      ALTER TABLE [actividades]
      ADD CONSTRAINT [FK_actividades_usuario_creacion]
      FOREIGN KEY ([usuario_creacion]) REFERENCES [usuarios]([id])
    `);

    await queryRunner.query(`
      ALTER TABLE [actividades]
      ADD CONSTRAINT [FK_actividades_usuario_modificacion]
      FOREIGN KEY ([usuario_modificacion]) REFERENCES [usuarios]([id])
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX [IDX_OBRA_CODIGO] ON [obras] ([codigo])
    `);

    await queryRunner.query(`
      CREATE INDEX [IDX_RECURSO_CODIGO] ON [recursos] ([codigo])
    `);

    await queryRunner.query(`
      CREATE INDEX [IDX_TIPO_ACTIVIDAD_CODIGO] ON [tipos_actividad] ([codigo])
    `);

    await queryRunner.query(`
      CREATE INDEX [IDX_ACTIVIDAD_RECURSO_FECHA] ON [actividades] ([recurso_id], [fecha_inicio], [hora_inicio])
    `);

    await queryRunner.query(`
      CREATE INDEX [IDX_ACTIVIDAD_OBRA_FECHA] ON [actividades] ([obra_id], [fecha_inicio])
    `);

    console.log('Initial tables created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order due to foreign keys
    await queryRunner.query(`DROP TABLE [actividades]`);
    await queryRunner.query(`DROP TABLE [tipos_actividad]`);
    await queryRunner.query(`DROP TABLE [recursos]`);
    await queryRunner.query(`DROP TABLE [obras]`);
    await queryRunner.query(`DROP TABLE [usuarios]`);

    console.log('Initial tables dropped successfully');
  }
}