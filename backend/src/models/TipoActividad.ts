import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, Index } from 'typeorm';
import { IsNotEmpty, Length, IsOptional } from 'class-validator';
import { Actividad } from './Actividad';

@Entity('tipos_actividad')
export class TipoActividad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  @IsNotEmpty()
  @Length(1, 20)
  @Index('IDX_TIPO_ACTIVIDAD_CODIGO')
  codigo: string;

  @Column({ type: 'varchar', length: 255 })
  @IsNotEmpty()
  @Length(1, 255)
  nombre: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  descripcion?: string;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  // Relations
  @OneToMany(() => Actividad, actividad => actividad.tipoActividad)
  actividades: Actividad[];

  constructor(partial: Partial<TipoActividad>) {
    Object.assign(this, partial);
  }

  // Methods
  public getDisplayName(): string {
    return `${this.codigo} - ${this.nombre}`;
  }

  public static getDefaultTypes(): Partial<TipoActividad>[] {
    return [
      {
        codigo: 'TRANSP',
        nombre: 'Transporte',
        descripcion: 'Actividades de transporte de materiales y equipos'
      },
      {
        codigo: 'EXTEND',
        nombre: 'Extendido',
        descripcion: 'Actividades de extendido de materiales'
      },
      {
        codigo: 'FRESADO',
        nombre: 'Fresado',
        descripcion: 'Actividades de fresado de superficies'
      },
      {
        codigo: 'COMPAC',
        nombre: 'Compactación',
        descripcion: 'Actividades de compactación de materiales'
      },
      {
        codigo: 'MANT',
        nombre: 'Mantenimiento',
        descripcion: 'Actividades de mantenimiento de equipos'
      }
    ];
  }
}