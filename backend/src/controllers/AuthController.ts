import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { AppDataSource } from '../utils/database';
import { Usuario } from '../models/Usuario';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Initialize OAuth login
   * GET /auth/login
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.sessionID;
      const authUrl = await this.authService.getAuthUrl(sessionId);

      res.json({
        message: 'Redirect to Azure AD for authentication',
        authUrl: authUrl
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        message: 'Failed to initialize authentication',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Handle OAuth callback
   * GET /auth/callback
   */
  callback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, state, error: authError } = req.query;

      if (authError) {
        console.error('OAuth error:', authError);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_error`);
        return;
      }

      if (!code || typeof code !== 'string') {
        res.status(400).json({ message: 'Authorization code missing' });
        return;
      }

      if (!state || typeof state !== 'string') {
        res.status(400).json({ message: 'State parameter missing' });
        return;
      }

      // Exchange code for tokens and get user profile
      const { tokens, userProfile } = await this.authService.exchangeCodeForTokens(code, state);

      // Find or create user in database
      const usuario = await this.authService.findOrCreateUser(userProfile);

      // Generate JWT token
      const jwtToken = this.authService.generateJWT(usuario, userProfile.id);

      // Store tokens in session
      req.session.accessToken = tokens.accessToken;
      req.session.refreshToken = tokens.refreshToken;
      req.session.userId = usuario.id;

      // Redirect to frontend with JWT token
      const frontendUrl = `${process.env.FRONTEND_URL}/auth/success?token=${jwtToken}`;
      res.redirect(frontendUrl);

    } catch (error) {
      console.error('Callback error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(errorMessage)}`);
    }
  };

  /**
   * Refresh JWT token
   * POST /auth/refresh
   */
  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ message: 'Refresh token required' });
        return;
      }

      // Refresh tokens with Azure AD
      const newTokens = await this.authService.refreshAccessToken(refreshToken);

      // Update session
      req.session.accessToken = newTokens.accessToken;
      req.session.refreshToken = newTokens.refreshToken;

      res.json({
        message: 'Tokens refreshed successfully',
        accessToken: newTokens.accessToken
      });

    } catch (error) {
      console.error('Refresh error:', error);
      res.status(401).json({
        message: 'Failed to refresh token',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get current user profile
   * GET /auth/me
   */
  me = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Not authenticated' });
        return;
      }

      const usuarioRepository = AppDataSource.getRepository(Usuario);
      const usuario = await usuarioRepository.findOne({
        where: { id: req.user.userId },
        select: ['id', 'email', 'nombre', 'rol', 'activo', 'fechaCreacion']
      });

      if (!usuario) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      const permissions = this.authService.getUserPermissions(usuario.rol);

      res.json({
        user: {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          rol: usuario.rol,
          activo: usuario.activo,
          fechaCreacion: usuario.fechaCreacion,
          permissions: permissions
        }
      });

    } catch (error) {
      console.error('Me endpoint error:', error);
      res.status(500).json({
        message: 'Failed to get user profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Logout user
   * POST /auth/logout
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const postLogoutRedirectUri = req.body.redirectUri || process.env.FRONTEND_URL;

      // Clear session
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
      });

      // Get Azure AD logout URL
      const logoutUrl = this.authService.getLogoutUrl(postLogoutRedirectUri);

      res.json({
        message: 'Logged out successfully',
        logoutUrl: logoutUrl
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        message: 'Logout failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Check authentication status
   * GET /auth/status
   */
  status = async (req: Request, res: Response): Promise<void> => {
    try {
      const isAuthenticated = !!req.user;

      if (isAuthenticated) {
        res.json({
          authenticated: true,
          user: {
            id: req.user!.userId,
            email: req.user!.email,
            nombre: req.user!.nombre,
            rol: req.user!.rol
          }
        });
      } else {
        res.json({
          authenticated: false
        });
      }

    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({
        message: 'Failed to check authentication status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Validate JWT token
   * POST /auth/validate
   */
  validate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ message: 'Token required' });
        return;
      }

      const payload = this.authService.verifyJWT(token);

      // Check if user still exists and is active
      const usuarioRepository = AppDataSource.getRepository(Usuario);
      const usuario = await usuarioRepository.findOne({
        where: { id: payload.userId, activo: true }
      });

      if (!usuario) {
        res.status(401).json({ message: 'User not found or inactive' });
        return;
      }

      res.json({
        valid: true,
        user: {
          id: payload.userId,
          email: payload.email,
          nombre: payload.nombre,
          rol: payload.rol
        },
        expiresAt: new Date(payload.exp * 1000)
      });

    } catch (error) {
      res.status(401).json({
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token'
      });
    }
  };
}

export const authController = new AuthController();