import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import { AppDataSource, initializeDatabase } from './utils/database';
import { InitialDataSeeder } from './seeders/InitialDataSeeder';
import { SESSION_CONFIG } from './config/auth';
import { specs } from './config/swagger';
import { compressionMiddleware } from './middleware/compression';

// Routes
import authRoutes from './routes/auth';
import obrasRoutes from './routes/obras';
import recursosRoutes from './routes/recursos';
import actividadesRoutes from './routes/actividades';
import { syncRouter } from './routes/sync';
import { exportRouter } from './routes/export';
import { gpsRouter } from './routes/gps';
import { metricsRouter } from './routes/metrics';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors(corsOptions));
app.use(compressionMiddleware);

// Session configuration
app.use(session(SESSION_CONFIG));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint with database status
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbError = null;

  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.query('SELECT 1');
      dbStatus = 'connected';
    }
  } catch (error) {
    dbError = error instanceof Error ? error.message : 'Unknown database error';
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      ...(dbError && { error: dbError })
    }
  });
});

// Database info endpoint
app.get('/db-info', async (req, res) => {
  try {
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({ message: 'Database not initialized' });
    }

    const entities = AppDataSource.entityMetadatas.map(entity => ({
      name: entity.tableName,
      columns: entity.columns.length,
      relations: entity.relations.length
    }));

    res.json({
      connected: true,
      entities,
      totalEntities: entities.length
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/obras', obrasRoutes);
app.use('/api/recursos', recursosRoutes);
app.use('/api/actividades', actividadesRoutes);
app.use('/api/sync', syncRouter);
app.use('/api/export', exportRouter);
app.use('/api/gps', gpsRouter);
app.use('/api/metrics', metricsRouter);

// Swagger Documentation
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Gestión Actividad Laboral API',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'list'
    }
  }));
}

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Gestión de Actividad Laboral API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      database: '/db-info',
      auth: '/auth',
      obras: '/api/obras',
      recursos: '/api/recursos',
      actividades: '/api/actividades',
      sync: '/api/sync',
      export: '/api/export',
      gps: '/api/gps',
      metrics: '/api/metrics',
      ...(process.env.NODE_ENV !== 'production' && {
        documentation: '/api-docs'
      })
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  initializeDatabase()
    .then(async () => {
      console.log('Database initialized successfully');

      // Run seeders if database is empty
      if (process.env.NODE_ENV === 'development') {
        await InitialDataSeeder.runIfEmpty();
      }

      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
        console.log(`DB info: http://localhost:${PORT}/db-info`);
      });
    })
    .catch((error) => {
      console.error('Database initialization error:', error);
      process.exit(1);
    });
}

export default app;