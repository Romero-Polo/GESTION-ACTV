import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsDateString, IsInt } from 'class-validator';
import { Obra } from './Obra';
import { Recurso } from './Recurso';
import { TipoActividad } from './TipoActividad';
import { Usuario } from './Usuario';

@Entity('actividades')
@Index(['recurso', 'fechaInicio', 'horaInicio'], { name: 'IDX_ACTIVIDAD_RECURSO_FECHA' })
@Index(['obra', 'fechaInicio'], { name: 'IDX_ACTIVIDAD_OBRA_FECHA' })
export class Actividad {
  @PrimaryGeneratedColumn()
  id: number;

  // Relations
  @ManyToOne(() => Obra, obra => obra.actividades, {
    eager: true,
    onDelete: 'RESTRICT'
  })
  @JoinColumn({ name: 'obra_id' })
  obra: Obra;

  @Column({ name: 'obra_id' })
  @IsInt()
  obraId: number;

  @ManyToOne(() => Recurso, recurso => recurso.actividades, {
    eager: true,
    onDelete: 'RESTRICT'
  })
  @JoinColumn({ name: 'recurso_id' })
  recurso: Recurso;

  @Column({ name: 'recurso_id' })
  @IsInt()
  recursoId: number;

  @ManyToOne(() => TipoActividad, tipoActividad => tipoActividad.actividades, {
    eager: true,
    onDelete: 'RESTRICT'
  })
  @JoinColumn({ name: 'tipo_actividad_id' })
  tipoActividad: TipoActividad;

  @Column({ name: 'tipo_actividad_id' })
  @IsInt()
  tipoActividadId: number;

  // Temporal fields
  @Column({ type: 'date', name: 'fecha_inicio' })
  @IsNotEmpty()
  @IsDateString()
  fechaInicio: string;

  @Column({ type: 'time', name: 'hora_inicio' })
  @IsNotEmpty()
  horaInicio: string;

  @Column({ type: 'date', name: 'fecha_fin', nullable: true })
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @Column({ type: 'time', name: 'hora_fin', nullable: true })
  @IsOptional()
  horaFin?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  observaciones?: string;

  // Audit fields
  @ManyToOne(() => Usuario, usuario => usuario.actividadesCreadas, {
    onDelete: 'RESTRICT'
  })
  @JoinColumn({ name: 'usuario_creacion' })
  usuarioCreacion: Usuario;

  @Column({ name: 'usuario_creacion' })
  usuarioCreacionId: number;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @ManyToOne(() => Usuario, usuario => usuario.actividadesModificadas, {
    nullable: true,
    onDelete: 'RESTRICT'
  })
  @JoinColumn({ name: 'usuario_modificacion' })
  usuarioModificacion?: Usuario;

  @Column({ name: 'usuario_modificacion', nullable: true })
  usuarioModificacionId?: number;

  @UpdateDateColumn({ name: 'fecha_modificacion' })
  fechaModificacion: Date;

  // Future GPS fields (prepared for future implementation)
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'latitud_inicio' })
  latitudInicio?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'longitud_inicio' })
  longitudInicio?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'latitud_fin' })
  latitudFin?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'longitud_fin' })
  longitudFin?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'km_recorridos' })
  kmRecorridos?: number;

  constructor(partial: Partial<Actividad>) {
    Object.assign(this, partial);
  }

  // Business Logic Methods
  public isJornadaAbierta(): boolean {
    return !this.fechaFin || !this.horaFin;
  }

  public getStartDateTime(): Date {
    return new Date(`${this.fechaInicio}T${this.horaInicio}`);
  }

  public getEndDateTime(): Date | null {
    if (!this.fechaFin || !this.horaFin) {
      return null;
    }
    return new Date(`${this.fechaFin}T${this.horaFin}`);
  }

  public getDurationInMinutes(): number | null {
    const start = this.getStartDateTime();
    const end = this.getEndDateTime();

    if (!end) {
      return null; // Open shift
    }

    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  }

  public getDurationInHours(): number | null {
    const minutes = this.getDurationInMinutes();
    return minutes ? Math.round((minutes / 60) * 100) / 100 : null;
  }

  public overlapsWithActivity(other: Actividad): boolean {
    // If different resources, no overlap
    if (this.recursoId !== other.recursoId) {
      return false;
    }

    const thisStart = this.getStartDateTime();
    const thisEnd = this.getEndDateTime();
    const otherStart = other.getStartDateTime();
    const otherEnd = other.getEndDateTime();

    // Handle open shifts
    if (!thisEnd && !otherEnd) {
      // Both are open shifts, they overlap if they start on the same resource
      return thisStart.getTime() === otherStart.getTime();
    }

    if (!thisEnd) {
      // This is open, overlaps if other starts before this starts
      return otherStart < thisStart && (!otherEnd || otherEnd > thisStart);
    }

    if (!otherEnd) {
      // Other is open, overlaps if this starts before other starts
      return thisStart < otherStart && thisEnd > otherStart;
    }

    // Both have end times, check for overlap
    return thisStart < otherEnd && thisEnd > otherStart;
  }

  public static validateTimeFormat(time: string): boolean {
    const validMinutes = ['00', '15', '30', '45'];
    const timePattern = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;

    if (!timePattern.test(time)) {
      return false;
    }

    const minutes = time.split(':')[1];
    return validMinutes.includes(minutes);
  }

  public toERPExportFormat(): any {
    return {
      fecha: this.fechaInicio,
      recurso: this.recurso.getDisplayName(),
      obra: `${this.obra.codigo} - ${this.obra.descripcion}`,
      cantidad: this.getDurationInHours() || 0,
      agr_coste: this.recurso.agrCoste,
      actividad: this.tipoActividad.nombre,
      ...(this.kmRecorridos && { km_recorridos: this.kmRecorridos })
    };
  }
}