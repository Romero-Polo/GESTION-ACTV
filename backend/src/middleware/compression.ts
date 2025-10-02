import compression from 'compression';
import { Request, Response } from 'express';

/**
 * Compression middleware configuration
 * Enables gzip compression for responses to reduce bandwidth usage
 */
export const compressionMiddleware = compression({
  // Only compress responses larger than 1KB
  threshold: 1024,

  // Compression level (1-9, where 9 is best compression but slowest)
  level: 6,

  // Custom filter function to determine what to compress
  filter: (req: Request, res: Response) => {
    // Don't compress if the request includes a cache-control: no-transform directive
    if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
      return false;
    }

    // Don't compress if response is already compressed
    if (res.getHeader('content-encoding')) {
      return false;
    }

    // Don't compress small responses
    const contentLength = res.getHeader('content-length');
    if (contentLength && parseInt(contentLength.toString()) < 1024) {
      return false;
    }

    // Compress JSON, text, JavaScript, CSS, XML, HTML
    const contentType = res.getHeader('content-type');
    if (!contentType) {
      return false;
    }

    const compressibleTypes = [
      'text/',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/rss+xml',
      'application/atom+xml',
      'image/svg+xml'
    ];

    const typeString = contentType.toString().toLowerCase();
    return compressibleTypes.some(type => typeString.includes(type));
  },

  // Memory level (1-9, affects speed/memory usage trade-off)
  memLevel: 8,

  // Window size (affects compression quality)
  windowBits: 15,

  // Strategy for compression algorithm
  strategy: compression.constants.Z_DEFAULT_STRATEGY
});

/**
 * Custom compression for large data exports
 * Uses higher compression for export endpoints
 */
export const exportCompressionMiddleware = compression({
  threshold: 512, // Compress smaller responses for exports
  level: 9, // Maximum compression for exports
  memLevel: 9,

  filter: (req: Request, res: Response) => {
    // Always compress export endpoints (they typically have large responses)
    if (req.path.includes('/api/export/')) {
      const contentType = res.getHeader('content-type');
      if (contentType) {
        const typeString = contentType.toString().toLowerCase();
        return (
          typeString.includes('application/json') ||
          typeString.includes('text/csv') ||
          typeString.includes('application/xml')
        );
      }
    }

    return false;
  }
});