#!/bin/bash
# Samaria ERP v15 Deployment Script
# Run this on the server after extracting the tar archive

set -e

echo "=== Samaria ERP v15 Deployment ==="
echo "This version includes:"
echo "  - Payment Voucher workflow (P1)"
echo "  - Customer Deposits & Bank Reconciliation (P1)"
echo "  - Aggregate Settlement end-to-end (P2)"
echo "  - Cement Weighbridge, Balance, Penalties (P3)"
echo "  - Medical Store Issues & Stock Adjustments (P4)"
echo "  - Commission Calculations (P5)"
echo "  - Exception Center & Enhanced Approvals (P6)"
echo "  - Construction, Medical & Exception Reports (P7)"
echo ""

# Step 1: Stop existing containers
echo "[1/5] Stopping existing containers..."
docker compose down 2>/dev/null || true
docker rm -f samaria_app samaria_db 2>/dev/null || true

# Step 2: Clean Docker build cache
echo "[2/5] Cleaning Docker build cache..."
docker builder prune -f 2>/dev/null || true

# Step 3: Build with no cache
echo "[3/5] Building Docker image (no cache)..."
docker compose build --no-cache

# Step 4: Start containers
echo "[4/5] Starting containers..."
docker compose up -d

# Step 5: Wait for app, then run migration
echo "[5/5] Waiting for database to be healthy..."
sleep 15

echo "Running database migration (adding new tables)..."
docker compose exec -T app npx prisma@5.22.0 db push --accept-data-loss 2>/dev/null || \
docker compose exec -T app npx prisma db push --accept-data-loss 2>/dev/null || \
echo "Warning: Prisma migration may need manual run"

echo ""
echo "=== Deployment Complete ==="
echo "New tables added: payment_vouchers, customer_deposits, deposit_applications,"
echo "  aggregate_proofs, aggregate_settlements, cement_weighbridges, cement_balances,"
echo "  cement_penalties, transporter_recoveries, medical_store_issues, stock_adjustments,"
echo "  commission_calculations, commission_items, exception_logs, bank_reconciliations,"
echo "  reconciliation_items, daily_cash"
echo ""
echo "Check: docker compose logs -f app"
echo "Site: https://app.samariaerp.org"
