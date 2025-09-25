import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';

export const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, clearError } = useAuthContext();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        clearError();

        // Check for error in URL params
        const error = searchParams.get('error');
        if (error) {
          setStatus('error');
          setErrorMessage(decodeURIComponent(error));
          return;
        }

        // Get token from URL params
        const token = searchParams.get('token');
        if (!token) {
          setStatus('error');
          setErrorMessage('No se recibió el token de autenticación');
          return;
        }

        // Validate token with backend
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.valid) {
            // Set token and redirect to dashboard
            setToken(token);
            setStatus('success');

            setTimeout(() => {
              navigate('/', { replace: true });
            }, 2000);
          } else {
            setStatus('error');
            setErrorMessage('Token de autenticación inválido');
          }
        } else {
          setStatus('error');
          setErrorMessage('Error al validar el token de autenticación');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Error desconocido en la autenticación');
      }
    };

    handleAuthCallback();
  }, [searchParams, setToken, navigate, clearError]);

  const handleRetry = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="card max-w-md w-full mx-4">
        <div className="card-body text-center">
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-dark mb-2">
                Procesando autenticación...
              </h2>
              <p className="text-gray-medium">
                Validando credenciales con Office365
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-green-600 mb-2">
                ¡Autenticación exitosa!
              </h2>
              <p className="text-gray-medium">
                Redirigiendo al dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-red-600 mb-2">
                Error en la autenticación
              </h2>
              <p className="text-gray-medium mb-4">
                {errorMessage}
              </p>
              <button
                onClick={handleRetry}
                className="btn btn-primary"
              >
                Intentar de nuevo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};