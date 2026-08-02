-- Samaria ERP Database Initialization Script
-- This script runs automatically when PostgreSQL container starts

-- Create database user (if not exists)
-- Note: User is already created via docker-compose environment variables

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON DATABASE samaria_erp TO postgres;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schema
CREATE SCHEMA IF NOT EXISTS public;

-- Grant schema privileges
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SCHEMAS TO postgres;

-- Create audit schema for logging changes
CREATE SCHEMA IF NOT EXISTS audit;
GRANT ALL PRIVILEGES ON SCHEMA audit TO postgres;

-- Enable UUID support
ALTER DATABASE samaria_erp SET default_transaction_isolation TO 'read committed';

-- Set proper connection limits
ALTER DATABASE samaria_erp CONNECTION LIMIT 100;

-- Log output
\echo ''
\echo 'Samaria ERP Database Initialization Complete'
\echo '============================================'
\echo ''
\echo 'Database: samaria_erp'
\echo 'User: postgres'
\echo 'Extensions enabled:'
\echo '  - uuid-ossp'
\echo '  - pg_trgm (text search)'
\echo ''
\echo 'Schemas created:'
\echo '  - public (main application schema)'
\echo '  - audit (change logging)'
\echo ''
