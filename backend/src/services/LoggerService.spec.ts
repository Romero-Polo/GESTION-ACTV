/**
 * Unit Tests for LoggerService
 */

import { LoggerService, LogLevel, LogCategory } from './LoggerService';

describe('LoggerService', () => {
  let loggerService: LoggerService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerService = LoggerService.getInstance();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = LoggerService.getInstance();
      const instance2 = LoggerService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('log levels', () => {
    it('should log info messages', () => {
      loggerService.info('Test info message', LogCategory.SYSTEM);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      loggerService.warn('Test warning message', LogCategory.SYSTEM);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      loggerService.error('Test error message', LogCategory.SYSTEM, { error: error.message });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log debug messages', () => {
      loggerService.debug('Test debug message', LogCategory.SYSTEM);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('audit logging', () => {
    it('should log audit events', () => {
      loggerService.audit(
        'LOGIN',
        'User',
        123,
        true,
        { timestamp: new Date().toISOString() },
        '192.168.1.1'
      );

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log failed audit events', () => {
      loggerService.audit(
        'DELETE_ACTIVITY',
        'Activity',
        456,
        false,
        { reason: 'Unauthorized' },
        '10.0.0.1'
      );

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('performance logging', () => {
    it('should log performance metrics', () => {
      const performanceData = {
        operation: 'database_query',
        duration: 150,
        queryType: 'SELECT'
      };

      loggerService.performance('Database query completed', performanceData);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle performance logging without data', () => {
      loggerService.performance('Simple performance log');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('context formatting', () => {
    it('should properly format context with user ID', () => {
      const context = {
        userId: 123,
        operation: 'create_activity',
        resource: 'Activity'
      };

      loggerService.info('Activity created', LogCategory.API, context);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle empty context', () => {
      loggerService.info('Simple log message', LogCategory.SYSTEM);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('log categories', () => {
    it('should handle AUTH category', () => {
      loggerService.info('Authentication successful', LogCategory.AUTH);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle API category', () => {
      loggerService.info('API request processed', LogCategory.API);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle DATABASE category', () => {
      loggerService.info('Database operation completed', LogCategory.DATABASE);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle EXPORT category', () => {
      loggerService.info('Export generated', LogCategory.EXPORT);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle SYNC category', () => {
      loggerService.info('Sync operation completed', LogCategory.SYNC);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle GPS category', () => {
      loggerService.info('GPS data recorded', LogCategory.GPS);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle CACHE category', () => {
      loggerService.info('Cache operation', LogCategory.CACHE);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle SYSTEM category', () => {
      loggerService.info('System information', LogCategory.SYSTEM);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle malformed context gracefully', () => {
      const malformedContext = {
        userId: 'not-a-number',
        circular: {} as any
      };
      malformedContext.circular.self = malformedContext;

      expect(() => {
        loggerService.info('Test with malformed context', LogCategory.SYSTEM, malformedContext);
      }).not.toThrow();
    });

    it('should handle undefined log category', () => {
      expect(() => {
        loggerService.info('Test message', undefined as any);
      }).not.toThrow();
    });

    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000);

      expect(() => {
        loggerService.info(longMessage, LogCategory.SYSTEM);
      }).not.toThrow();
    });
  });
});