import winston from 'winston';
import path from 'path';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export enum LogCategory {
  AUTH = 'auth',
  API = 'api',
  DATABASE = 'database',
  EXPORT = 'export',
  SYNC = 'sync',
  GPS = 'gps',
  CACHE = 'cache',
  SYSTEM = 'system'
}

interface LogContext {
  userId?: number;
  userEmail?: string;
  userRole?: string;
  clientIp?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  activityId?: number;
  exportId?: number;
  syncId?: number;
  [key: string]: any;
}

class LoggerService {
  private logger: winston.Logger;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.setupLogger();
  }

  private setupLogger(): void {
    // Custom format for structured logging
    const customFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf((info) => {
        const { timestamp, level, message, category, context, stack, ...meta } = info;

        const logEntry = {
          timestamp,
          level: level.toUpperCase(),
          category: category || LogCategory.SYSTEM,
          message,
          ...(context && { context }),
          ...(Object.keys(meta).length > 0 && { meta }),
          ...(stack && { stack })
        };

        return JSON.stringify(logEntry);
      })
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf((info) => {
        const { timestamp, level, message, category, context } = info;
        const categoryStr = category ? `[${category.toUpperCase()}]` : '';
        const contextStr = context ? `\n  Context: ${JSON.stringify(context, null, 2)}` : '';

        return `${timestamp} ${level} ${categoryStr} ${message}${contextStr}`;
      })
    );

    // Configure transports
    const transports: winston.transport[] = [];

    // Console transport (always enabled in development)
    if (this.isDevelopment) {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
          level: 'debug'
        })
      );
    }

    // File transports for production
    if (!this.isDevelopment) {
      const logDir = process.env.LOG_DIRECTORY || 'logs';

      // Combined log file
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          format: customFormat,
          level: 'info',
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10,
          tailable: true
        })
      );

      // Error log file
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          format: customFormat,
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 10,
          tailable: true
        })
      );

      // Audit log file (for sensitive operations)
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'audit.log'),
          format: customFormat,
          level: 'info',
          maxsize: 25 * 1024 * 1024, // 25MB
          maxFiles: 20,
          tailable: true
        })
      );
    }

    this.logger = winston.createLogger({
      level: this.isDevelopment ? 'debug' : 'info',
      transports,
      exitOnError: false,
      // Handle uncaught exceptions and rejections
      exceptionHandlers: this.isDevelopment ? [] : [
        new winston.transports.File({
          filename: path.join(process.env.LOG_DIRECTORY || 'logs', 'exceptions.log'),
          format: customFormat
        })
      ],
      rejectionHandlers: this.isDevelopment ? [] : [
        new winston.transports.File({
          filename: path.join(process.env.LOG_DIRECTORY || 'logs', 'rejections.log'),
          format: customFormat
        })
      ]
    });
  }

  // Core logging methods
  public log(level: LogLevel, message: string, category: LogCategory, context?: LogContext): void {
    this.logger.log(level, message, { category, context });
  }

  public debug(message: string, category: LogCategory = LogCategory.SYSTEM, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, category, context);
  }

  public info(message: string, category: LogCategory = LogCategory.SYSTEM, context?: LogContext): void {
    this.log(LogLevel.INFO, message, category, context);
  }

  public warn(message: string, category: LogCategory = LogCategory.SYSTEM, context?: LogContext): void {
    this.log(LogLevel.WARN, message, category, context);
  }

  public error(message: string, error?: Error, category: LogCategory = LogCategory.SYSTEM, context?: LogContext): void {
    const errorContext = {
      ...context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      })
    };

    this.logger.error(message, { category, context: errorContext });
  }

  // Specialized logging methods
  public logAuth(message: string, level: LogLevel, context: LogContext): void {
    this.log(level, message, LogCategory.AUTH, context);
  }

  public logAPI(message: string, level: LogLevel, context: LogContext): void {
    this.log(level, message, LogCategory.API, context);
  }

  public logExport(message: string, level: LogLevel, context: LogContext): void {
    this.log(level, message, LogCategory.EXPORT, context);
  }

  public logSync(message: string, level: LogLevel, context: LogContext): void {
    this.log(level, message, LogCategory.SYNC, context);
  }

  public logGPS(message: string, level: LogLevel, context: LogContext): void {
    this.log(level, message, LogCategory.GPS, context);
  }

  public logDatabase(message: string, level: LogLevel, context?: LogContext): void {
    this.log(level, message, LogCategory.DATABASE, context);
  }

  public logCache(message: string, level: LogLevel, context?: LogContext): void {
    this.log(level, message, LogCategory.CACHE, context);
  }

  // Audit logging for sensitive operations
  public audit(
    action: string,
    resource: string,
    userId: number,
    success: boolean,
    details?: any,
    clientIp?: string
  ): void {
    const context: LogContext = {
      userId,
      clientIp,
      action,
      resource,
      success,
      ...(details && { details })
    };

    this.info(`AUDIT: ${action} on ${resource} - ${success ? 'SUCCESS' : 'FAILED'}`, LogCategory.SYSTEM, context);
  }

  // Performance logging
  public logPerformance(
    operation: string,
    duration: number,
    category: LogCategory,
    context?: LogContext
  ): void {
    const perfContext = {
      ...context,
      operation,
      duration,
      slow: duration > 1000 // Mark operations slower than 1 second
    };

    const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO;
    const message = `Performance: ${operation} took ${duration}ms`;

    this.log(level, message, category, perfContext);
  }

  // Security logging
  public logSecurity(
    event: string,
    severity: 'low' | 'medium' | 'high',
    context: LogContext
  ): void {
    const securityContext = {
      ...context,
      securityEvent: true,
      severity
    };

    const level = severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    this.log(level, `SECURITY: ${event}`, LogCategory.SYSTEM, securityContext);
  }

  // Request/Response logging middleware helper
  public logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userId?: number,
    clientIp?: string
  ): void {
    const context: LogContext = {
      method,
      url,
      statusCode,
      duration,
      userId,
      clientIp
    };

    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const message = `${method} ${url} ${statusCode} - ${duration}ms`;

    this.logAPI(message, level, context);
  }

  // Cleanup and rotation helper
  public async cleanup(): Promise<void> {
    // This would be called periodically to clean up old logs
    // Implementation depends on your log rotation strategy
    this.info('Log cleanup initiated', LogCategory.SYSTEM);
  }

  // Health check for logging system
  public healthCheck(): { status: 'healthy' | 'unhealthy'; details: any } {
    try {
      // Test logging capability
      this.debug('Logger health check', LogCategory.SYSTEM);

      return {
        status: 'healthy',
        details: {
          level: this.logger.level,
          transportsCount: this.logger.transports.length,
          isDevelopment: this.isDevelopment
        }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message
        }
      };
    }
  }
}

// Export singleton instance
export const logger = new LoggerService();

// Export middleware for Express
export const requestLoggerMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();

  // Log request
  logger.debug(`${req.method} ${req.url} - Started`, LogCategory.API, {
    method: req.method,
    url: req.url,
    clientIp: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(
      req.method,
      req.url,
      res.statusCode,
      duration,
      req.user?.id,
      req.ip
    );
  });

  next();
};