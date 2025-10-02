import React, { useState } from 'react';

interface ConnectionTestProps {
  onTest: () => Promise<void>;
  loading: boolean;
}

export const ConnectionTest: React.FC<ConnectionTestProps> = ({
  onTest,
  loading
}) => {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
  } | null>(null);

  const handleTest = async () => {
    setTestResult(null);
    try {
      await onTest();
      setTestResult({
        success: true,
        message: 'Conexión exitosa con n8n',
        timestamp: new Date().toLocaleString()
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Error de conexión',
        timestamp: new Date().toLocaleString()
      });
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Test de Conexión con n8n
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600">
              Prueba la conectividad con el servidor n8n para verificar que la configuración es correcta.
            </p>
          </div>
          <button
            onClick={handleTest}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Probando...
              </>
            ) : (
              <>
                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Probar Conexión
              </>
            )}
          </button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-md ${
            testResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {testResult.success ? (
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  testResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {testResult.message}
                </p>
                {testResult.timestamp && (
                  <p className={`text-xs mt-1 ${
                    testResult.success ? 'text-green-600' : 'text-red-600'
                  }`}>
                    Probado en: {testResult.timestamp}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Connection info */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Información de Conexión</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• URL del n8n: {process.env.VITE_N8N_URL || 'No configurado'}</p>
            <p>• API Key: {process.env.VITE_N8N_API_KEY ? '••••••••' : 'No configurado'}</p>
            <p>• Timeout: {process.env.VITE_N8N_TIMEOUT || '30'}s</p>
          </div>
        </div>
      </div>
    </div>
  );
};