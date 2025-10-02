import { Request, Response, NextFunction } from 'express';
import { exportRateLimit, previewRateLimit, createRateLimit } from '../../middleware/rateLimiter';

describe('Rate Limiter Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;
  let responseSetHeader: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    responseJson = jest.fn().mockReturnThis();
    responseStatus = jest.fn().mockReturnThis();
    responseSetHeader = jest.fn();

    mockResponse = {
      json: responseJson,
      status: responseStatus,
      setHeader: responseSetHeader
    } as Partial<Response>;

    mockRequest = {
      user: { id: 1 },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      get: jest.fn().mockReturnValue('test-user-agent')
    } as Partial<Request>;

    mockNext = jest.fn();
  });

  describe('exportRateLimit', () => {
    it('should allow requests within limit', () => {
      exportRateLimit(mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseSetHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
      expect(responseSetHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
      expect(responseSetHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
      expect(mockNext).toHaveBeenCalled();
      expect(responseStatus).not.toHaveBeenCalled();
    });

    it('should block requests when limit exceeded', () => {
      // Make 6 requests (limit is 5)
      for (let i = 0; i < 6; i++) {
        exportRateLimit(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(responseStatus).toHaveBeenCalledWith(429);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Límite de exportaciones excedido. Intente nuevamente en 15 minutos.',
        retryAfter: expect.any(Number)
      });
    });

    it('should use user ID for authenticated users', () => {
      const userRequest = {
        ...mockRequest,
        user: { id: 123 },
        ip: '192.168.1.1'
      } as Request;

      // First request should succeed
      exportRateLimit(userRequest, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // Same user from different IP should share the same limit
      const differentIpRequest = {
        ...userRequest,
        ip: '10.0.0.1'
      } as Request;

      jest.clearAllMocks();
      exportRateLimit(differentIpRequest, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use IP for unauthenticated users', () => {
      const noUserRequest = {
        ...mockRequest,
        user: undefined,
        ip: '192.168.1.100'
      } as Request;

      exportRateLimit(noUserRequest, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(responseSetHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
    });

    it('should handle missing IP gracefully', () => {
      const noIpRequest = {
        ...mockRequest,
        user: undefined,
        ip: undefined,
        connection: { remoteAddress: undefined }
      } as Request;

      exportRateLimit(noIpRequest, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reset limit after window expires', (done) => {
      jest.setTimeout(10000);

      // Override the window to be very short for testing
      const shortWindowLimiter = createRateLimit(100, 2, 'Test limit'); // 100ms window, 2 requests

      // Make 2 requests to hit the limit
      shortWindowLimiter(mockRequest as Request, mockResponse as Response, mockNext);
      shortWindowLimiter(mockRequest as Request, mockResponse as Response, mockNext);

      // Third request should be blocked
      jest.clearAllMocks();
      shortWindowLimiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(responseStatus).toHaveBeenCalledWith(429);

      // Wait for window to reset
      setTimeout(() => {
        jest.clearAllMocks();
        shortWindowLimiter(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(responseStatus).not.toHaveBeenCalled();
        done();
      }, 150);
    });
  });

  describe('previewRateLimit', () => {
    it('should allow more requests than export limit', () => {
      // Preview limit is 20, export limit is 5
      for (let i = 0; i < 10; i++) {
        jest.clearAllMocks();
        previewRateLimit(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }
    });

    it('should have correct headers', () => {
      previewRateLimit(mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseSetHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '20');
      expect(responseSetHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 19);
    });

    it('should block after reaching preview limit', () => {
      // Make 21 requests (limit is 20)
      for (let i = 0; i < 21; i++) {
        previewRateLimit(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(responseStatus).toHaveBeenCalledWith(429);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Límite de previews excedido. Intente nuevamente en 5 minutos.',
        retryAfter: expect.any(Number)
      });
    });
  });

  describe('createRateLimit factory', () => {
    it('should create limiter with custom parameters', () => {
      const customLimiter = createRateLimit(1000, 3, 'Custom message');

      // Make 3 requests (at limit)
      for (let i = 0; i < 3; i++) {
        jest.clearAllMocks();
        customLimiter(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }

      // Fourth request should be blocked
      jest.clearAllMocks();
      customLimiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(429);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Custom message',
        retryAfter: expect.any(Number)
      });
    });

    it('should use default message when none provided', () => {
      const defaultLimiter = createRateLimit(1000, 1); // 1 request per second

      // Make first request (at limit)
      defaultLimiter(mockRequest as Request, mockResponse as Response, mockNext);

      // Second request should be blocked with default message
      jest.clearAllMocks();
      defaultLimiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseStatus).toHaveBeenCalledWith(429);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Límite de peticiones excedido'),
        retryAfter: expect.any(Number)
      });
    });

    it('should set correct headers for custom limits', () => {
      const customLimiter = createRateLimit(2000, 10);

      customLimiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(responseSetHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
      expect(responseSetHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
      expect(responseSetHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });
  });

  describe('InMemoryRateLimiter cleanup', () => {
    it('should clean up expired entries', (done) => {
      jest.setTimeout(10000);

      // Create a limiter with short window for testing
      const testLimiter = createRateLimit(50, 5); // 50ms window

      // Make a request to create an entry
      testLimiter(mockRequest as Request, mockResponse as Response, mockNext);

      // Wait for entry to expire and cleanup to run
      setTimeout(() => {
        // Make another request - this should create a fresh entry
        jest.clearAllMocks();
        testLimiter(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(responseSetHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
        done();
      }, 100);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle undefined user gracefully', () => {
      const undefinedUserRequest = {
        ...mockRequest,
        user: undefined
      } as Request;

      exportRateLimit(undefinedUserRequest, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle request with no IP information', () => {
      const noNetworkInfoRequest = {
        ...mockRequest,
        ip: undefined,
        connection: undefined,
        user: undefined
      } as Request;

      exportRateLimit(noNetworkInfoRequest, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle malformed user object', () => {
      const malformedUserRequest = {
        ...mockRequest,
        user: { id: null }
      } as Request;

      exportRateLimit(malformedUserRequest, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should calculate retry after correctly', () => {
      // Make requests to hit the limit
      for (let i = 0; i < 6; i++) {
        exportRateLimit(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          retryAfter: expect.any(Number)
        })
      );

      const callArgs = responseJson.mock.calls[responseJson.mock.calls.length - 1][0];
      expect(callArgs.retryAfter).toBeGreaterThan(0);
      expect(callArgs.retryAfter).toBeLessThanOrEqual(15 * 60); // Should be within 15 minutes
    });

    it('should handle concurrent requests correctly', () => {
      const requests = Array.from({ length: 10 }, () => ({
        ...mockRequest,
        user: { id: Math.floor(Math.random() * 5) + 1 } // Random user IDs 1-5
      }));

      let allowedCount = 0;
      let blockedCount = 0;

      requests.forEach(req => {
        jest.clearAllMocks();
        exportRateLimit(req as Request, mockResponse as Response, mockNext);

        if (mockNext.mock.calls.length > 0) {
          allowedCount++;
        } else {
          blockedCount++;
        }
      });

      expect(allowedCount + blockedCount).toBe(10);
      expect(allowedCount).toBeGreaterThan(0); // At least some requests should be allowed
    });
  });

  describe('Performance tests', () => {
    it('should handle many rapid requests efficiently', () => {
      const startTime = Date.now();
      const limiter = createRateLimit(60000, 1000); // High limit for performance test

      // Make 1000 requests
      for (let i = 0; i < 1000; i++) {
        const req = {
          ...mockRequest,
          user: { id: i % 100 } // 100 different users
        } as Request;

        limiter(req, mockResponse as Response, mockNext);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second
    });

    it('should have minimal memory footprint', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const limiter = createRateLimit(60000, 100);

      // Create many unique keys
      for (let i = 0; i < 10000; i++) {
        const req = {
          ...mockRequest,
          user: { id: i },
          ip: `192.168.1.${i % 255}`
        } as Request;

        limiter(req, mockResponse as Response, mockNext);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB threshold
    });
  });
});