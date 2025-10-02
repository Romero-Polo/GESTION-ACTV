import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Refresh,
  TrendingUp,
  Group,
  Work,
  Build,
  Activity,
  Database,
  Memory,
  Speed,
  HealthAndSafety,
  Assessment,
  Timeline,
  PieChart
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { ApiService } from '../services/ApiService';

interface SystemOverview {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  works: {
    total: number;
    active: number;
    inactive: number;
  };
  resources: {
    total: number;
    active: number;
    inactive: number;
  };
  activities: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    open: number;
    avgDaily: number;
  };
  integrations: {
    exports: number;
    syncs: number;
  };
  timestamp: string;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      connected: boolean;
      status: string;
    };
    cache: {
      connected: boolean;
      latency?: number;
    };
    logger: {
      status: string;
    };
  };
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  version: string;
}

export const MetricsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [activityMetrics, setActivityMetrics] = useState<any>(null);
  const [userMetrics, setUserMetrics] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

  // Filters
  const [activityPeriod, setActivityPeriod] = useState('30d');
  const [activityGroupBy, setActivityGroupBy] = useState('day');
  const [userPeriod, setUserPeriod] = useState('30d');

  // Check if user is admin
  const isAdmin = user?.rol === 'administrador';

  useEffect(() => {
    if (!isAdmin) return;

    loadOverview();
    loadHealth();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    if (activeTab === 1) {
      loadActivityMetrics();
    } else if (activeTab === 2) {
      loadUserMetrics();
    } else if (activeTab === 3) {
      loadPerformanceMetrics();
    }
  }, [activeTab, activityPeriod, activityGroupBy, userPeriod, isAdmin]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await ApiService.get('/api/metrics/overview');

      if (response.success) {
        setOverview(response.data);
      } else {
        setError(response.message || 'Error cargando métricas generales');
      }
    } catch (error: any) {
      setError(error.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const loadHealth = async () => {
    try {
      const response = await ApiService.get('/api/metrics/health');

      if (response.success) {
        setHealth(response.data);
      }
    } catch (error: any) {
      console.error('Error loading health:', error);
    }
  };

  const loadActivityMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await ApiService.get(
        `/api/metrics/activities?period=${activityPeriod}&groupBy=${activityGroupBy}`
      );

      if (response.success) {
        setActivityMetrics(response.data);
      } else {
        setError(response.message || 'Error cargando métricas de actividades');
      }
    } catch (error: any) {
      setError(error.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const loadUserMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await ApiService.get(`/api/metrics/users?period=${userPeriod}`);

      if (response.success) {
        setUserMetrics(response.data);
      } else {
        setError(response.message || 'Error cargando métricas de usuarios');
      }
    } catch (error: any) {
      setError(error.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await ApiService.get('/api/metrics/performance');

      if (response.success) {
        setPerformanceMetrics(response.data);
      } else {
        setError(response.message || 'Error cargando métricas de rendimiento');
      }
    } catch (error: any) {
      setError(error.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 0) {
      loadOverview();
      loadHealth();
    } else if (activeTab === 1) {
      loadActivityMetrics();
    } else if (activeTab === 2) {
      loadUserMetrics();
    } else if (activeTab === 3) {
      loadPerformanceMetrics();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'error';
      default: return 'default';
    }
  };

  if (!isAdmin) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="warning">
          Acceso restringido a administradores del sistema.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Métricas del Sistema
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {health && (
            <Chip
              label={`Sistema ${health.status === 'healthy' ? 'Saludable' :
                     health.status === 'degraded' ? 'Degradado' : 'Con Problemas'}`}
              color={getHealthStatusColor(health.status) as any}
              icon={<HealthAndSafety />}
            />
          )}

          <Tooltip title="Actualizar métricas">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="General" icon={<Assessment />} iconPosition="start" />
          <Tab label="Actividades" icon={<Timeline />} iconPosition="start" />
          <Tab label="Usuarios" icon={<Group />} iconPosition="start" />
          <Tab label="Rendimiento" icon={<Speed />} iconPosition="start" />
        </Tabs>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* General Overview Tab */}
      {activeTab === 0 && overview && (
        <Grid container spacing={3}>
          {/* Users Stats */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Group sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Usuarios</Typography>
                </Box>
                <Typography variant="h4" color="primary" gutterBottom>
                  {overview.users.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {overview.users.active} activos, {overview.users.inactive} inactivos
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Works Stats */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Work sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Obras</Typography>
                </Box>
                <Typography variant="h4" color="primary" gutterBottom>
                  {overview.works.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {overview.works.active} activas, {overview.works.inactive} inactivas
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Resources Stats */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Build sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Recursos</Typography>
                </Box>
                <Typography variant="h4" color="primary" gutterBottom>
                  {overview.resources.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {overview.resources.active} activos, {overview.resources.inactive} inactivos
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Activities Stats */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Activity sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Actividades</Typography>
                </Box>
                <Typography variant="h4" color="primary" gutterBottom>
                  {overview.activities.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {overview.activities.today} hoy, {overview.activities.open} abiertas
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Actividad Reciente
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Hoy</Typography>
                    <Typography variant="h5">{overview.activities.today}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Esta semana</Typography>
                    <Typography variant="h5">{overview.activities.thisWeek}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Este mes</Typography>
                    <Typography variant="h5">{overview.activities.thisMonth}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Promedio diario</Typography>
                    <Typography variant="h5">{overview.activities.avgDaily}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* System Health */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Estado del Sistema
                </Typography>

                {health && (
                  <>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Uptime</Typography>
                      <Typography variant="body1">{formatUptime(health.uptime)}</Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Memoria Usada</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(health.memory.heapUsed / health.memory.heapTotal) * 100}
                        sx={{ mt: 1, mb: 1 }}
                      />
                      <Typography variant="caption">
                        {formatBytes(health.memory.heapUsed)} / {formatBytes(health.memory.heapTotal)}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label="Base de Datos"
                        color={health.services.database.connected ? 'success' : 'error'}
                        size="small"
                      />
                      <Chip
                        label="Cache"
                        color={health.services.cache.connected ? 'success' : 'error'}
                        size="small"
                      />
                      <Chip
                        label="Logger"
                        color={health.services.logger.status === 'healthy' ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Integrations */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Integraciones
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Exportaciones</Typography>
                    <Typography variant="h4">{overview.integrations.exports}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Sincronizaciones</Typography>
                    <Typography variant="h4">{overview.integrations.syncs}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Activity Metrics Tab */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Período</InputLabel>
              <Select
                value={activityPeriod}
                onChange={(e) => setActivityPeriod(e.target.value)}
                label="Período"
              >
                <MenuItem value="7d">7 días</MenuItem>
                <MenuItem value="30d">30 días</MenuItem>
                <MenuItem value="90d">90 días</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Agrupar por</InputLabel>
              <Select
                value={activityGroupBy}
                onChange={(e) => setActivityGroupBy(e.target.value)}
                label="Agrupar por"
              >
                <MenuItem value="hour">Hora</MenuItem>
                <MenuItem value="day">Día</MenuItem>
                <MenuItem value="week">Semana</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {activityMetrics && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Métricas de Actividades - {activityPeriod}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Período: {activityMetrics.period?.start} - {activityMetrics.period?.end}
                    </Typography>
                    {/* Here you would add charts and detailed activity metrics */}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {/* User Metrics Tab */}
      {activeTab === 2 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Período</InputLabel>
              <Select
                value={userPeriod}
                onChange={(e) => setUserPeriod(e.target.value)}
                label="Período"
              >
                <MenuItem value="7d">7 días</MenuItem>
                <MenuItem value="30d">30 días</MenuItem>
                <MenuItem value="90d">90 días</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {userMetrics && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Métricas de Usuarios - {userPeriod}
                    </Typography>

                    {userMetrics.roleStats && (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Rol</TableCell>
                              <TableCell align="right">Cantidad</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {userMetrics.roleStats.map((role: any) => (
                              <TableRow key={role.rol}>
                                <TableCell>{role.rol}</TableCell>
                                <TableCell align="right">{role.count}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {userMetrics.topUsers && userMetrics.topUsers.length > 0 && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Usuarios Más Activos
                      </Typography>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Usuario</TableCell>
                              <TableCell>Rol</TableCell>
                              <TableCell align="right">Actividades</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {userMetrics.topUsers.map((user: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>{user.nombre}</TableCell>
                                <TableCell>{user.rol}</TableCell>
                                <TableCell align="right">{user.actividades}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </Box>
      )}

      {/* Performance Metrics Tab */}
      {activeTab === 3 && performanceMetrics && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Database sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Base de Datos</Typography>
                </Box>

                {performanceMetrics.database.tables && (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Tabla</TableCell>
                          <TableCell align="right">Registros</TableCell>
                          <TableCell align="right">Tamaño</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {performanceMetrics.database.tables.slice(0, 5).map((table: any) => (
                          <TableRow key={table.TABLE_NAME}>
                            <TableCell>{table.TABLE_NAME}</TableCell>
                            <TableCell align="right">
                              {table.TABLE_ROWS?.toLocaleString() || 'N/A'}
                            </TableCell>
                            <TableCell align="right">{table.Size_MB} MB</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Memory sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Cache Redis</Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">Estado</Typography>
                  <Chip
                    label={performanceMetrics.cache.connected ? 'Conectado' : 'Desconectado'}
                    color={performanceMetrics.cache.connected ? 'success' : 'error'}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                </Box>

                {performanceMetrics.cache.connected && performanceMetrics.cache.memory && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Memoria Usada
                    </Typography>
                    <Typography variant="body1">
                      {formatBytes(performanceMetrics.cache.memory.used_memory || 0)}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};