import { Router } from 'express';
import { authController } from '../controllers/AuthController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /auth/login
 * @desc    Initialize OAuth login with Azure AD
 * @access  Public
 */
router.get('/login', authController.login);

/**
 * @route   GET /auth/callback
 * @desc    Handle OAuth callback from Azure AD
 * @access  Public
 */
router.get('/callback', authController.callback);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh JWT token using refresh token
 * @access  Public
 */
router.post('/refresh', authController.refresh);

/**
 * @route   GET /auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.me);

/**
 * @route   POST /auth/logout
 * @desc    Logout user and clear session
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /auth/status
 * @desc    Check authentication status
 * @access  Public (but returns different data based on auth)
 */
router.get('/status', optionalAuth, authController.status);

/**
 * @route   POST /auth/validate
 * @desc    Validate JWT token
 * @access  Public
 */
router.post('/validate', authController.validate);

// Test-only endpoint for E2E testing
if (process.env.NODE_ENV === 'test') {
  /**
   * @route   POST /auth/mock-login
   * @desc    Mock login for testing purposes only
   * @access  Public (test environment only)
   */
  router.post('/mock-login', authController.mockLogin);
}

export default router;