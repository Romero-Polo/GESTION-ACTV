import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Usuario } from './Usuario';

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  XML = 'xml'
}

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

@Entity('export_logs')
export class ExportLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    enum: ExportFormat,
    default: ExportFormat.JSON
  })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @Column({
    type: 'varchar',
    enum: ExportStatus,
    default: ExportStatus.PENDING
  })
  @IsEnum(ExportStatus)
  status: ExportStatus;

  @Column({ type: 'date' })
  @IsNotEmpty()
  fechaInicio: string;

  @Column({ type: 'date' })
  @IsNotEmpty()
  fechaFin: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  @IsOptional()
  empresa?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  tipoRecurso?: string; // 'operario', 'maquina', or null for both

  @Column({ type: 'int', default: 0 })
  @IsInt()
  @Min(0)
  recordsCount: number;

  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  fileSizeBytes?: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  fileName?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  downloadUrl?: string;

  @Column({ type: 'datetime', nullable: true })
  @IsOptional()
  startedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  @IsOptional()
  completedAt?: Date;

  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  errorMessage?: string;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  filterParams?: any;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  metadata?: any;

  @Column({ type: 'varchar', length: 45, nullable: true })
  @IsOptional()
  clientIp?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  userAgent?: string;

  // Relations
  @Column({ type: 'int' })
  usuarioId: number;

  @ManyToOne(() => Usuario, { eager: true })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  constructor(partial: Partial<ExportLog>) {
    Object.assign(this, partial);
  }

  // Methods
  public start(): void {
    this.status = ExportStatus.PROCESSING;
    this.startedAt = new Date();
  }

  public complete(recordsCount: number, fileSizeBytes?: number, fileName?: string, downloadUrl?: string): void {
    this.status = ExportStatus.COMPLETED;
    this.completedAt = new Date();
    this.recordsCount = recordsCount;
    this.fileSizeBytes = fileSizeBytes;
    this.fileName = fileName;
    this.downloadUrl = downloadUrl;

    if (this.startedAt) {
      this.durationMs = this.completedAt.getTime() - this.startedAt.getTime();
    }
  }

  public fail(errorMessage: string): void {
    this.status = ExportStatus.FAILED;
    this.completedAt = new Date();
    this.errorMessage = errorMessage;

    if (this.startedAt) {
      this.durationMs = this.completedAt.getTime() - this.startedAt.getTime();
    }
  }

  public getDurationInSeconds(): number | null {
    if (!this.durationMs) return null;
    return Math.round(this.durationMs / 1000);
  }

  public getDateRangeInDays(): number {
    const start = new Date(this.fechaInicio);
    const end = new Date(this.fechaFin);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public isCompleted(): boolean {
    return this.status === ExportStatus.COMPLETED;
  }

  public isFailed(): boolean {
    return this.status === ExportStatus.FAILED;
  }

  public isPending(): boolean {
    return this.status === ExportStatus.PENDING;
  }

  public isProcessing(): boolean {
    return this.status === ExportStatus.PROCESSING;
  }

  public getFormattedFileSize(): string {
    if (!this.fileSizeBytes) return '-';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.fileSizeBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  public static validateDateRange(fechaInicio: string, fechaFin: string, maxDays: number = 90): string | null {
    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);
    const now = new Date();

    // Validate date format
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'Formato de fecha inválido';
    }

    // Validate date order
    if (start > end) {
      return 'La fecha de inicio debe ser anterior a la fecha de fin';
    }

    // Validate date range
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > maxDays) {
      return `El rango de fechas no puede exceder ${maxDays} días`;
    }

    // Validate dates are not in the future
    if (start > now || end > now) {
      return 'Las fechas no pueden ser futuras';
    }

    return null; // Valid
  }
}