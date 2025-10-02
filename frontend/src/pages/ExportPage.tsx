import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Chip,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Download,
  Preview,
  FilterList,
  Refresh,
  Info,
  GetApp,
  History,
  Assessment
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';
import { ApiService } from '../services/ApiService';

interface ExportFilters {
  fechaInicio: Date | null;
  fechaFin: Date | null;
  empresa?: string;
  tipoRecurso?: 'operario' | 'maquina' | '';
  obraIds?: number[];
  recursoIds?: number[];
  format: 'json' | 'csv' | 'xml';
}

interface ExportPreview {
  totalRecords: number;
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
  summary: {
    totalHours: number;
    totalActivities: number;
    uniqueObras: number;
    uniqueRecursos: number;
    operariosCount: number;
    maquinasCount: number;
  };
  sampleData: ERPExportItem[];
}

interface ERPExportItem {
  fecha: string;
  recurso: string;
  obra: string;
  cantidad: number;
  agr_coste: string;
  actividad: string;
  km_recorridos?: number;
}

interface ExportLog {
  id: number;
  format: string;
  status: string;
  fechaInicio: string;
  fechaFin: string;
  empresa?: string;
  tipoRecurso?: string;
  recordsCount: number;
  fileName?: string;
  fechaCreacion: string;
  completedAt?: string;
  errorMessage?: string;
}

