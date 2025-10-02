import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum SyncType {
  OBRAS = 'obras',
  RECURSOS = 'recursos',
  WEBHOOK = 'webhook'
}

export enum SyncStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

@Entity('sync_logs')
export class SyncLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    enum: SyncType
  })
  syncType: SyncType;

  @Column({
    type: 'varchar',
    enum: SyncStatus,
    default: SyncStatus.PENDING
  })
  status: SyncStatus;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'json', nullable: true })
  details: any;

  @Column({ type: 'int', default: 0 })
  recordsProcessed: number;

  @Column({ type: 'int', default: 0 })
  recordsCreated: number;

  @Column({ type: 'int', default: 0 })
  recordsUpdated: number;

  @Column({ type: 'int', default: 0 })
  recordsSkipped: number;

  @Column({ type: 'int', default: 0 })
  recordsErrored: number;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  finishedAt: Date;

  @Column({ type: 'int', nullable: true })
  durationMs: number;

  @Column({ type: 'varchar', nullable: true })
  triggeredBy: string; // 'cron', 'manual', 'webhook'

  @Column({ type: 'int', nullable: true })
  userId: number; // For manual triggers

  @CreateDateColumn()
  createdAt: Date;

  constructor(partial: Partial<SyncLog>) {
    Object.assign(this, partial);
  }

  public start(): void {
    this.status = SyncStatus.RUNNING;
    this.startedAt = new Date();
  }

  public finish(status: SyncStatus.SUCCESS | SyncStatus.ERROR, message?: string): void {
    this.status = status;
    this.finishedAt = new Date();
    this.durationMs = this.startedAt ? this.finishedAt.getTime() - this.startedAt.getTime() : 0;
    if (message) {
      this.message = message;
    }
  }

  public addProcessedRecord(type: 'created' | 'updated' | 'skipped' | 'errored' = 'updated'): void {
    this.recordsProcessed++;

    switch (type) {
      case 'created':
        this.recordsCreated++;
        break;
      case 'updated':
        this.recordsUpdated++;
        break;
      case 'skipped':
        this.recordsSkipped++;
        break;
      case 'errored':
        this.recordsErrored++;
        break;
    }
  }
}