-- Clean all database tables EXCEPT: users, user_permissions, telegram_notifications
-- Run with: docker exec -i samaria_db psql -U samaria -d samaria_erp < scripts/clean-db.sql
-- Or: ssh root@89.167.121.126 "docker exec -i samaria_db psql -U samaria -d samaria_erp" < scripts/clean-db.sql

BEGIN;

-- Disable FK checks by truncating with CASCADE (handles all dependencies)

TRUNCATE TABLE reconciliation_items CASCADE;
TRUNCATE TABLE bank_reconciliations CASCADE;
TRUNCATE TABLE daily_cash CASCADE;
TRUNCATE TABLE exception_logs CASCADE;
TRUNCATE TABLE commission_items CASCADE;
TRUNCATE TABLE commission_calculations CASCADE;
TRUNCATE TABLE stock_adjustments CASCADE;
TRUNCATE TABLE medical_store_issues CASCADE;
TRUNCATE TABLE transporter_recoveries CASCADE;
TRUNCATE TABLE cement_penalties CASCADE;
TRUNCATE TABLE cement_balances CASCADE;
TRUNCATE TABLE cement_weighbridges CASCADE;
TRUNCATE TABLE aggregate_settlements CASCADE;
TRUNCATE TABLE aggregate_proofs CASCADE;
TRUNCATE TABLE deposit_applications CASCADE;
TRUNCATE TABLE customer_deposits CASCADE;
TRUNCATE TABLE payment_vouchers CASCADE;
TRUNCATE TABLE documents CASCADE;
TRUNCATE TABLE tax_tables CASCADE;
TRUNCATE TABLE employee_advances CASCADE;
TRUNCATE TABLE payroll_items CASCADE;
TRUNCATE TABLE payroll_periods CASCADE;
TRUNCATE TABLE leave_requests CASCADE;
TRUNCATE TABLE attendances CASCADE;
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE vat_periods CASCADE;
TRUNCATE TABLE bank_transactions CASCADE;
TRUNCATE TABLE bank_accounts CASCADE;
TRUNCATE TABLE journal_entries CASCADE;
TRUNCATE TABLE chart_of_accounts CASCADE;
TRUNCATE TABLE supplier_payments CASCADE;
TRUNCATE TABLE goods_receives CASCADE;
TRUNCATE TABLE purchase_orders CASCADE;
TRUNCATE TABLE sales_commissions CASCADE;
TRUNCATE TABLE medical_pricing CASCADE;
TRUNCATE TABLE medical_batches CASCADE;
TRUNCATE TABLE medical_requests CASCADE;
TRUNCATE TABLE cement_liftings CASCADE;
TRUNCATE TABLE coupons CASCADE;
TRUNCATE TABLE cement_purchases CASCADE;
TRUNCATE TABLE truck_payments CASCADE;
TRUNCATE TABLE aggregate_deliveries CASCADE;
TRUNCATE TABLE deliveries CASCADE;
TRUNCATE TABLE customer_payments CASCADE;
TRUNCATE TABLE sales_invoices CASCADE;
TRUNCATE TABLE sales_orders CASCADE;
TRUNCATE TABLE proformas CASCADE;
TRUNCATE TABLE sales_agreements CASCADE;
TRUNCATE TABLE stock_balances CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE units CASCADE;
TRUNCATE TABLE items CASCADE;
TRUNCATE TABLE transporter_pricing CASCADE;
TRUNCATE TABLE transporter_agreement_items CASCADE;
TRUNCATE TABLE transporter_agreements CASCADE;
TRUNCATE TABLE trucks CASCADE;
TRUNCATE TABLE transporters CASCADE;
TRUNCATE TABLE transport_associations CASCADE;
TRUNCATE TABLE factories CASCADE;
TRUNCATE TABLE supplier_banks CASCADE;
TRUNCATE TABLE supplier_agreements CASCADE;
TRUNCATE TABLE suppliers CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE branches CASCADE;
TRUNCATE TABLE companies CASCADE;
TRUNCATE TABLE approvals CASCADE;
TRUNCATE TABLE activity_logs CASCADE;
TRUNCATE TABLE system_settings CASCADE;

-- NOT truncated: users, user_permissions, telegram_notifications

COMMIT;

-- Show what's preserved
SELECT 'users' AS preserved_table, COUNT(*) AS rows FROM users
UNION ALL
SELECT 'user_permissions', COUNT(*) FROM user_permissions
UNION ALL
SELECT 'telegram_notifications', COUNT(*) FROM telegram_notifications;
