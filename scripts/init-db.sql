-- Database initialization script for Docker
-- This script is run when the SQL Server container starts for the first time

-- Create the database if it doesn't exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'gestion_actividad')
BEGIN
    CREATE DATABASE gestion_actividad;
    PRINT 'Database gestion_actividad created successfully';
END
ELSE
BEGIN
    PRINT 'Database gestion_actividad already exists';
END
GO

-- Create test database as well
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'gestion_actividad_test')
BEGIN
    CREATE DATABASE gestion_actividad_test;
    PRINT 'Test database gestion_actividad_test created successfully';
END
ELSE
BEGIN
    PRINT 'Test database gestion_actividad_test already exists';
END
GO

-- Use the main database
USE gestion_actividad;
GO

-- Create a basic login for the application (optional, can be handled by migrations)
-- The application will use the sa account by default, but this shows how to create dedicated users
/*
CREATE LOGIN gestion_user WITH PASSWORD = 'GestionUser123!';
GO

CREATE USER gestion_user FOR LOGIN gestion_user;
GO

-- Grant necessary permissions
ALTER ROLE db_owner ADD MEMBER gestion_user;
GO
*/

PRINT 'Database initialization completed successfully';
GO