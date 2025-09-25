import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { IsEmail, IsNotEmpty, IsEnum, IsBoolean } from 'class-validator';
import { Actividad } from './Actividad';

export enum RolUsuario {
  OPERARIO = 'operario',
  JEFE_EQUIPO = 'jefe_equipo',
  TECNICO_TRANSPORTE = 'tecnico_transporte',
  ADMINISTRADOR = 'administrador'
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Column({ type: 'varchar', length: 255 })
  @IsNotEmpty()
  nombre: string;

  @Column({
    type: 'varchar',
    enum: RolUsuario,
    default: RolUsuario.OPERARIO
  })
  @IsEnum(RolUsuario)
  rol: RolUsuario;

  @Column({ type: 'bit', default: true })
  @IsBoolean()
  activo: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  // Relations
  @OneToMany(() => Actividad, actividad => actividad.usuarioCreacion)
  actividadesCreadas: Actividad[];

  @OneToMany(() => Actividad, actividad => actividad.usuarioModificacion)
  actividadesModificadas: Actividad[];

  constructor(partial: Partial<Usuario>) {
    Object.assign(this, partial);
  }
}