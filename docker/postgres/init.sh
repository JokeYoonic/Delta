#!/bin/bash
set -e

psql -v ON_ERROR_STOP=0 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE logto' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'logto')\gexec
    GRANT ALL PRIVILEGES ON DATABASE logto TO $POSTGRES_USER;
EOSQL
