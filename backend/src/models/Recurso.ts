import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, Index } from 'typeorm';
import { IsNotEmpty, IsEnum, IsBoolean, Length, IsOptional } from 'class-validator';
import { Actividad } from './Actividad';

export enum TipoRecurso {
  OPERARIO = 'operario',
  MAQUINA = 'maquina'
}

@Entity('recursos')
export class Recurso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  @IsNotEmpty()
  @Length(1, 50)
  @Index('IDX_RECURSO_CODIGO')
  codigo: string;

  @Column({ type: 'varchar', length: 255 })
  @IsNotEmpty()
  @Length(1, 255)
  nombre: string;

  @Column({
    type: 'varchar',
    enum: TipoRecurso
  })
  @IsEnum(TipoRecurso)
  tipo: TipoRecurso;

  @Column({ type: 'bit', default: true })
  @IsBoolean()
  activo: boolean;

  @Column({ type: 'varchar', length: 100 })
  @IsNotEmpty()
  @Length(1, 100)
  agrCoste: string;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  // Relations
  @OneToMany(() => Actividad, actividad => actividad.recurso)
  actividades: Actividad[];

  constructor(partial: Partial<Recurso>) {
    Object.assign(this, partial);
  }

  // Methods
  public static createFromExternal(externalData: any): Recurso {
    return new Recurso({
      codigo: externalData.codigo,
      nombre: externalData.nombre,
      tipo: externalData.tipo === 'maquina' ? TipoRecurso.MAQUINA : TipoRecurso.OPERARIO,
      agrCoste: externalData.agr_coste || externalData.agrCoste,
      activo: externalData.activo !== false
    });
  }

  public canBeDeactivated(): boolean {
    // Logic will be implemented when we have activity checking
    return true;
  }

  public isOperario(): boolean {
    return this.tipo === TipoRecurso.OPERARIO;
  }

  public isMaquina(): boolean {
    return this.tipo === TipoRecurso.MAQUINA;
  }

  public getDisplayName(): string {
    return `${this.codigo} - ${this.nombre}`;
  }
}