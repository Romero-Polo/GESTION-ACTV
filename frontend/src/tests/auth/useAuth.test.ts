import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../../hooks/useAuth';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
    origin: 'http://localhost:5173'
  },
  writable: true
});

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    (fetch as jest.Mock).mockClear();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should initialize with token from localStorage', () => {
    const mockToken = 'stored-token';
    localStorageMock.getItem.mockReturnValue(mockToken);

    const { result } = renderHook(() => useAuth());

    expect(result.current.token).toBe(mockToken);
  });

  it('should set authenticated state when token is valid', async () => {
    const mockToken = 'valid-token';
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      nombre: 'Test User',
      rol: 'operario',
      activo: true,
      fechaCreacion: '2023-01-01',
      permissions: ['read:own', 'write:own']
    };

    localStorageMock.getItem.mockReturnValue(mockToken);
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser })
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(mockToken);
  });

  it('should clear token when invalid', async () => {
    const mockToken = 'invalid-token';

    localStorageMock.getItem.mockReturnValue(mockToken);
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
  });

  it('should handle login by redirecting to auth URL', async () => {
    const mockAuthUrl = 'https://login.microsoftonline.com/auth-url';

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authUrl: mockAuthUrl })
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login();
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'GET',
        credentials: 'include'
      })
    );

    expect(window.location.href).toBe(mockAuthUrl);
  });

  it('should handle login error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Login failed' })
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login();
    });

    expect(result.current.error).toBe('Login failed');
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle logout', async () => {
    const mockToken = 'valid-token';
    const mockLogoutUrl = 'https://login.microsoftonline.com/logout-url';

    localStorageMock.getItem.mockReturnValue(mockToken);
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: 1, email: 'test@example.com' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ logoutUrl: mockLogoutUrl })
      });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/logout'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': `Bearer ${mockToken}`
        })
      })
    );

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    expect(window.location.href).toBe(mockLogoutUrl);
  });

  it('should check user roles correctly', async () => {
    const mockUser = {
      id: 1,
      email: 'admin@example.com',
      nombre: 'Admin User',
      rol: 'administrador',
      activo: true,
      fechaCreacion: '2023-01-01',
      permissions: ['read:all', 'write:all']
    };

    localStorageMock.getItem.mockReturnValue('token');
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser })
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(result.current.hasRole(['administrador'])).toBe(true);
    expect(result.current.hasRole(['operario'])).toBe(false);
    expect(result.current.hasRole(['administrador', 'jefe_equipo'])).toBe(true);
  });

  it('should check user permissions correctly', async () => {
    const mockUser = {
      id: 1,
      email: 'user@example.com',
      nombre: 'Regular User',
      rol: 'operario',
      activo: true,
      fechaCreacion: '2023-01-01',
      permissions: ['read:own', 'write:own']
    };

    localStorageMock.getItem.mockReturnValue('token');
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser })
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(result.current.hasPermission('read:own')).toBe(true);
    expect(result.current.hasPermission('read:all')).toBe(false);
  });

  it('should clear error when requested', async () => {
    const { result } = renderHook(() => useAuth());

    // Set an error state
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      await result.current.login();
    });

    expect(result.current.error).toBe('Network error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});