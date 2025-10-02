import { Request, Response, NextFunction } from 'express';

interface RateLimitInfo {
  count: number;
  lastReset: number;
}

class InMemoryRateLimiter {
  private store: Map<string, RateLimitInfo> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up expired entries every hour
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  private getKey(req: Request): string {
    // Use user ID if authenticated, otherwise fall back to IP
    const userId = req.user?.id;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return userId ? `user:${userId}` : `ip:${ip}`;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, info] of this.store.entries()) {
      if (now - info.lastReset > this.windowMs) {
        this.store.delete(key);
      }
    }
  }

  check(req: Request): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.getKey(req);
    const now = Date.now();

    let info = this.store.get(key);

    // Initialize or reset if window expired
    if (!info || now - info.lastReset > this.windowMs) {
      info = {
        count: 0,
        lastReset: now
      };
      this.store.set(key, info);
    }

    info.count++;

    const allowed = info.count <= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - info.count);
    const resetTime = info.lastReset + this.windowMs;

    return { allowed, remaining, resetTime };
  }
}

// Create rate limiter instances for different endpoints
const exportRateLimiter = new InMemoryRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5 // 5 exports per 15 minutes
);

const previewRateLimiter = new InMemoryRateLimiter(
  5 * 60 * 1000, // 5 minutes
  20 // 20 previews per 5 minutes
);

/**
 * Rate limiter middleware for export endpoints
 */
export const exportRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const result = exportRateLimiter.check(req);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', '5');
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

  if (!result.allowed) {
    console.warn('Export rate limit exceeded:', {
      user: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json({
      success: false,
      message: 'Límite de exportaciones excedido. Intente nuevamente en 15 minutos.',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
    });
    return;
  }

  next();
};

/**
 * Rate limiter middleware for preview endpoints
 */
export const previewRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const result = previewRateLimiter.check(req);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', '20');
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

  if (!result.allowed) {
    console.warn('Preview rate limit exceeded:', {
      user: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json({
      success: false,
      message: 'Límite de previews excedido. Intente nuevamente en 5 minutos.',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
    });
    return;
  }

  next();
};

/**
 * General rate limiter factory
 */
export const createRateLimit = (
  windowMs: number,
  maxRequests: number,
  message?: string
) => {
  const limiter = new InMemoryRateLimiter(windowMs, maxRequests);

  return (req: Request, res: Response, next: NextFunction): void => {
    const result = limiter.check(req);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      const defaultMessage = `Límite de peticiones excedido. Máximo ${maxRequests} peticiones cada ${Math.ceil(windowMs / 60000)} minutos.`;

      res.status(429).json({
        success: false,
        message: message || defaultMessage,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      });
      return;
    }

    next();
  };
};