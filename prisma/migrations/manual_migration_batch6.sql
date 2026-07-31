-- Migration: Add VAT fields to CementPurchase, withholding to CustomerPayment, remove receiptNo unique
-- Run: docker exec -i samaria_db psql -U samaria -d samaria_erp < prisma/migrations/manual_migration_batch6.sql

-- 1. Add vatRate and vatAmount to cement_purchases
ALTER TABLE cement_purchases ADD COLUMN IF NOT EXISTS vat_rate DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE cement_purchases ADD COLUMN IF NOT EXISTS vat_amount DOUBLE PRECISION NOT NULL DEFAULT 0;

-- 2. Add withholdingAmount to customer_payments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_payments' AND column_name='withholdingAmount') THEN
        ALTER TABLE customer_payments ADD COLUMN "withholdingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 3. Remove unique constraint on receiptNo if it exists (allow same receipt for multi-invoice)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%receipt%' AND contype = 'u') THEN
        EXECUTE 'ALTER TABLE customer_payments DROP CONSTRAINT ' || (SELECT conname FROM pg_constraint WHERE conname LIKE '%receipt%' AND contype = 'u' LIMIT 1);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No unique constraint on receiptNo to drop';
END $$;

-- 4. Create index on receiptNo for query performance
CREATE INDEX IF NOT EXISTS idx_customer_payments_receipt_no ON customer_payments ("receiptNo");

-- 5. Add bankAccountId to customer_payments (links payment to actual bank account)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_payments' AND column_name='bankAccountId') THEN
        ALTER TABLE customer_payments ADD COLUMN "bankAccountId" TEXT;
    END IF;
END $$;

-- 6. Cancel the mistaken voucher RV-20260626-0001
UPDATE payment_vouchers SET status = 'Cancelled' WHERE "voucherNo" = 'RV-20260626-0001';

-- Verify columns exist
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'cement_purchases' AND column_name IN ('vat_rate', 'vat_amount')
ORDER BY column_name;

SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'customer_payments' AND column_name = 'withholdingAmount';
