import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { IsNotEmpty, IsOptional, IsBoolean, Length } from 'class-validator';
import { Actividad } from './Actividad';

@Entity('obras')
export class Obra {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  @IsNotEmpty()
  @Length(1, 50)
  @Index('IDX_OBRA_CODIGO')
  codigo: string;

  @Column({ type: 'varchar', length: 500 })
  @IsNotEmpty()
  @Length(1, 500)
  descripcion: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  observaciones?: string;

  @Column({ type: 'bit', default: true })
  @IsBoolean()
  activo: boolean;

  // Sync-related fields
  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  externalId?: string;

  @Column({ type: 'datetime', nullable: true })
  @IsOptional()
  fechaInicio?: Date;

  @Column({ type: 'datetime', nullable: true })
  @IsOptional()
  fechaFin?: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  @IsOptional()
  cliente?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  ubicacion?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  @IsOptional()
  presupuesto?: number;

  @Column({ type: 'bit', default: true })
  @IsBoolean()
  activa: boolean; // External active status

  @Column({ type: 'datetime', nullable: true })
  @IsOptional()
  lastSyncDate?: Date;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  fechaActualizacion: Date;

  // Relations
  @OneToMany(() => Actividad, actividad => actividad.obra)
  actividades: Actividad[];

  constructor(partial: Partial<Obra>) {
    Object.assign(this, partial);
  }

  // Methods
  public static createFromExternal(externalData: any): Obra {
    return new Obra({
      codigo: externalData.codigo,
      descripcion: externalData.descripcion,
      observaciones: externalData.observaciones,
      activo: externalData.activo !== false
    });
  }

  public canBeDeactivated(): boolean {
    // Logic will be implemented when we have activity checking
    return true;
  }
}