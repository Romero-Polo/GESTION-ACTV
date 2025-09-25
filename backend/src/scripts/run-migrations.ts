#!/usr/bin/env npx ts-node

import 'reflect-metadata';
import { AppDataSource } from '../utils/database';

async function runMigrations() {
  try {
    console.log('Initializing database connection...');
    await AppDataSource.initialize();

    console.log('Running migrations...');
    await AppDataSource.runMigrations();

    console.log('Migrations completed successfully');

    console.log('Closing database connection...');
    await AppDataSource.destroy();

    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();