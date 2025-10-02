import { Repository, DataSource } from 'typeorm';
import { Obra } from '../models/Obra';
import { SyncLog, SyncType, SyncStatus } from '../models/SyncLog';
import { getN8nClient, ExternalObra } from './N8nClient';

export interface SyncObraResult {
  success: boolean;
  syncLogId: number;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsErrored: number;
  errors: string[];
}

export class ObrasSyncService {
  private obraRepository: Repository<Obra>;
  private syncLogRepository: Repository<SyncLog>;

  constructor(dataSource: DataSource) {
    this.obraRepository = dataSource.getRepository(Obra);
    this.syncLogRepository = dataSource.getRepository(SyncLog);
  }

  /**
   * Synchronize obras from n8n
   */
  async syncObras(triggeredBy: string = 'manual', userId?: number): Promise<SyncObraResult> {
    // Check if sync is enabled
    if (!this.isSyncEnabled()) {
      throw new Error('Obras synchronization is disabled');
    }

    // Create sync log
    const syncLog = new SyncLog({
      syncType: SyncType.OBRAS,
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

    const result: SyncObraResult = {
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

      // Fetch obras from n8n
      const n8nClient = getN8nClient();
      const response = await n8nClient.getObras(lastSyncDate);

      if (!response.success || !response.data) {
        throw new Error(`Failed to fetch obras from n8n: ${response.error || 'Unknown error'}`);
      }

      const externalObras = response.data;
      console.log(`Fetched ${externalObras.length} obras from n8n`);

      // Process each obra
      for (const externalObra of externalObras) {
        try {
          const processResult = await this.processObra(externalObra);
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
          result.errors.push(`Error processing obra ${externalObra.codigo}: ${error.message}`);
          savedSyncLog.addProcessedRecord('errored');
          console.error(`Error processing obra ${externalObra.codigo}:`, error);
        }
      }

      // Update sync log
      result.success = result.recordsErrored === 0;
      const status = result.success ? SyncStatus.SUCCESS : SyncStatus.ERROR;
      const message = result.success
        ? `Successfully synchronized ${result.recordsProcessed} obras`
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

      console.log('Obras sync completed:', {
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

      console.error('Obras sync failed:', error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Process a single obra from n8n
   */
  private async processObra(externalObra: ExternalObra): Promise<{ action: 'created' | 'updated' | 'skipped' }> {
    // Validate required fields
    if (!externalObra.codigo || !externalObra.descripcion) {
      throw new Error('Missing required fields: codigo and descripcion are required');
    }

    // Find existing obra by codigo
    const existingObra = await this.obraRepository.findOne({
      where: { codigo: externalObra.codigo }
    });

    const obraData = this.mapExternalObraToInternal(externalObra);

    if (existingObra) {
      // Check if update is needed
      if (this.shouldUpdateObra(existingObra, externalObra)) {
        // Preserve local data
        obraData.id = existingObra.id;
        // You might want to preserve certain local fields here

        await this.obraRepository.save(obraData);
        return { action: 'updated' };
      } else {
        return { action: 'skipped' };
      }
    } else {
      // Create new obra
      const newObra = this.obraRepository.create(obraData);
      await this.obraRepository.save(newObra);
      return { action: 'created' };
    }
  }

  /**
   * Map external obra to internal model
   */
  private mapExternalObraToInternal(externalObra: ExternalObra): Partial<Obra> {
    return {
      codigo: externalObra.codigo,
      descripcion: externalObra.descripcion,
      fechaInicio: externalObra.fechaInicio ? new Date(externalObra.fechaInicio) : new Date(),
      fechaFin: externalObra.fechaFin ? new Date(externalObra.fechaFin) : null,
      activa: externalObra.activa,
      cliente: externalObra.cliente || null,
      ubicacion: externalObra.ubicacion || null,
      presupuesto: externalObra.presupuesto || null,
      externalId: externalObra.codigo, // Store external reference
      lastSyncDate: new Date()
    };
  }

  /**
   * Check if obra needs to be updated
   */
  private shouldUpdateObra(existingObra: Obra, externalObra: ExternalObra): boolean {
    // Compare lastModified dates
    if (externalObra.lastModified && existingObra.lastSyncDate) {
      const externalDate = new Date(externalObra.lastModified);
      const localDate = new Date(existingObra.lastSyncDate);
      return externalDate > localDate;
    }

    // If no date comparison possible, check key fields
    return (
      existingObra.descripcion !== externalObra.descripcion ||
      existingObra.activa !== externalObra.activa ||
      existingObra.cliente !== (externalObra.cliente || null) ||
      existingObra.ubicacion !== (externalObra.ubicacion || null) ||
      existingObra.presupuesto !== (externalObra.presupuesto || null)
    );
  }

  /**
   * Get last successful sync date for incremental sync
   */
  private async getLastSuccessfulSyncDate(): Promise<Date | undefined> {
    const lastSuccessfulSync = await this.syncLogRepository.findOne({
      where: {
        syncType: SyncType.OBRAS,
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
    return process.env.SYNC_ENABLED === 'true' && process.env.SYNC_OBRAS_ENABLED === 'true';
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
        where: { syncType: SyncType.OBRAS },
        order: { createdAt: 'DESC' }
      }),
      this.syncLogRepository.count({ where: { syncType: SyncType.OBRAS } }),
      this.syncLogRepository.count({
        where: { syncType: SyncType.OBRAS, status: SyncStatus.SUCCESS }
      }),
      this.syncLogRepository.count({
        where: { syncType: SyncType.OBRAS, status: SyncStatus.ERROR }
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