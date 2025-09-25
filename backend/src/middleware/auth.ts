import { Request, Response, NextFunction } from 'express';
import { AuthService, JWTPayload } from '../services/AuthService';
import { RolUsuario } from '../models/Usuario';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Middleware to authenticate JWT token
   */
  authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const token = this.extractToken(req);

      if (!token) {
        res.status(401).json({ message: 'Access token required' });
        return;
      }

      const payload = this.authService.verifyJWT(token);
      req.user = payload;
      next();
    } catch (error) {
      res.status(401).json({
        message: 'Invalid or expired token',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Middleware to authorize based on roles
   */
  authorize = (allowedRoles: RolUsuario[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const hasPermission = this.authService.hasRole(req.user.rol, allowedRoles);

      if (!hasPermission) {
        res.status(403).json({
          message: 'Insufficient permissions',
          required: allowedRoles,
          current: req.user.rol
        });
        return;
      }

      next();
    };
  };

  /**
   * Middleware for resource ownership validation
   */
  authorizeResource = (resourceUserIdParam: string = 'userId') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const resourceUserId = parseInt(req.params[resourceUserIdParam]);

      const canAccess = this.authService.canAccessResource(
        req.user.rol,
        req.user.userId,
        resourceUserId
      );

      if (!canAccess) {
        res.status(403).json({
          message: 'Cannot access this resource',
          reason: 'Resource ownership or permission denied'
        });
        return;
      }

      next();
    };
  };

  /**
   * Middleware for permission-based authorization
   */
  authorizePermission = (requiredPermission: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const userPermissions = this.authService.getUserPermissions(req.user.rol);

      if (!userPermissions.includes(requiredPermission)) {
        res.status(403).json({
          message: 'Insufficient permissions',
          required: requiredPermission,
          available: userPermissions
        });
        return;
      }

      next();
    };
  };

  /**
   * Optional authentication middleware (doesn't fail if no token)
   */
  optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const token = this.extractToken(req);

      if (token) {
        const payload = this.authService.verifyJWT(token);
        req.user = payload;
      }
    } catch (error) {
      // Ignore token errors in optional auth
      console.warn('Optional auth token error:', error instanceof Error ? error.message : error);
    }

    next();
  };

  /**
   * Extract token from request headers
   */
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return null;
    }

    // Bearer token format: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware();

// Export convenience functions
export const authenticate = authMiddleware.authenticate;
export const authorize = authMiddleware.authorize;
export const authorizeResource = authMiddleware.authorizeResource;
export const authorizePermission = authMiddleware.authorizePermission;
export const optionalAuth = authMiddleware.optionalAuth;

// Role-based middleware shortcuts
export const adminOnly = authorize([RolUsuario.ADMINISTRADOR]);

export const adminOrManager = authorize([
  RolUsuario.ADMINISTRADOR,
  RolUsuario.JEFE_EQUIPO,
  RolUsuario.TECNICO_TRANSPORTE
]);

export const allRoles = authorize([
  RolUsuario.ADMINISTRADOR,
  RolUsuario.JEFE_EQUIPO,
  RolUsuario.TECNICO_TRANSPORTE,
  RolUsuario.OPERARIO
]);