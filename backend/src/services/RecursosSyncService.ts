import { Repository, DataSource } from 'typeorm';
import { Recurso } from '../models/Recurso';
import { SyncLog, SyncType, SyncStatus } from '../models/SyncLog';
import { getN8nClient, ExternalRecurso } from './N8nClient';

export interface SyncRecursoResult {
  success: boolean;
  syncLogId: number;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsErrored: number;
  errors: string[];
}

export class RecursosSyncService {
  private recursoRepository: Repository<Recurso>;
  private syncLogRepository: Repository<SyncLog>;

  constructor(dataSource: DataSource) {
    this.recursoRepository = dataSource.getRepository(Recurso);
    this.syncLogRepository = dataSource.getRepository(SyncLog);
  }

  /**
   * Synchronize recursos from n8n
   */
  async syncRecursos(triggeredBy: string = 'manual', userId?: number): Promise<SyncRecursoResult> {
    // Check if sync is enabled
    if (!this.isSyncEnabled()) {
      throw new Error('Recursos synchronization is disabled');
    }

    // Create sync log
    const syncLog = new SyncLog({
      syncType: SyncType.RECURSOS,
      status: SyncStatus.PENDING,
      triggeredBy,
      userId
    });

    let savedSyncLog: SyncLog;
    try {
      savedSyncLog = await this.syncLogRepository.save(syncLog);
      savedSyncLog.start();
      await this.syncLogRepository.save(savedSyncLog);
    } catch (error) {
      console.error('Error creating sync log:', error);
      throw new Error('Failed to initialize synchronization');
    }

    const result: SyncRecursoResult = {
      success: false,
      syncLogId: savedSyncLog.id,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsErrored: 0,
      errors: []
    };

    try {
      // Get last successful sync date for incremental sync
      const lastSyncDate = await this.getLastSuccessfulSyncDate();

      // Fetch recursos from n8n
      const n8nClient = getN8nClient();
      const response = await n8nClient.getRecursos(lastSyncDate);

      if (!response.success || !response.data) {
        throw new Error(`Failed to fetch recursos from n8n: ${response.error || 'Unknown error'}`);
      }

      const externalRecursos = response.data;
      console.log(`Fetched ${externalRecursos.length} recursos from n8n`);

      // Process each recurso
      for (const externalRecurso of externalRecursos) {
        try {
          const processResult = await this.processRecurso(externalRecurso);
          result.recordsProcessed++;

          switch (processResult.action) {
            case 'created':
              result.recordsCreated++;
              savedSyncLog.addProcessedRecord('created');
              break;
            case 'updated':
              result.recordsUpdated++;
              savedSyncLog.addProcessedRecord('updated');
              break;
            case 'skipped':
              result.recordsSkipped++;
              savedSyncLog.addProcessedRecord('skipped');
              break;
          }
        } catch (error: any) {
          result.recordsErrored++;
          result.errors.push(`Error processing recurso ${externalRecurso.codigo}: ${error.message}`);
          savedSyncLog.addProcessedRecord('errored');
          console.error(`Error processing recurso ${externalRecurso.codigo}:`, error);
        }
      }

      // Update sync log
      result.success = result.recordsErrored === 0;
      const status = result.success ? SyncStatus.SUCCESS : SyncStatus.ERROR;
      const message = result.success
        ? `Successfully synchronized ${result.recordsProcessed} recursos`
        : `Synchronized with errors: ${result.recordsErrored} failed out of ${result.recordsProcessed}`;

      savedSyncLog.finish(status, message);
      savedSyncLog.details = {
        recordsProcessed: result.recordsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsSkipped: result.recordsSkipped,
        recordsErrored: result.recordsErrored,
        errors: result.errors
      };

      await this.syncLogRepository.save(savedSyncLog);

      console.log('Recursos sync completed:', {
        success: result.success,
        recordsProcessed: result.recordsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsSkipped: result.recordsSkipped,
        recordsErrored: result.recordsErrored
      });

      return result;

    } catch (error: any) {
      // Update sync log with error
      savedSyncLog.finish(SyncStatus.ERROR, error.message);
      savedSyncLog.details = { error: error.message, stack: error.stack };
      await this.syncLogRepository.save(savedSyncLog);

      console.error('Recursos sync failed:', error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Process a single recurso from n8n
   */
  private async processRecurso(externalRecurso: ExternalRecurso): Promise<{ action: 'created' | 'updated' | 'skipped' }> {
    // Validate required fields
    if (!externalRecurso.codigo || !externalRecurso.nombre) {
      throw new Error('Missing required fields: codigo and nombre are required');
    }

    // Validate tipo
    if (!['operario', 'maquina'].includes(externalRecurso.tipo)) {
      throw new Error(`Invalid tipo: ${externalRecurso.tipo}. Must be 'operario' or 'maquina'`);
    }

    // Find existing recurso by codigo
    const existingRecurso = await this.recursoRepository.findOne({
      where: { codigo: externalRecurso.codigo }
    });

    const recursoData = this.mapExternalRecursoToInternal(externalRecurso);

    if (existingRecurso) {
      // Check if update is needed
      if (this.shouldUpdateRecurso(existingRecurso, externalRecurso)) {
        // Preserve local data that shouldn't be overwritten
        recursoData.id = existingRecurso.id;
        // Preserve local assignments and relationships
        // You might want to preserve usuario assignments here

        await this.recursoRepository.save(recursoData);
        return { action: 'updated' };
      } else {
        return { action: 'skipped' };
      }
    } else {
      // Create new recurso
      const newRecurso = this.recursoRepository.create(recursoData);
      await this.recursoRepository.save(newRecurso);
      return { action: 'created' };
    }
  }

  /**
   * Map external recurso to internal model
   */
  private mapExternalRecursoToInternal(externalRecurso: ExternalRecurso): Partial<Recurso> {
    return {
      codigo: externalRecurso.codigo,
      nombre: externalRecurso.nombre,
      tipo: externalRecurso.tipo as 'operario' | 'maquina',
      activo: externalRecurso.activo,
      empresa: externalRecurso.empresa || null,
      categoria: externalRecurso.categoria || null,
      costeHora: externalRecurso.costeHora || null,
      externalId: externalRecurso.codigo, // Store external reference
      lastSyncDate: new Date()
    };
  }

  /**
   * Check if recurso needs to be updated
   */
  private shouldUpdateRecurso(existingRecurso: Recurso, externalRecurso: ExternalRecurso): boolean {
    // Compare lastModified dates
    if (externalRecurso.lastModified && existingRecurso.lastSyncDate) {
      const externalDate = new Date(externalRecurso.lastModified);
      const localDate = new Date(existingRecurso.lastSyncDate);
      return externalDate > localDate;
    }

    // If no date comparison possible, check key fields
    return (
      existingRecurso.nombre !== externalRecurso.nombre ||
      existingRecurso.tipo !== externalRecurso.tipo ||
      existingRecurso.activo !== externalRecurso.activo ||
      existingRecurso.empresa !== (externalRecurso.empresa || null) ||
      existingRecurso.categoria !== (externalRecurso.categoria || null) ||
      existingRecurso.costeHora !== (externalRecurso.costeHora || null)
    );
  }

  /**
   * Get last successful sync date for incremental sync
   */
  private async getLastSuccessfulSyncDate(): Promise<Date | undefined> {
    const lastSuccessfulSync = await this.syncLogRepository.findOne({
      where: {
        syncType: SyncType.RECURSOS,
        status: SyncStatus.SUCCESS
      },
      order: {
        createdAt: 'DESC'
      }
    });

    return lastSuccessfulSync?.createdAt;
  }

  /**
   * Check if sync is enabled
   */
  private isSyncEnabled(): boolean {
    return process.env.SYNC_ENABLED === 'true' && process.env.SYNC_RECURSOS_ENABLED === 'true';
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    lastSync: Date | null;
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
  }> {
    const [lastSync, totalSyncs, successfulSyncs, failedSyncs] = await Promise.all([
      this.syncLogRepository.findOne({
        where: { syncType: SyncType.RECURSOS },
        order: { createdAt: 'DESC' }
      }),
      this.syncLogRepository.count({ where: { syncType: SyncType.RECURSOS } }),
      this.syncLogRepository.count({
        where: { syncType: SyncType.RECURSOS, status: SyncStatus.SUCCESS }
      }),
      this.syncLogRepository.count({
        where: { syncType: SyncType.RECURSOS, status: SyncStatus.ERROR }
      })
    ]);

    return {
      lastSync: lastSync?.createdAt || null,
      totalSyncs,
      successfulSyncs,
      failedSyncs
    };
  }
}