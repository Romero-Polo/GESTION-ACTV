import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { entities } from '../models';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Load config.json for database configuration
let dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  username: process.env.DB_USERNAME || process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || ''
};

try {
  const configPath = path.resolve(__dirname, '../../../config.json');
  if (fs.existsSync(configPath)) {
    const configFile = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const env = configFile.current_environment || 'development';
    if (configFile[env] && configFile[env].database) {
      // Ensure password is properly handled without escaping
      const rawPassword = configFile[env].database.password;
      dbConfig = {
        host: configFile[env].database.host || dbConfig.host,
        port: configFile[env].database.port || dbConfig.port,
        username: configFile[env].database.username || dbConfig.username,
        password: rawPassword || dbConfig.password,
        database: configFile[env].database.database || dbConfig.database
      };
      console.log(`📋 Database config loaded from config.json (${env} environment)`);
    }
  }
} catch (error) {
  console.log('⚠️  Could not load config.json, using environment variables');
}

export const AppDataSource = new DataSource({
  type: 'mssql',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: entities,
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
  options: {
    encrypt: false, // Use true for Azure SQL
    trustServerCertificate: true // Use false in production with proper certificates
  }
});

// Helper function to initialize database
export async function initializeDatabase(): Promise<void> {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Database connection established successfully');
    }
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
}

// Helper function to close database connection
export async function closeDatabase(): Promise<void> {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
}