-- Manual migration: Add petty_cash table
-- Run on server: docker exec -i samaria_db psql -U samaria -d samaria_erp < prisma/migrations/manual_migration_petty_cash.sql

CREATE TABLE IF NOT EXISTS petty_cash (
  id              TEXT PRIMARY KEY,
  "voucherNo"     TEXT NOT NULL UNIQUE,
  type            TEXT NOT NULL,
  "cashierId"     TEXT,
  "cashierName"   TEXT NOT NULL,
  amount          DOUBLE PRECISION NOT NULL,
  category        TEXT,
  description     TEXT,
  "refNo"         TEXT,
  "bankAccountId" TEXT,
  "approvedBy"    TEXT,
  status          TEXT NOT NULL DEFAULT 'Pending',
  "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy"     TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
