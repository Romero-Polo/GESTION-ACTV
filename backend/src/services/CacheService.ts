import Redis from 'ioredis';

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  ttl: number; // Default TTL in seconds
}

export class CacheService {
  private redis: Redis | null = null;
  private config: CacheConfig;
  private isEnabled: boolean;

  constructor() {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'gestion-actv:',
      ttl: parseInt(process.env.REDIS_DEFAULT_TTL || '300') // 5 minutes
    };

    this.isEnabled = process.env.REDIS_ENABLED === 'true';

    if (this.isEnabled) {
      this.initializeRedis();
    }
  }

  private initializeRedis(): void {
    try {
      this.redis = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000
      });

      this.redis.on('connect', () => {
        console.log('Redis connected successfully');
      });

      this.redis.on('error', (error) => {
        console.error('Redis connection error:', error.message);
        this.isEnabled = false;
        this.redis = null;
      });

      this.redis.on('close', () => {
        console.warn('Redis connection closed');
      });

    } catch (error) {
      console.error('Redis initialization failed:', error);
      this.isEnabled = false;
      this.redis = null;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.redis) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      const expiration = ttl || this.config.ttl;

      await this.redis.setex(key, expiration, serializedValue);
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isEnabled || !this.redis) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      await this.redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment counter
   */
  async incr(key: string, ttl?: number): Promise<number> {
    if (!this.isEnabled || !this.redis) {
      return 0;
    }

    try {
      const result = await this.redis.incr(key);

      // Set expiration on first increment
      if (result === 1 && ttl) {
        await this.redis.expire(key, ttl);
      }

      return result;
    } catch (error) {
      console.error(`Cache incr error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set expiration for key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set with callback
   */
  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cachedValue = await this.get<T>(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    // If not in cache, execute callback
    try {
      const value = await callback();

      // Store in cache
      await this.set(key, value, ttl);

      return value;
    } catch (error) {
      console.error(`getOrSet callback error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache patterns for specific entities
   */
  async invalidateEntity(entity: string, id?: number): Promise<number> {
    const patterns = [
      `${entity}:*`,
      `dashboard:*`,
      `stats:*`
    ];

    if (id) {
      patterns.push(`${entity}:${id}:*`);
    }

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await this.delPattern(pattern);
      totalDeleted += deleted;
    }

    return totalDeleted;
  }

  /**
   * Cache dashboard data
   */
  async cacheDashboardData(userId: number, userRole: string, data: any): Promise<void> {
    const key = `dashboard:${userRole}:${userId}`;
    await this.set(key, data, 300); // 5 minutes
  }

  /**
   * Get cached dashboard data
   */
  async getCachedDashboardData(userId: number, userRole: string): Promise<any> {
    const key = `dashboard:${userRole}:${userId}`;
    return await this.get(key);
  }

  /**
   * Cache export preview
   */
  async cacheExportPreview(filters: any, userId: number, data: any): Promise<void> {
    const filterHash = this.generateFilterHash(filters);
    const key = `export:preview:${userId}:${filterHash}`;
    await this.set(key, data, 600); // 10 minutes
  }

  /**
   * Get cached export preview
   */
  async getCachedExportPreview(filters: any, userId: number): Promise<any> {
    const filterHash = this.generateFilterHash(filters);
    const key = `export:preview:${userId}:${filterHash}`;
    return await this.get(key);
  }

  /**
   * Cache activity validation results
   */
  async cacheActivityValidation(
    actividadData: any,
    userId: number,
    validationResult: any
  ): Promise<void> {
    const dataHash = this.generateDataHash(actividadData);
    const key = `validation:activity:${userId}:${dataHash}`;
    await this.set(key, validationResult, 120); // 2 minutes
  }

  /**
   * Get cached activity validation
   */
  async getCachedActivityValidation(actividadData: any, userId: number): Promise<any> {
    const dataHash = this.generateDataHash(actividadData);
    const key = `validation:activity:${userId}:${dataHash}`;
    return await this.get(key);
  }

  /**
   * Cache user permissions
   */
  async cacheUserPermissions(userId: number, permissions: any): Promise<void> {
    const key = `permissions:${userId}`;
    await this.set(key, permissions, 1800); // 30 minutes
  }

  /**
   * Get cached user permissions
   */
  async getCachedUserPermissions(userId: number): Promise<any> {
    const key = `permissions:${userId}`;
    return await this.get(key);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ connected: boolean; latency?: number; error?: string }> {
    if (!this.isEnabled || !this.redis) {
      return { connected: false, error: 'Cache disabled or not connected' };
    }

    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return { connected: true, latency };
    } catch (error: any) {
      return { connected: false, error: error.message };
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    if (!this.isEnabled || !this.redis) {
      return { enabled: false };
    }

    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');

      return {
        enabled: true,
        connected: true,
        memory: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace)
      };
    } catch (error: any) {
      return {
        enabled: true,
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }

  // Utility methods
  private generateFilterHash(filters: any): string {
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((obj, key) => {
        obj[key] = filters[key];
        return obj;
      }, {} as any);

    return Buffer.from(JSON.stringify(sortedFilters)).toString('base64');
  }

  private generateDataHash(data: any): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  private parseRedisInfo(info: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = info.split('\r\n');

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }

    return result;
  }

  // Singleton instance
  private static instance: CacheService | null = null;

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();