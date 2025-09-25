import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { entities } from '../models';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
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