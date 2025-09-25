import { AppDataSource } from '../utils/database';
import { Usuario, RolUsuario } from '../models/Usuario';
import { Obra } from '../models/Obra';
import { Recurso, TipoRecurso } from '../models/Recurso';
import { TipoActividad } from '../models/TipoActividad';

export class InitialDataSeeder {
  public static async run(): Promise<void> {
    console.log('Running initial data seeder...');

    try {
      // Seed usuarios
      await this.seedUsuarios();

      // Seed tipos de actividad
      await this.seedTiposActividad();

      // Seed obras de ejemplo
      await this.seedObras();

      // Seed recursos de ejemplo
      await this.seedRecursos();

      console.log('Initial data seeded successfully');
    } catch (error) {
      console.error('Error seeding initial data:', error);
      throw error;
    }
  }

  private static async seedUsuarios(): Promise<void> {
    const usuarioRepository = AppDataSource.getRepository(Usuario);

    const usuarios = [
      new Usuario({
        email: 'admin@empresa.com',
        nombre: 'Administrador Sistema',
        rol: RolUsuario.ADMINISTRADOR,
        activo: true
      }),
      new Usuario({
        email: 'jefe1@empresa.com',
        nombre: 'Juan García - Jefe de Equipo',
        rol: RolUsuario.JEFE_EQUIPO,
        activo: true
      }),
      new Usuario({
        email: 'tecnico1@empresa.com',
        nombre: 'María López - Técnico Transporte',
        rol: RolUsuario.TECNICO_TRANSPORTE,
        activo: true
      }),
      new Usuario({
        email: 'operario1@empresa.com',
        nombre: 'Carlos Ruiz - Operario',
        rol: RolUsuario.OPERARIO,
        activo: true
      }),
      new Usuario({
        email: 'operario2@empresa.com',
        nombre: 'Ana Martín - Operario',
        rol: RolUsuario.OPERARIO,
        activo: true
      })
    ];

    for (const usuario of usuarios) {
      const exists = await usuarioRepository.findOne({ where: { email: usuario.email } });
      if (!exists) {
        await usuarioRepository.save(usuario);
        console.log(`Usuario creado: ${usuario.email}`);
      }
    }
  }

  private static async seedTiposActividad(): Promise<void> {
    const tipoActividadRepository = AppDataSource.getRepository(TipoActividad);

    const tipos = TipoActividad.getDefaultTypes();

    for (const tipoData of tipos) {
      const exists = await tipoActividadRepository.findOne({
        where: { codigo: tipoData.codigo }
      });

      if (!exists) {
        const tipo = new TipoActividad(tipoData);
        await tipoActividadRepository.save(tipo);
        console.log(`Tipo de actividad creado: ${tipo.codigo}`);
      }
    }
  }

  private static async seedObras(): Promise<void> {
    const obraRepository = AppDataSource.getRepository(Obra);

    const obras = [
      new Obra({
        codigo: 'OB001',
        descripcion: 'Construcción Edificio Residencial Torre Norte',
        observaciones: 'Proyecto de 20 plantas con parking subterráneo',
        activo: true
      }),
      new Obra({
        codigo: 'OB002',
        descripcion: 'Rehabilitación Carretera Nacional 340',
        observaciones: 'Tramo de 15 km entre Málaga y Torremolinos',
        activo: true
      }),
      new Obra({
        codigo: 'OB003',
        descripcion: 'Ampliación Centro Comercial Plaza Mayor',
        observaciones: 'Nueva ala comercial de 5000 m²',
        activo: true
      }),
      new Obra({
        codigo: 'OB004',
        descripcion: 'Construcción Puente sobre río Guadalquivir',
        observaciones: 'Puente de 200m de longitud',
        activo: true
      }),
      new Obra({
        codigo: 'OB005',
        descripcion: 'Urbanización Las Palmeras',
        observaciones: 'Desarrollo urbano de 150 viviendas',
        activo: false // Example of inactive work
      })
    ];

    for (const obra of obras) {
      const exists = await obraRepository.findOne({ where: { codigo: obra.codigo } });
      if (!exists) {
        await obraRepository.save(obra);
        console.log(`Obra creada: ${obra.codigo}`);
      }
    }
  }

  private static async seedRecursos(): Promise<void> {
    const recursoRepository = AppDataSource.getRepository(Recurso);

    const recursos = [
      // Operarios
      new Recurso({
        codigo: 'OP001',
        nombre: 'Juan Pérez González',
        tipo: TipoRecurso.OPERARIO,
        agrCoste: 'MANO_OBRA_DIRECTA',
        activo: true
      }),
      new Recurso({
        codigo: 'OP002',
        nombre: 'María Rodríguez Silva',
        tipo: TipoRecurso.OPERARIO,
        agrCoste: 'MANO_OBRA_DIRECTA',
        activo: true
      }),
      new Recurso({
        codigo: 'OP003',
        nombre: 'Carlos Jiménez Torres',
        tipo: TipoRecurso.OPERARIO,
        agrCoste: 'MANO_OBRA_ESPECIALIZADA',
        activo: true
      }),
      new Recurso({
        codigo: 'OP004',
        nombre: 'Laura Fernández Ruiz',
        tipo: TipoRecurso.OPERARIO,
        agrCoste: 'MANO_OBRA_DIRECTA',
        activo: true
      }),
      new Recurso({
        codigo: 'OP005',
        nombre: 'Miguel Ángel Santos',
        tipo: TipoRecurso.OPERARIO,
        agrCoste: 'MANO_OBRA_ESPECIALIZADA',
        activo: false // Example of inactive worker
      }),

      // Máquinas
      new Recurso({
        codigo: 'EX001',
        nombre: 'Excavadora Caterpillar 320D',
        tipo: TipoRecurso.MAQUINA,
        agrCoste: 'MAQUINARIA_PESADA',
        activo: true
      }),
      new Recurso({
        codigo: 'DU001',
        nombre: 'Dumper Volvo A30G',
        tipo: TipoRecurso.MAQUINA,
        agrCoste: 'MAQUINARIA_TRANSPORTE',
        activo: true
      }),
      new Recurso({
        codigo: 'GR001',
        nombre: 'Grúa Torre Liebherr 280EC-H',
        tipo: TipoRecurso.MAQUINA,
        agrCoste: 'MAQUINARIA_ELEVACION',
        activo: true
      }),
      new Recurso({
        codigo: 'CO001',
        nombre: 'Compactadora Bomag BW213D',
        tipo: TipoRecurso.MAQUINA,
        agrCoste: 'MAQUINARIA_COMPACTACION',
        activo: true
      }),
      new Recurso({
        codigo: 'FR001',
        nombre: 'Fresadora Wirtgen W100F',
        tipo: TipoRecurso.MAQUINA,
        agrCoste: 'MAQUINARIA_FRESADO',
        activo: true
      })
    ];

    for (const recurso of recursos) {
      const exists = await recursoRepository.findOne({ where: { codigo: recurso.codigo } });
      if (!exists) {
        await recursoRepository.save(recurso);
        console.log(`Recurso creado: ${recurso.codigo} - ${recurso.nombre}`);
      }
    }
  }

  public static async runIfEmpty(): Promise<void> {
    const usuarioRepository = AppDataSource.getRepository(Usuario);
    const userCount = await usuarioRepository.count();

    if (userCount === 0) {
      console.log('Database is empty, running initial seeder...');
      await this.run();
    } else {
      console.log('Database already has data, skipping initial seeder');
    }
  }
}