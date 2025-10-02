import * as cron from 'node-cron';
import { DataSource } from 'typeorm';
import { ObrasSyncService } from './ObrasSyncService';
import { RecursosSyncService } from './RecursosSyncService';

export class SyncJobScheduler {
  private dataSource: DataSource;
  private obrasSyncService: ObrasSyncService;
  private recursosSyncService: RecursosSyncService;
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.obrasSyncService = new ObrasSyncService(dataSource);
    this.recursosSyncService = new RecursosSyncService(dataSource);
  }

  /**
   * Initialize and start all scheduled jobs
   */
  initializeJobs(): void {
    console.log('Initializing sync job scheduler...');

    if (!this.isSyncEnabled()) {
      console.log('Sync is disabled, skipping job initialization');
      return;
    }

    this.scheduleObrasSync();
    this.scheduleRecursosSync();

    console.log('Sync job scheduler initialized');
  }

  /**
   * Schedule obras synchronization
   */
  private scheduleObrasSync(): void {
    if (!this.isObrasSyncEnabled()) {
      console.log('Obras sync is disabled');
      return;
    }

    const cronExpression = process.env.SYNC_OBRAS_CRON || '0 6 * * *'; // Default: 6 AM daily

    if (!cron.validate(cronExpression)) {
      console.error(`Invalid cron expression for obras sync: ${cronExpression}`);
      return;
    }

    const task = cron.schedule(cronExpression, async () => {
      console.log('Starting scheduled obras synchronization...');
      try {
        const result = await this.obrasSyncService.syncObras('cron');
        console.log('Scheduled obras sync completed:', {
          success: result.success,
          recordsProcessed: result.recordsProcessed,
          recordsCreated: result.recordsCreated,
          recordsUpdated: result.recordsUpdated,
          errors: result.errors.length
        });
      } catch (error) {
        console.error('Scheduled obras sync failed:', error);
      }
    }, {
      scheduled: false, // We'll start it manually
      timezone: process.env.TZ || 'Europe/Madrid'
    });

    this.scheduledTasks.set('obras-sync', task);
    task.start();

    console.log(`Obras sync scheduled: ${cronExpression}`);
  }

  /**
   * Schedule recursos synchronization
   */
  private scheduleRecursosSync(): void {
    if (!this.isRecursosSyncEnabled()) {
      console.log('Recursos sync is disabled');
      return;
    }

    const cronExpression = process.env.SYNC_RECURSOS_CRON || '0 6 * * *'; // Default: 6 AM daily

    if (!cron.validate(cronExpression)) {
      console.error(`Invalid cron expression for recursos sync: ${cronExpression}`);
      return;
    }

    const task = cron.schedule(cronExpression, async () => {
      console.log('Starting scheduled recursos synchronization...');
      try {
        const result = await this.recursosSyncService.syncRecursos('cron');
        console.log('Scheduled recursos sync completed:', {
          success: result.success,
          recordsProcessed: result.recordsProcessed,
          recordsCreated: result.recordsCreated,
          recordsUpdated: result.recordsUpdated,
          errors: result.errors.length
        });
      } catch (error) {
        console.error('Scheduled recursos sync failed:', error);
      }
    }, {
      scheduled: false, // We'll start it manually
      timezone: process.env.TZ || 'Europe/Madrid'
    });

    this.scheduledTasks.set('recursos-sync', task);
    task.start();

    console.log(`Recursos sync scheduled: ${cronExpression}`);
  }

  /**
   * Manually trigger obras sync
   */
  async triggerObrasSync(userId?: number): Promise<any> {
    if (!this.isObrasSyncEnabled()) {
      throw new Error('Obras synchronization is disabled');
    }

    console.log('Manually triggering obras synchronization...');
    return await this.obrasSyncService.syncObras('manual', userId);
  }

  /**
   * Manually trigger recursos sync
   */
  async triggerRecursosSync(userId?: number): Promise<any> {
    if (!this.isRecursosSyncEnabled()) {
      throw new Error('Recursos synchronization is disabled');
    }

    console.log('Manually triggering recursos synchronization...');
    return await this.recursosSyncService.syncRecursos('manual', userId);
  }

  /**
   * Get status of all scheduled tasks
   */
  getTasksStatus(): { [key: string]: { running: boolean; nextRun?: string } } {
    const status: { [key: string]: { running: boolean; nextRun?: string } } = {};

    this.scheduledTasks.forEach((task, name) => {
      status[name] = {
        running: task.getStatus() === 'scheduled',
        // Note: node-cron doesn't provide next run time directly
        nextRun: undefined
      };
    });

    return status;
  }

  /**
   * Stop a specific task
   */
  stopTask(taskName: string): boolean {
    const task = this.scheduledTasks.get(taskName);
    if (task) {
      task.stop();
      console.log(`Task ${taskName} stopped`);
      return true;
    }
    return false;
  }

  /**
   * Start a specific task
   */
  startTask(taskName: string): boolean {
    const task = this.scheduledTasks.get(taskName);
    if (task) {
      task.start();
      console.log(`Task ${taskName} started`);
      return true;
    }
    return false;
  }

  /**
   * Stop all scheduled tasks
   */
  stopAllTasks(): void {
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      console.log(`Task ${name} stopped`);
    });
  }

  /**
   * Destroy all scheduled tasks
   */
  destroy(): void {
    this.scheduledTasks.forEach((task, name) => {
      task.destroy();
      console.log(`Task ${name} destroyed`);
    });
    this.scheduledTasks.clear();
  }

  /**
   * Update cron schedule for a task
   */
  updateTaskSchedule(taskName: string, cronExpression: string): boolean {
    if (!cron.validate(cronExpression)) {
      console.error(`Invalid cron expression: ${cronExpression}`);
      return false;
    }

    const currentTask = this.scheduledTasks.get(taskName);
    if (!currentTask) {
      console.error(`Task ${taskName} not found`);
      return false;
    }

    // Stop and destroy current task
    currentTask.stop();
    currentTask.destroy();

    // Create new task with updated schedule
    switch (taskName) {
      case 'obras-sync':
        process.env.SYNC_OBRAS_CRON = cronExpression;
        this.scheduleObrasSync();
        break;
      case 'recursos-sync':
        process.env.SYNC_RECURSOS_CRON = cronExpression;
        this.scheduleRecursosSync();
        break;
      default:
        console.error(`Unknown task: ${taskName}`);
        return false;
    }

    console.log(`Task ${taskName} schedule updated to: ${cronExpression}`);
    return true;
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics(): Promise<{
    obras: any;
    recursos: any;
  }> {
    const [obrasStats, recursosStats] = await Promise.all([
      this.obrasSyncService.getSyncStats(),
      this.recursosSyncService.getSyncStats()
    ]);

    return {
      obras: obrasStats,
      recursos: recursosStats
    };
  }

  /**
   * Check if sync is enabled
   */
  private isSyncEnabled(): boolean {
    return process.env.SYNC_ENABLED === 'true';
  }

  /**
   * Check if obras sync is enabled
   */
  private isObrasSyncEnabled(): boolean {
    return this.isSyncEnabled() && process.env.SYNC_OBRAS_ENABLED === 'true';
  }

  /**
   * Check if recursos sync is enabled
   */
  private isRecursosSyncEnabled(): boolean {
    return this.isSyncEnabled() && process.env.SYNC_RECURSOS_ENABLED === 'true';
  }
}

// Singleton instance
let syncJobSchedulerInstance: SyncJobScheduler | null = null;

export const createSyncJobScheduler = (dataSource: DataSource): SyncJobScheduler => {
  if (!syncJobSchedulerInstance) {
    syncJobSchedulerInstance = new SyncJobScheduler(dataSource);
  }
  return syncJobSchedulerInstance;
};

export const getSyncJobScheduler = (): SyncJobScheduler => {
  if (!syncJobSchedulerInstance) {
    throw new Error('Sync job scheduler not initialized. Call createSyncJobScheduler() first.');
  }
  return syncJobSchedulerInstance;
};