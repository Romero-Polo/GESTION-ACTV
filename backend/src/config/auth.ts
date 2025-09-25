import { Configuration, LogLevel } from '@azure/msal-node';
import dotenv from 'dotenv';

dotenv.config();

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    authority: process.env.AZURE_AUTHORITY || `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel: LogLevel, message: string) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[MSAL ${LogLevel[loglevel]}] ${message}`);
        }
      },
      piiLoggingEnabled: false,
      logLevel: process.env.NODE_ENV === 'development' ? LogLevel.Info : LogLevel.Error,
    }
  }
};

export const REDIRECT_URI = process.env.AZURE_REDIRECT_URI || 'http://localhost:3000/auth/callback';
export const POST_LOGOUT_REDIRECT_URI = process.env.FRONTEND_URL || 'http://localhost:5173';

// Scopes for Microsoft Graph API
export const GRAPH_SCOPES = [
  'User.Read',
  'profile',
  'openid',
  'email'
];

export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET!,
  expiresIn: process.env.JWT_EXPIRES_IN || '24h'
};

// Session configuration
export const SESSION_CONFIG = {
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  name: 'gestion-actividad-session',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax' as const
  }
};