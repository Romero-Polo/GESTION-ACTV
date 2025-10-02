/**
 * Jest Setup File for E2E Testing
 * Sets up test environment and global configurations
 */

import 'reflect-metadata';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Override NODE_ENV for testing
process.env.NODE_ENV = 'test';

// Test database configuration
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '1433';
process.env.DB_USERNAME = process.env.DB_USERNAME || 'sa';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'YourPassword123!';
process.env.DB_NAME = process.env.DB_NAME || 'gestion_actividad_test';

// Disable logging during tests
process.env.LOG_LEVEL = 'error';

// Mock Redis for tests if not available
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}

// Mock JWT secret
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-tokens';
}

// Mock session secret
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'test-session-secret';
}

// Frontend URL for CORS
process.env.FRONTEND_URL = 'http://localhost:3000';

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDate(): R;
      toHaveValidGPSCoordinates(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },

  toHaveValidGPSCoordinates(received: any) {
    const hasLatitude = typeof received.latitude === 'number' &&
                       received.latitude >= -90 && received.latitude <= 90;
    const hasLongitude = typeof received.longitude === 'number' &&
                        received.longitude >= -180 && received.longitude <= 180;

    const pass = hasLatitude && hasLongitude;
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to have valid GPS coordinates`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to have valid GPS coordinates`,
        pass: false,
      };
    }
  },
});

// Global test timeout
jest.setTimeout(30000);

// Console override for cleaner test output
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Suppress expected error logs during testing
  const message = args[0]?.toString() || '';
  if (
    message.includes('Database initialization error') ||
    message.includes('Redis connection') ||
    message.includes('Expected test error')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Process cleanup
process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});