export const ExportPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState<ExportFilters>({
    fechaInicio: null,
    fechaFin: null,
    empresa: '',
    tipoRecurso: '',
    format: 'json'
  });

  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [exportLogs, setExportLogs] = useState<ExportLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleFilterChange = (field: keyof ExportFilters, value: any) => {
    resetMessages();
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateFilters = (): string | null => {
    if (!filters.fechaInicio || !filters.fechaFin) {
      return 'Las fechas de inicio y fin son requeridas';
    }

    if (filters.fechaInicio > filters.fechaFin) {
      return 'La fecha de inicio debe ser anterior a la fecha de fin';
    }

    const diffTime = Math.abs(filters.fechaFin.getTime() - filters.fechaInicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 90) {
      return 'El rango de fechas no puede exceder 90 días';
    }

    return null;
  };

  const formatDateForAPI = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const buildFilterPayload = () => {
    const payload: any = {
      fechaInicio: formatDateForAPI(filters.fechaInicio!),
      fechaFin: formatDateForAPI(filters.fechaFin!),
      format: filters.format
    };

    if (filters.empresa?.trim()) {
      payload.empresa = filters.empresa.trim();
    }

    if (filters.tipoRecurso) {
      payload.tipoRecurso = filters.tipoRecurso;
    }

    if (filters.obraIds?.length) {
      payload.obraIds = filters.obraIds;
    }

    if (filters.recursoIds?.length) {
      payload.recursoIds = filters.recursoIds;
    }

    return payload;
  };

  const handlePreview = async () => {
    const validationError = validateFilters();
    if (validationError) {
      setError(validationError);
      return;
    }

    setPreviewLoading(true);
    resetMessages();

    try {
      const payload = buildFilterPayload();
      const response = await ApiService.post('/api/export/preview', payload);

      if (response.success) {
        setPreview(response.data);
        setPreviewDialogOpen(true);
      } else {
        setError(response.message || 'Error generando preview');
      }
    } catch (error: any) {
      setError(error.message || 'Error de conexión');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExport = async () => {
    const validationError = validateFilters();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    resetMessages();

    try {
      const payload = buildFilterPayload();
      const response = await ApiService.post('/api/export/erp', payload);

      if (response.success) {
        setSuccess(`Exportación completada. ${response.totalRecords} registros exportados.`);

        // Trigger download if data is available
        if (response.data) {
          downloadData(response.data, response.fileName || `export_${Date.now()}.${filters.format}`);
        }

        // Refresh export logs
        loadExportLogs();
      } else {
        setError(response.message || 'Error en la exportación');
      }
    } catch (error: any) {
      setError(error.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const downloadData = (data: any, fileName: string) => {
    let content = '';
    let mimeType = '';

    switch (filters.format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        break;
      case 'csv':
        content = convertToCSV(data);
        mimeType = 'text/csv';
        break;
      case 'xml':
        content = convertToXML(data);
        mimeType = 'application/xml';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: ERPExportItem[]): string => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(row =>
      headers.map(header => {
        const value = (row as any)[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  };

  const convertToXML = (data: ERPExportItem[]): string => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<export>\n';

    data.forEach(item => {
      xml += '  <item>\n';
      Object.entries(item).forEach(([key, value]) => {
        xml += `    <${key}>${String(value).replace(/[<>&'"]/g, (c) => {
          switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
            default: return c;
          }
        })}</${key}>\n`;
      });
      xml += '  </item>\n';
    });

    xml += '</export>';
    return xml;
  };

  const loadExportLogs = useCallback(async () => {
    try {
      const response = await ApiService.get('/api/export/logs?limit=20');
      if (response.success) {
        setExportLogs(response.data.logs);
      }
    } catch (error) {
      console.error('Error loading export logs:', error);
    }
  }, []);

  const handleDownloadFromLog = async (logId: number) => {
    try {
      const response = await fetch(`/api/export/download/${logId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'export.json';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }

        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        setError('Error descargando archivo');
      }
    } catch (error) {
      setError('Error de conexión al descargar');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'failed': return 'Fallido';
      case 'processing': return 'Procesando';
      case 'pending': return 'Pendiente';
      default: return status;
    }
  };

  useEffect(() => {
    if (activeTab === 1) {
      loadExportLogs();
    }
  }, [activeTab, loadExportLogs]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Exportación ERP
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Exporta datos de actividades agregados para su integración con sistemas ERP.
        </Typography>

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Nueva Exportación" icon={<Download />} iconPosition="start" />
            <Tab label="Historial" icon={<History />} iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {activeTab === 0 && (
          <>
            {/* Export Form */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configuración de Exportación
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Fecha Inicio"
                      value={filters.fechaInicio}
                      onChange={(date) => handleFilterChange('fechaInicio', date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true
                        }
                      }}
                      maxDate={new Date()}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Fecha Fin"
                      value={filters.fechaFin}
                      onChange={(date) => handleFilterChange('fechaFin', date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true
                        }
                      }}
                      maxDate={new Date()}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Empresa (opcional)"
                      value={filters.empresa || ''}
                      onChange={(e) => handleFilterChange('empresa', e.target.value)}
                      fullWidth
                      placeholder="Filtrar por empresa"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Tipo de Recurso</InputLabel>
                      <Select
                        value={filters.tipoRecurso || ''}
                        onChange={(e) => handleFilterChange('tipoRecurso', e.target.value)}
                        label="Tipo de Recurso"
                      >
                        <MenuItem value="">Todos</MenuItem>
                        <MenuItem value="operario">Operarios</MenuItem>
                        <MenuItem value="maquina">Máquinas</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Formato de Exportación</InputLabel>
                      <Select
                        value={filters.format}
                        onChange={(e) => handleFilterChange('format', e.target.value)}
                        label="Formato de Exportación"
                      >
                        <MenuItem value="json">JSON</MenuItem>
                        <MenuItem value="csv">CSV</MenuItem>
                        <MenuItem value="xml">XML</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Preview />}
                    onClick={handlePreview}
                    disabled={previewLoading || !filters.fechaInicio || !filters.fechaFin}
                  >
                    {previewLoading ? 'Cargando...' : 'Vista Previa'}
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={<Download />}
                    onClick={handleExport}
                    disabled={loading || !filters.fechaInicio || !filters.fechaFin}
                  >
                    {loading ? 'Exportando...' : 'Exportar'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 1 && (
          <>
            {/* Export History */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">
                    Historial de Exportaciones
                  </Typography>
                  <Button
                    startIcon={<Refresh />}
                    onClick={loadExportLogs}
                    size="small"
                  >
                    Actualizar
                  </Button>
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Estado</TableCell>
                        <TableCell>Formato</TableCell>
                        <TableCell>Periodo</TableCell>
                        <TableCell>Registros</TableCell>
                        <TableCell>Fecha Creación</TableCell>
                        <TableCell>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {exportLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Chip
                              label={getStatusLabel(log.status)}
                              color={getStatusColor(log.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{log.format.toUpperCase()}</TableCell>
                          <TableCell>
                            {log.fechaInicio} - {log.fechaFin}
                            {log.empresa && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                {log.empresa}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{log.recordsCount}</TableCell>
                          <TableCell>
                            {new Date(log.fechaCreacion).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell>
                            {log.status === 'completed' && (
                              <Tooltip title="Descargar">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadFromLog(log.id)}
                                >
                                  <GetApp />
                                </IconButton>
                              </Tooltip>
                            )}
                            {log.status === 'failed' && (
                              <Tooltip title={log.errorMessage || 'Error desconocido'}>
                                <IconButton size="small" color="error">
                                  <Info />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {exportLogs.length === 0 && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography color="text.secondary">
                        No hay exportaciones realizadas
                      </Typography>
                    </Box>
                  )}
                </TableContainer>
              </CardContent>
            </Card>
          </>
        )}

        {/* Preview Dialog */}
        <Dialog
          open={previewDialogOpen}
          onClose={() => setPreviewDialogOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            Vista Previa de Exportación
          </DialogTitle>
          <DialogContent dividers>
            {preview && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Resumen
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">
                            {preview.totalRecords}
                          </Typography>
                          <Typography variant="caption">
                            Total Registros
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">
                            {preview.summary.totalHours.toFixed(1)}
                          </Typography>
                          <Typography variant="caption">
                            Total Horas
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">
                            {preview.summary.uniqueObras}
                          </Typography>
                          <Typography variant="caption">
                            Obras
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">
                            {preview.summary.uniqueRecursos}
                          </Typography>
                          <Typography variant="caption">
                            Recursos
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Muestra de Datos (primeros 10 registros)
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Fecha</TableCell>
                          <TableCell>Recurso</TableCell>
                          <TableCell>Obra</TableCell>
                          <TableCell>Horas</TableCell>
                          <TableCell>Agr. Coste</TableCell>
                          <TableCell>Actividad</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {preview.sampleData.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.fecha}</TableCell>
                            <TableCell>{item.recurso}</TableCell>
                            <TableCell>{item.obra}</TableCell>
                            <TableCell>{item.cantidad.toFixed(2)}</TableCell>
                            <TableCell>{item.agr_coste}</TableCell>
                            <TableCell>{item.actividad}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};