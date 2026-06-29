-- Purga total del schema (datos + tablas antiguas)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO catagce_admin;
GRANT ALL ON SCHEMA public TO public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
