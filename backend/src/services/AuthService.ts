import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { AppDataSource } from '../utils/database';
import { Usuario, RolUsuario } from '../models/Usuario';
import { msalConfig, GRAPH_SCOPES, JWT_CONFIG, REDIRECT_URI } from '../config/auth';

export interface UserProfile {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  nombre: string;
  rol: RolUsuario;
  azureId: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private msalInstance: ConfidentialClientApplication;
  private cryptoProvider: CryptoProvider;

  constructor() {
    this.msalInstance = new ConfidentialClientApplication(msalConfig);
    this.cryptoProvider = new CryptoProvider();
  }

  /**
   * Get authorization URL for Azure AD login
   */
  async getAuthUrl(sessionId: string): Promise<string> {
    const state = this.cryptoProvider.base64Encode(JSON.stringify({ sessionId }));

    const authCodeUrlParameters = {
      scopes: GRAPH_SCOPES,
      redirectUri: REDIRECT_URI,
      state: state,
      prompt: 'select_account'
    };

    const authUrl = await this.msalInstance.getAuthCodeUrl(authCodeUrlParameters);
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, state: string): Promise<{ tokens: AuthTokens; userProfile: UserProfile }> {
    try {
      const tokenRequest = {
        code: code,
        scopes: GRAPH_SCOPES,
        redirectUri: REDIRECT_URI,
      };

      const response = await this.msalInstance.acquireTokenByCode(tokenRequest);

      if (!response) {
        throw new Error('No token response received');
      }

      // Get user profile from Microsoft Graph
      const userProfile = await this.getUserProfile(response.accessToken);

      return {
        tokens: {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          idToken: response.idToken!
        },
        userProfile
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to authenticate with Azure AD');
    }
  }

  /**
   * Get user profile from Microsoft Graph
   */
  private async getUserProfile(accessToken: string): Promise<UserProfile> {
    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        id: response.data.id,
        displayName: response.data.displayName,
        mail: response.data.mail || response.data.userPrincipalName,
        userPrincipalName: response.data.userPrincipalName,
        jobTitle: response.data.jobTitle,
        department: response.data.department
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile from Microsoft Graph');
    }
  }

  /**
   * Find or create user in database
   */
  async findOrCreateUser(userProfile: UserProfile): Promise<Usuario> {
    const usuarioRepository = AppDataSource.getRepository(Usuario);

    // Try to find existing user by email
    let usuario = await usuarioRepository.findOne({
      where: { email: userProfile.mail }
    });

    if (!usuario) {
      // Create new user with default role
      usuario = new Usuario({
        email: userProfile.mail,
        nombre: userProfile.displayName,
        rol: RolUsuario.OPERARIO, // Default role, should be configured by admin
        activo: true
      });

      usuario = await usuarioRepository.save(usuario);
      console.log(`New user created: ${usuario.email}`);
    } else if (!usuario.activo) {
      throw new Error('User account is deactivated');
    }

    return usuario;
  }

  /**
   * Generate JWT token for authenticated user
   */
  generateJWT(usuario: Usuario, azureId: string): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      azureId: azureId
    };

    return jwt.sign(payload, JWT_CONFIG.secret, {
      expiresIn: JWT_CONFIG.expiresIn
    });
  }

  /**
   * Verify JWT token
   */
  verifyJWT(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_CONFIG.secret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const refreshTokenRequest = {
        refreshToken: refreshToken,
        scopes: GRAPH_SCOPES,
      };

      const response = await this.msalInstance.acquireTokenByRefreshToken(refreshTokenRequest);

      if (!response) {
        throw new Error('Failed to refresh token');
      }

      return {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        idToken: response.idToken!
      };
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get logout URL
   */
  getLogoutUrl(postLogoutRedirectUri?: string): string {
    const logoutUri = postLogoutRedirectUri || process.env.FRONTEND_URL || 'http://localhost:5173';
    return `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(logoutUri)}`;
  }

  /**
   * Check if user has required role
   */
  hasRole(userRole: RolUsuario, requiredRoles: RolUsuario[]): boolean {
    return requiredRoles.includes(userRole);
  }

  /**
   * Check if user can access resource (basic implementation)
   */
  canAccessResource(userRole: RolUsuario, userId: number, resourceUserId?: number): boolean {
    // Administrators can access everything
    if (userRole === RolUsuario.ADMINISTRADOR) {
      return true;
    }

    // Jefes and Técnicos can access their team members' resources (simplified for now)
    if (userRole === RolUsuario.JEFE_EQUIPO || userRole === RolUsuario.TECNICO_TRANSPORTE) {
      return true; // Will be enhanced with proper team management
    }

    // Operarios can only access their own resources
    if (userRole === RolUsuario.OPERARIO && resourceUserId) {
      return userId === resourceUserId;
    }

    return false;
  }

  /**
   * Get user permissions based on role
   */
  getUserPermissions(role: RolUsuario): string[] {
    const permissions: Record<RolUsuario, string[]> = {
      [RolUsuario.ADMINISTRADOR]: [
        'read:all',
        'write:all',
        'delete:all',
        'manage:users',
        'manage:obras',
        'manage:recursos',
        'export:data'
      ],
      [RolUsuario.JEFE_EQUIPO]: [
        'read:team',
        'write:team',
        'read:own',
        'write:own',
        'manage:team_activities',
        'duplicate:activities',
        'create:templates'
      ],
      [RolUsuario.TECNICO_TRANSPORTE]: [
        'read:team',
        'write:team',
        'read:own',
        'write:own',
        'manage:team_activities',
        'duplicate:activities',
        'create:templates'
      ],
      [RolUsuario.OPERARIO]: [
        'read:own',
        'write:own'
      ]
    };

    return permissions[role] || [];
  }
}