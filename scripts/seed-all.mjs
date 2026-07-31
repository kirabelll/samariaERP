/**
 * Full end-to-end seed for Samaria ERP
 * Creates all tables via raw SQL and inserts test data covering:
 *   - Aggregate, Cement, Medical, Finance workflows
 *   - All Sprint 1-2 workflow linkages
 */
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: '127.0.0.1', port: 5432,
  user: 'postgres', password: 'postgres', database: 'postgres',
});
await client.connect();

async function sql(query, params = []) {
  try {
    const r = await client.query(query, params);
    return r.rows;
  } catch (e) {
    console.error('SQL Error:', e.message, '\nQuery:', query.slice(0, 200));
    throw e;
  }
}

async function run() {
  console.log('\n📦 Creating tables...\n');
  await sql(`SET client_min_messages = WARNING`);

  // ─────────────────────────────────────────────
  // ENUMS
  // ─────────────────────────────────────────────
  await sql(`DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('ADMIN','MANAGER','PROCUREMENT','SALES','FINANCE','HR','MEDICAL_PHARMACIST','MEDICAL_DRUGGIST','WAREHOUSE','AUDITOR','USER','PORTAL_CUSTOMER');
    CREATE TYPE "UserStatus" AS ENUM ('ACTIVE','INACTIVE','SUSPENDED');
    CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING','APPROVED','REJECTED','CANCELLED');
    CREATE TYPE "Division" AS ENUM ('CONSTRUCTION','MEDICAL','BOTH');
    CREATE TYPE "CustomerType" AS ENUM ('COMPANY','INDIVIDUAL');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  // ─────────────────────────────────────────────
  // CORE TABLES
  // ─────────────────────────────────────────────
  await sql(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT UNIQUE, email TEXT UNIQUE,
    "passwordHash" TEXT, "firstName" TEXT, "middleName" TEXT, "lastName" TEXT,
    phone TEXT, role "Role" DEFAULT 'USER', department TEXT, branch TEXT,
    "profileImage" TEXT, "telegramChatId" TEXT, status "UserStatus" DEFAULT 'ACTIVE',
    "lastLogin" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY, name TEXT, "nameAmharic" TEXT, tin TEXT, phone TEXT,
    phone2 TEXT, email TEXT, website TEXT, location TEXT, "regNo" TEXT,
    withholding BOOLEAN DEFAULT false, "logoUrl" TEXT, "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY, name TEXT, location TEXT, phone TEXT,
    status TEXT DEFAULT 'Active', "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY, code TEXT UNIQUE, "customerType" "CustomerType",
    "companyName" TEXT, "firstName" TEXT, "lastName" TEXT, tin TEXT,
    phone TEXT, email TEXT, "contactPerson" TEXT, location TEXT,
    withholding BOOLEAN DEFAULT false, "withholdRate" FLOAT DEFAULT 2,
    "creditLimit" FLOAT DEFAULT 0, "creditTermDays" INT DEFAULT 0,
    status TEXT DEFAULT 'Active', "approvedBy" TEXT, "registeredBy" TEXT,
    division "Division" DEFAULT 'CONSTRUCTION',
    "licenseNo" TEXT, "licenseExpiry" TIMESTAMPTZ, "licenseType" TEXT,
    "medicalApproved" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY, code TEXT UNIQUE, "supplierType" TEXT DEFAULT 'company',
    "companyName" TEXT, "firstName" TEXT, "lastName" TEXT, tin TEXT,
    phone TEXT, email TEXT, "contactPerson" TEXT, location TEXT, category TEXT,
    withholding BOOLEAN DEFAULT false, "withholdRate" FLOAT DEFAULT 2,
    status TEXT DEFAULT 'Active', "registeredBy" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS supplier_banks (
    id TEXT PRIMARY KEY, "supplierId" TEXT, "bankName" TEXT, "accountNo" TEXT,
    "accountName" TEXT, branch TEXT, "isDefault" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS factories (
    id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT, "factoryType" TEXT,
    "suppliedMaterial" TEXT, location TEXT, phone TEXT, "contactPerson" TEXT,
    "useCoupons" BOOLEAN DEFAULT false, "weighbridgeReq" BOOLEAN DEFAULT true,
    terms TEXT, status TEXT DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS transporters (
    id TEXT PRIMARY KEY, code TEXT UNIQUE, "transporterType" TEXT DEFAULT 'company',
    "companyName" TEXT, "firstName" TEXT, "lastName" TEXT, tin TEXT,
    phone TEXT, email TEXT, "contactPerson" TEXT, location TEXT,
    withholding BOOLEAN DEFAULT false, "withholdRate" FLOAT DEFAULT 2,
    status TEXT DEFAULT 'Active', "registeredBy" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS trucks (
    id TEXT PRIMARY KEY, "plateNo" TEXT UNIQUE, "transporterId" TEXT,
    "ownerName" TEXT, "ownerPhone" TEXT, "ownerTin" TEXT,
    "truckType" TEXT, capacity FLOAT, "capacityUnit" TEXT,
    status TEXT DEFAULT 'Active', "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS transporter_agreements (
    id TEXT PRIMARY KEY, "agreementNo" TEXT UNIQUE, "transporterId" TEXT,
    "productType" TEXT, "validFrom" TIMESTAMPTZ, "validTo" TIMESTAMPTZ,
    terms TEXT, "loadingSite" TEXT, "offloadingSite" TEXT,
    "pricePerUnit" FLOAT, "unitType" TEXT, "associationServiceCharge" FLOAT DEFAULT 0,
    status TEXT DEFAULT 'Active', "createdBy" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS transporter_pricing (
    id TEXT PRIMARY KEY, "agreementId" TEXT, "truckCategory" TEXT,
    "holdingCapacity" FLOAT, "capacityUnit" TEXT DEFAULT 'm3',
    "unitPrice" FLOAT, "totalPrice" FLOAT
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT, "nameAmharic" TEXT,
    category TEXT, unit TEXT, "itemType" TEXT DEFAULT 'sales',
    division "Division" DEFAULT 'CONSTRUCTION',
    "batchTracked" BOOLEAN DEFAULT false, "expiryTracked" BOOLEAN DEFAULT false,
    manufacturer TEXT, "genericName" TEXT, strength TEXT, "dosageForm" TEXT,
    status TEXT DEFAULT 'Active', "registeredBy" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS stock_balances (
    id TEXT PRIMARY KEY, "itemId" TEXT, warehouse TEXT DEFAULT 'main',
    quantity FLOAT DEFAULT 0, "avgCost" FLOAT DEFAULT 0,
    "lastUpdated" TIMESTAMPTZ DEFAULT now(),
    UNIQUE("itemId", warehouse)
  )`);

  // ─────────────────────────────────────────────
  // AGGREGATE
  // ─────────────────────────────────────────────
  await sql(`CREATE TABLE IF NOT EXISTS aggregate_deliveries (
    id TEXT PRIMARY KEY, "dispatchNo" TEXT UNIQUE,
    "customerId" TEXT, "supplierId" TEXT, "transporterId" TEXT,
    "truckId" TEXT, "itemId" TEXT,
    "loadedVolume" FLOAT, "deliveredVolume" FLOAT, "shortageVolume" FLOAT,
    "transportRate" FLOAT, "aggregateValue" FLOAT,
    "grossTruckFee" FLOAT, "shortageDeduction" FLOAT, "netTruckPayment" FLOAT,
    "telegramProof" TEXT, "signedInvoice" TEXT,
    "dispatchDate" TIMESTAMPTZ DEFAULT now(), "deliveryDate" TIMESTAMPTZ,
    status TEXT DEFAULT 'Dispatched', "verifiedBy" TEXT, "registeredBy" TEXT
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS aggregate_proofs (
    id TEXT PRIMARY KEY, "deliveryId" TEXT, "proofType" TEXT,
    "fileUrl" TEXT, "uploadedBy" TEXT, "uploadedAt" TIMESTAMPTZ DEFAULT now(),
    notes TEXT
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS aggregate_settlements (
    id TEXT PRIMARY KEY, "settlementNo" TEXT UNIQUE,
    "transporterId" TEXT, "periodFrom" TIMESTAMPTZ, "periodTo" TIMESTAMPTZ,
    "deliveryIds" TEXT, -- JSON array
    "totalGrossFee" FLOAT, "totalShortageDeduction" FLOAT,
    "totalNetPayment" FLOAT, "associationFee" FLOAT DEFAULT 0,
    "finalPayment" FLOAT, status TEXT DEFAULT 'Draft',
    "approvedBy" TEXT, "approvedAt" TIMESTAMPTZ,
    "createdBy" TEXT, "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS truck_payments (
    id TEXT PRIMARY KEY, "paymentSheetNo" TEXT UNIQUE,
    "transporterId" TEXT, "periodFrom" TIMESTAMPTZ, "periodTo" TIMESTAMPTZ,
    "totalGrossFee" FLOAT, "totalDeductions" FLOAT, "netPayable" FLOAT,
    "settlementId" TEXT, status TEXT DEFAULT 'Draft',
    "approvedBy" TEXT, "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  // ─────────────────────────────────────────────
  // CEMENT
  // ─────────────────────────────────────────────
  await sql(`CREATE TABLE IF NOT EXISTS cement_purchases (
    id TEXT PRIMARY KEY, "purchaseNo" TEXT UNIQUE, "factoryId" TEXT,
    "cementType" TEXT, quantity FLOAT, "unitPrice" FLOAT, "totalAmount" FLOAT,
    "purchaseDate" TIMESTAMPTZ DEFAULT now(), status TEXT DEFAULT 'Active',
    notes TEXT, "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY, "couponNo" TEXT UNIQUE, "factoryId" TEXT,
    "purchaseId" TEXT, "customerId" TEXT, value FLOAT, status TEXT DEFAULT 'Available',
    "issuedAt" TIMESTAMPTZ, "usedAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS cement_liftings (
    id TEXT PRIMARY KEY, "liftingNo" TEXT UNIQUE,
    "factoryId" TEXT, "customerId" TEXT, "purchaseId" TEXT,
    "truckId" TEXT, "transporterId" TEXT, "couponId" TEXT,
    quantity FLOAT, "unitPrice" FLOAT, "totalAmount" FLOAT,
    "cementType" TEXT, "liftingDate" TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'Completed', notes TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS cement_weighbridges (
    id TEXT PRIMARY KEY, "weighbridgeNo" TEXT UNIQUE,
    "liftingId" TEXT, "weighbridgeType" TEXT,
    "truckPlateNo" TEXT, "grossWeight" FLOAT, "tareWeight" FLOAT, "netWeight" FLOAT,
    "weighbridgeDate" TIMESTAMPTZ DEFAULT now(), "operatorName" TEXT,
    "proofImage" TEXT, verified BOOLEAN DEFAULT false, "verifiedBy" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS cement_balances (
    id TEXT PRIMARY KEY, "purchaseId" TEXT, "factoryId" TEXT,
    "initialQty" FLOAT, "liftedQty" FLOAT DEFAULT 0, "remainingQty" FLOAT DEFAULT 0,
    "lastUpdated" TIMESTAMPTZ DEFAULT now(),
    UNIQUE("purchaseId", "factoryId")
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS cement_penalties (
    id TEXT PRIMARY KEY, "penaltyNo" TEXT UNIQUE,
    "liftingId" TEXT, "transporterId" TEXT, "truckPlateNo" TEXT,
    "penaltyType" TEXT, "shortageQty" FLOAT DEFAULT 0,
    "penaltyRate" FLOAT DEFAULT 0, "penaltyAmount" FLOAT DEFAULT 0,
    "recoveryStatus" TEXT DEFAULT 'Pending', "recoveredAmount" FLOAT DEFAULT 0,
    "approvedBy" TEXT, notes TEXT,
    "penaltyDate" TIMESTAMPTZ DEFAULT now(), "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS transporter_recoveries (
    id TEXT PRIMARY KEY, "recoveryNo" TEXT UNIQUE, "transporterId" TEXT,
    "sourceModule" TEXT, "sourceId" TEXT, "description" TEXT,
    amount FLOAT, "recoveredAmount" FLOAT DEFAULT 0,
    status TEXT DEFAULT 'Pending', "dueDate" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  // ─────────────────────────────────────────────
  // MEDICAL
  // ─────────────────────────────────────────────
  await sql(`CREATE TABLE IF NOT EXISTS medical_requests (
    id TEXT PRIMARY KEY, "requestNo" TEXT UNIQUE,
    "customerId" TEXT, division "Division" DEFAULT 'MEDICAL',
    items TEXT, priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Submitted', "requestDate" TIMESTAMPTZ DEFAULT now(),
    "approvedBy" TEXT, notes TEXT, "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS medical_batches (
    id TEXT PRIMARY KEY, "itemId" TEXT, "batchNo" TEXT,
    "expiryDate" TIMESTAMPTZ, quantity FLOAT, "costPrice" FLOAT DEFAULT 0,
    warehouse TEXT DEFAULT 'medical_store', status TEXT DEFAULT 'Available',
    "receivedDate" TIMESTAMPTZ DEFAULT now(), "supplierId" TEXT,
    UNIQUE("itemId", "batchNo", warehouse)
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS medical_store_issues (
    id TEXT PRIMARY KEY, "issueNo" TEXT UNIQUE,
    "customerId" TEXT, items TEXT,
    status TEXT DEFAULT 'Draft', "issueDate" TIMESTAMPTZ DEFAULT now(),
    "issuedBy" TEXT, "deliveredAt" TIMESTAMPTZ,
    "invoiceId" TEXT, notes TEXT, "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS medical_pricing (
    id TEXT PRIMARY KEY, "itemId" TEXT, "customerId" TEXT,
    "totalCost" FLOAT, "recommendedPrice" FLOAT, "approvedPrice" FLOAT,
    "marginPct" FLOAT, "validFrom" TIMESTAMPTZ, "validTo" TIMESTAMPTZ,
    "approvedBy" TEXT, status TEXT DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS stock_adjustments (
    id TEXT PRIMARY KEY, "adjustmentNo" TEXT UNIQUE,
    "itemId" TEXT, "batchId" TEXT, warehouse TEXT DEFAULT 'main',
    "adjustmentType" TEXT, "previousQty" FLOAT, "newQty" FLOAT, difference FLOAT,
    reason TEXT, "approvedBy" TEXT, "adjustedBy" TEXT,
    "adjustmentDate" TIMESTAMPTZ DEFAULT now(), "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  // ─────────────────────────────────────────────
  // FINANCE
  // ─────────────────────────────────────────────
  await sql(`CREATE TABLE IF NOT EXISTS sales_agreements (
    id TEXT PRIMARY KEY, "agreementNo" TEXT UNIQUE, "customerId" TEXT,
    division "Division", items TEXT, "totalAmount" FLOAT,
    "validFrom" TIMESTAMPTZ, "validTo" TIMESTAMPTZ, terms TEXT,
    status TEXT DEFAULT 'Draft', "approvedBy" TEXT, "createdBy" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS proformas (
    id TEXT PRIMARY KEY, "proformaNo" TEXT UNIQUE, "customerId" TEXT,
    division "Division", items TEXT, subtotal FLOAT, "vatAmount" FLOAT,
    withholding FLOAT DEFAULT 0, "totalAmount" FLOAT, "validityDays" INT DEFAULT 15,
    terms TEXT, status TEXT DEFAULT 'Draft', "sentDate" TIMESTAMPTZ, "sentMethod" TEXT,
    "createdBy" TEXT, "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS sales_orders (
    id TEXT PRIMARY KEY, "orderNo" TEXT UNIQUE, "customerId" TEXT,
    "proformaId" TEXT, division "Division", items TEXT, "totalAmount" FLOAT,
    status TEXT DEFAULT 'Pending', "orderDate" TIMESTAMPTZ DEFAULT now(), "createdBy" TEXT
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS sales_invoices (
    id TEXT PRIMARY KEY, "invoiceNo" TEXT UNIQUE, "customerId" TEXT,
    "salesOrderId" TEXT, division "Division", items TEXT,
    subtotal FLOAT, "vatRate" FLOAT DEFAULT 15, "vatAmount" FLOAT,
    withholding FLOAT DEFAULT 0, "totalAmount" FLOAT,
    status TEXT DEFAULT 'Unpaid', "invoiceDate" TIMESTAMPTZ DEFAULT now(),
    "dueDate" TIMESTAMPTZ, "createdBy" TEXT
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS customer_payments (
    id TEXT PRIMARY KEY, "receiptNo" TEXT UNIQUE, "customerId" TEXT,
    "invoiceId" TEXT, amount FLOAT, "paymentMethod" TEXT,
    "bankName" TEXT, "refNo" TEXT, "depositSlip" TEXT,
    status TEXT DEFAULT 'Pending', "verifiedBy" TEXT,
    "paymentDate" TIMESTAMPTZ DEFAULT now(), "createdBy" TEXT
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS customer_deposits (
    id TEXT PRIMARY KEY, "depositNo" TEXT UNIQUE, "customerId" TEXT,
    amount FLOAT, "bankName" TEXT, "refNo" TEXT, "depositSlip" TEXT,
    status TEXT DEFAULT 'Unverified', "verifiedBy" TEXT,
    "depositDate" TIMESTAMPTZ DEFAULT now(), "appliedAmount" FLOAT DEFAULT 0,
    "unappliedAmount" FLOAT DEFAULT 0, notes TEXT, "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS deposit_applications (
    id TEXT PRIMARY KEY, "depositId" TEXT, "invoiceId" TEXT,
    "orderId" TEXT, amount FLOAT, "appliedBy" TEXT,
    "appliedAt" TIMESTAMPTZ DEFAULT now(), notes TEXT
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS payment_vouchers (
    id TEXT PRIMARY KEY, "voucherNo" TEXT UNIQUE,
    "voucherType" TEXT DEFAULT 'payment', -- payment, receipt
    "payeeName" TEXT, "payeeType" TEXT,
    "payeeId" TEXT, amount FLOAT,
    "paymentMethod" TEXT DEFAULT 'cash', -- cash, bank
    "bankId" TEXT, "bankName" TEXT, "refNo" TEXT, "chequeNo" TEXT,
    "accountCode" TEXT, description TEXT, "sourceModule" TEXT, "sourceId" TEXT,
    status TEXT DEFAULT 'Draft', "approvedBy" TEXT, "postedBy" TEXT,
    "voucherDate" TIMESTAMPTZ DEFAULT now(), "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT, type TEXT,
    "parentId" TEXT, balance FLOAT DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true, "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY, "entryNo" TEXT UNIQUE, description TEXT,
    "sourceModule" TEXT, "sourceId" TEXT, "postedBy" TEXT,
    "entryDate" TIMESTAMPTZ DEFAULT now(), "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS bank_accounts (
    id TEXT PRIMARY KEY, "accountNo" TEXT UNIQUE, "bankName" TEXT,
    "accountName" TEXT, branch TEXT, balance FLOAT DEFAULT 0,
    currency TEXT DEFAULT 'ETB', status TEXT DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS bank_transactions (
    id TEXT PRIMARY KEY, "transactionRef" TEXT UNIQUE, "bankId" TEXT,
    type TEXT, amount FLOAT, description TEXT, "voucherId" TEXT,
    "transactionDate" TIMESTAMPTZ DEFAULT now(), "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS vat_periods (
    id TEXT PRIMARY KEY, "periodName" TEXT, "startDate" TIMESTAMPTZ,
    "endDate" TIMESTAMPTZ, "outputVat" FLOAT DEFAULT 0, "inputVat" FLOAT DEFAULT 0,
    "netVat" FLOAT DEFAULT 0, status TEXT DEFAULT 'Open',
    "filedBy" TEXT, "filedDate" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS daily_cashes (
    id TEXT PRIMARY KEY, date TIMESTAMPTZ UNIQUE, "openingBalance" FLOAT DEFAULT 0,
    "totalReceipts" FLOAT DEFAULT 0, "totalPayments" FLOAT DEFAULT 0,
    "closingBalance" FLOAT DEFAULT 0, "physicalCount" FLOAT,
    status TEXT DEFAULT 'Open', "openedBy" TEXT, "closedBy" TEXT,
    "closedAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  // ─────────────────────────────────────────────
  // PROCUREMENT
  // ─────────────────────────────────────────────
  await sql(`CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY, "poNo" TEXT UNIQUE, "supplierId" TEXT,
    items TEXT, "totalAmount" FLOAT, status TEXT DEFAULT 'Draft',
    "approvedBy" TEXT, "orderDate" TIMESTAMPTZ DEFAULT now(), "createdBy" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS goods_receives (
    id TEXT PRIMARY KEY, "grnNo" TEXT UNIQUE, "supplierId" TEXT,
    "poId" TEXT, items TEXT, "totalAmount" FLOAT,
    status TEXT DEFAULT 'Received', "receivedDate" TIMESTAMPTZ DEFAULT now(),
    "receivedBy" TEXT, notes TEXT
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS supplier_payments (
    id TEXT PRIMARY KEY, "paymentNo" TEXT UNIQUE, "supplierId" TEXT,
    "poId" TEXT, "grnId" TEXT, amount FLOAT, "paymentMethod" TEXT DEFAULT 'bank',
    "bankId" TEXT, "refNo" TEXT, description TEXT,
    status TEXT DEFAULT 'Pending', "approvedBy" TEXT,
    "paymentDate" TIMESTAMPTZ DEFAULT now(), "voucherId" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  // ─────────────────────────────────────────────
  // HR / PAYROLL
  // ─────────────────────────────────────────────
  await sql(`CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY, "empNo" TEXT UNIQUE, "firstName" TEXT, "lastName" TEXT,
    phone TEXT, email TEXT, department TEXT, "jobTitle" TEXT,
    "basicSalary" FLOAT, "hireDate" TIMESTAMPTZ,
    "bankAccountNo" TEXT, "bankName" TEXT,
    status TEXT DEFAULT 'Active', "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS payroll_periods (
    id TEXT PRIMARY KEY, "periodName" TEXT, "periodFrom" TIMESTAMPTZ,
    "periodTo" TIMESTAMPTZ, status TEXT DEFAULT 'Draft',
    "approvedBy" TEXT, "releasedBy" TEXT, "releasedAt" TIMESTAMPTZ,
    "totalGross" FLOAT DEFAULT 0, "totalTax" FLOAT DEFAULT 0,
    "totalPension" FLOAT DEFAULT 0, "totalNet" FLOAT DEFAULT 0,
    "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS payroll_items (
    id TEXT PRIMARY KEY, "periodId" TEXT, "employeeId" TEXT,
    "basicSalary" FLOAT, "totalAllowance" FLOAT DEFAULT 0,
    "grossSalary" FLOAT, "incomeTax" FLOAT, "employeePension" FLOAT,
    "employerPension" FLOAT, "totalDeduction" FLOAT, "netSalary" FLOAT,
    status TEXT DEFAULT 'Pending', "voucherId" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS tax_tables (
    id TEXT PRIMARY KEY, "minIncome" FLOAT, "maxIncome" FLOAT,
    rate FLOAT, "deductionAmount" FLOAT, "effectiveFrom" TIMESTAMPTZ,
    status TEXT DEFAULT 'Active'
  )`);

  // ─────────────────────────────────────────────
  // EXCEPTIONS & APPROVALS
  // ─────────────────────────────────────────────
  await sql(`CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY, module TEXT, "recordId" TEXT,
    "requesterId" TEXT, "approverId" TEXT,
    status "ApprovalStatus" DEFAULT 'PENDING', notes TEXT,
    "requestedAt" TIMESTAMPTZ DEFAULT now(), "resolvedAt" TIMESTAMPTZ
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS exception_logs (
    id TEXT PRIMARY KEY, "exceptionNo" TEXT UNIQUE, module TEXT,
    "recordId" TEXT, "exceptionType" TEXT, description TEXT,
    severity TEXT DEFAULT 'Medium', status TEXT DEFAULT 'Open',
    "reportedBy" TEXT, "assignedTo" TEXT,
    "resolvedAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS commission_calculations (
    id TEXT PRIMARY KEY, "calculationNo" TEXT UNIQUE,
    "salespersonId" TEXT, "periodFrom" TIMESTAMPTZ, "periodTo" TIMESTAMPTZ,
    "totalSales" FLOAT, "commissionRate" FLOAT, "grossCommission" FLOAT,
    "adjustments" FLOAT DEFAULT 0, "netCommission" FLOAT,
    status TEXT DEFAULT 'Draft', "approvedBy" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY, key TEXT UNIQUE, value TEXT, description TEXT,
    "updatedAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY, "deliveryNo" TEXT UNIQUE, "customerId" TEXT,
    "salesOrderId" TEXT, division "Division", items TEXT,
    "driverName" TEXT, "truckPlateNo" TEXT, "deliveredTo" TEXT,
    "deliveryDate" TIMESTAMPTZ DEFAULT now(), status TEXT DEFAULT 'Pending',
    "registeredBy" TEXT
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS user_permissions (
    id TEXT PRIMARY KEY, "userId" TEXT, module TEXT, page TEXT,
    "canView" BOOLEAN DEFAULT false, "canCreate" BOOLEAN DEFAULT false,
    "canEdit" BOOLEAN DEFAULT false, "canDelete" BOOLEAN DEFAULT false,
    "canApprove" BOOLEAN DEFAULT false, "canPrint" BOOLEAN DEFAULT false,
    "canExport" BOOLEAN DEFAULT false, "canReverse" BOOLEAN DEFAULT false,
    "canClose" BOOLEAN DEFAULT false, "canUnlock" BOOLEAN DEFAULT false,
    UNIQUE("userId", module)
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY, "userId" TEXT, action TEXT, module TEXT,
    "recordId" TEXT, details TEXT, "ipAddress" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS bank_reconciliations (
    id TEXT PRIMARY KEY, "reconNo" TEXT UNIQUE, "bankId" TEXT,
    "periodFrom" TIMESTAMPTZ, "periodTo" TIMESTAMPTZ,
    "statementBalance" FLOAT, "bookBalance" FLOAT, "difference" FLOAT DEFAULT 0,
    status TEXT DEFAULT 'Open', "createdAt" TIMESTAMPTZ DEFAULT now()
  )`);

  console.log('✅ All tables created\n');

  // ─────────────────────────────────────────────
  // SEED DATA
  // ─────────────────────────────────────────────
  console.log('🌱 Seeding test data...\n');

  // IDs we'll reference
  const IDs = {
    user:        'user-admin-001',
    company:     'company-001',
    // Customers
    cust1:       'cust-001', cust2: 'cust-002', cust3: 'cust-003',
    // Suppliers
    supp1:       'supp-001', supp2: 'supp-002',
    // Factory
    factory1:    'factory-001',
    // Transporter
    trans1:      'trans-001',
    truck1:      'truck-001',
    agreement1:  'tagreement-001',
    // Items
    item_agg:    'item-agg-001',
    item_cem:    'item-cem-001',
    item_med:    'item-med-001',
    // Aggregate
    agg_del1:    'agg-del-001', agg_del2: 'agg-del-002',
    agg_set1:    'agg-set-001',
    truck_pay1:  'truck-pay-001',
    // Cement
    cem_purch1:  'cem-purch-001',
    cem_lift1:   'cem-lift-001',
    cem_wb1:     'cem-wb-001',
    cem_bal1:    'cem-bal-001',
    cem_pen1:    'cem-pen-001',
    // Medical
    med_req1:    'med-req-001',
    med_batch1:  'med-batch-001',
    med_issue1:  'med-issue-001',
    // Finance
    bank1:       'bank-001',
    inv1:        'inv-001', inv2: 'inv-002',
    order1:      'order-001',
    voucher1:    'voucher-001', voucher2: 'voucher-002', voucher3: 'voucher-003',
    vat_period1: 'vat-period-001',
    daily1:      'daily-001',
    deposit1:    'deposit-001',
    dep_app1:    'dep-app-001',
    // Procurement
    po1:         'po-001',
    grn1:        'grn-001',
    sup_pay1:    'sup-pay-001',
    // Payroll
    emp1:        'emp-001',
    payroll1:    'payroll-001',
    p_item1:     'pitem-001',
    // Commission
    commission1: 'comm-001',
    // Recovery
    recovery1:   'recovery-001',
  };

  // COMPANY
  await sql(`INSERT INTO companies(id,name,tin,phone,location) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING`,
    [IDs.company, 'Samaria Trading PLC', 'ETH-TIN-0001', '+251911000001', 'Addis Ababa, Ethiopia']);

  // ADMIN USER
  await sql(`INSERT INTO users(id,username,email,"passwordHash","firstName","lastName",role,department)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO NOTHING`,
    [IDs.user, 'admin', 'admin@samariaerp.org', '$2b$10$dummy', 'Samaria', 'Admin', 'ADMIN', 'Management']);

  // CUSTOMERS
  await sql(`INSERT INTO customers(id,code,"customerType","companyName",phone,division,status) VALUES
    ($1,'CUST-001','COMPANY','Addis Construction PLC','+251911001001','CONSTRUCTION','Active'),
    ($2,'CUST-002','COMPANY','Blue Nile Hospital','+251911001002','MEDICAL','Active'),
    ($3,'CUST-003','COMPANY','Mega Real Estate','+251911001003','CONSTRUCTION','Active')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.cust1, IDs.cust2, IDs.cust3]);

  // SUPPLIERS
  await sql(`INSERT INTO suppliers(id,code,"companyName",phone,category,status) VALUES
    ($1,'SUPP-001','Derba Micro Cement','+251911002001','Construction','Active'),
    ($2,'SUPP-002','Ethiopian Pharmaceuticals','+251911002002','Medicine/Medical','Active')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.supp1, IDs.supp2]);

  await sql(`INSERT INTO supplier_banks(id,"supplierId","bankName","accountNo","isDefault") VALUES
    ('sbank-001',$1,'Commercial Bank of Ethiopia','1000045678901',true)
    ON CONFLICT(id) DO NOTHING`,
    [IDs.supp1]);

  // FACTORY
  await sql(`INSERT INTO factories(id,code,name,"factoryType","suppliedMaterial",location,status) VALUES
    ($1,'FACT-001','Derba Cement Factory','cement','Type I Portland Cement','Muger, Oromia','Active')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.factory1]);

  // TRANSPORTER & TRUCK
  await sql(`INSERT INTO transporters(id,code,"companyName",phone,status) VALUES
    ($1,'TRANS-001','Habesha Transport Co.','+251911003001','Active')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.trans1]);

  await sql(`INSERT INTO trucks(id,"plateNo","transporterId","truckType",capacity,"capacityUnit",status) VALUES
    ($1,'AA-12345-A',$2,'Trailer',25,'m3','Active')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.truck1, IDs.trans1]);

  await sql(`INSERT INTO transporter_agreements(id,"agreementNo","transporterId","productType",
    "validFrom","validTo","pricePerUnit","unitType","associationServiceCharge",status) VALUES
    ($1,'TAGR-2026-001',$2,'aggregate','2026-01-01','2026-12-31',150,'m3',5,'Active')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.agreement1, IDs.trans1]);

  // ITEMS
  await sql(`INSERT INTO items(id,code,name,category,unit,"itemType",division,status) VALUES
    ($1,'ITM-AGG-001','River Sand (m3)','Aggregate','m3','sales','CONSTRUCTION','Active'),
    ($2,'ITM-CEM-001','Type I Portland Cement (50kg bag)','Cement','Bag','sales','CONSTRUCTION','Active'),
    ($3,'ITM-MED-001','Amoxicillin 500mg Capsules','Antibiotics','Box','medical','MEDICAL','Active')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.item_agg, IDs.item_cem, IDs.item_med]);

  // MEDICAL BATCH (for inventory)
  await sql(`INSERT INTO medical_batches(id,"itemId","batchNo","expiryDate",quantity,"costPrice",warehouse,status) VALUES
    ($1,$2,'BATCH-AMX-2026-01','2027-06-30',500,45,'medical_store','Available')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.med_batch1, IDs.item_med]);

  // BANK ACCOUNT
  await sql(`INSERT INTO bank_accounts(id,"accountNo","bankName","accountName",branch,balance,status) VALUES
    ($1,'1000098765432','Commercial Bank of Ethiopia','Samaria Trading - Main','Bole, Addis Ababa',850000,'Active')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.bank1]);

  // ─────────────────────────────────────────────
  // WORKFLOW 1: AGGREGATE end-to-end
  //   Dispatch → Deliver → Verify → Settlement (Approved) → TruckPayment Batch → Post
  // ─────────────────────────────────────────────
  console.log('  → Aggregate workflow...');

  await sql(`INSERT INTO aggregate_deliveries(id,"dispatchNo","customerId","supplierId","transporterId","truckId","itemId",
    "loadedVolume","deliveredVolume","shortageVolume","transportRate","aggregateValue",
    "grossTruckFee","shortageDeduction","netTruckPayment","dispatchDate","deliveryDate",status,"registeredBy") VALUES
    ($1,'DSP-2026-0001',$2,$3,$4,$5,$6,25,24.2,0.8,150,800,3630,640,2990,'2026-03-20 08:00','2026-03-20 14:00','Verified','admin'),
    ($7,'DSP-2026-0002',$2,$3,$4,$5,$6,25,25,0,150,800,3750,0,3750,'2026-03-21 08:00','2026-03-21 15:00','Verified','admin')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.agg_del1, IDs.cust1, IDs.supp1, IDs.trans1, IDs.truck1, IDs.item_agg,
     IDs.agg_del2]);

  await sql(`INSERT INTO aggregate_settlements(id,"settlementNo","transporterId",
    "periodFrom","periodTo","deliveryIds","totalGrossFee","totalShortageDeduction",
    "totalNetPayment","associationFee","finalPayment",status,"approvedBy","approvedAt","createdBy") VALUES
    ($1,'SETL-2026-001',$2,'2026-03-20','2026-03-21',
    $3,7380,640,6740,337,6403,'Approved','admin',now(),'admin')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.agg_set1, IDs.trans1, JSON.stringify([IDs.agg_del1, IDs.agg_del2])]);

  await sql(`INSERT INTO truck_payments(id,"paymentSheetNo","transporterId","periodFrom","periodTo",
    "totalGrossFee","totalDeductions","netPayable","settlementId",status,"approvedBy") VALUES
    ($1,'TPAY-2026-001',$2,'2026-03-20','2026-03-21',7380,977,6403,$3,'Posted','admin')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.truck_pay1, IDs.trans1, IDs.agg_set1]);

  // ─────────────────────────────────────────────
  // WORKFLOW 2: CEMENT end-to-end
  //   Purchase → Lifting → WeighBridge → Balance → Penalty
  // ─────────────────────────────────────────────
  console.log('  → Cement workflow...');

  await sql(`INSERT INTO cement_purchases(id,"purchaseNo","factoryId","cementType",
    quantity,"unitPrice","totalAmount","purchaseDate",status) VALUES
    ($1,'CPUR-2026-001',$2,'Type I Portland',1000,680,680000,'2026-03-01',
    'Active') ON CONFLICT(id) DO NOTHING`,
    [IDs.cem_purch1, IDs.factory1]);

  await sql(`INSERT INTO cement_liftings(id,"liftingNo","factoryId","customerId","purchaseId",
    "truckId","transporterId",quantity,"unitPrice","totalAmount","cementType","liftingDate",status) VALUES
    ($1,'CLFT-2026-001',$2,$3,$4,$5,$6,200,680,136000,'Type I','2026-03-10','Completed')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.cem_lift1, IDs.factory1, IDs.cust1, IDs.cem_purch1, IDs.truck1, IDs.trans1]);

  await sql(`INSERT INTO cement_weighbridges(id,"weighbridgeNo","liftingId","weighbridgeType",
    "truckPlateNo","grossWeight","tareWeight","netWeight","operatorName",verified,"weighbridgeDate") VALUES
    ($1,'WB-20260310-0001',$2,'FACTORY','AA-12345-A',45200,5200,40000,'Abebe Bekele',true,'2026-03-10')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.cem_wb1, IDs.cem_lift1]);

  await sql(`INSERT INTO cement_balances(id,"purchaseId","factoryId","initialQty","liftedQty","remainingQty") VALUES
    ($1,$2,$3,1000,200,800) ON CONFLICT(id) DO NOTHING`,
    [IDs.cem_bal1, IDs.cem_purch1, IDs.factory1]);

  await sql(`INSERT INTO cement_penalties(id,"penaltyNo","liftingId","transporterId","truckPlateNo",
    "penaltyType","shortageQty","penaltyRate","penaltyAmount","recoveryStatus","recoveredAmount","penaltyDate") VALUES
    ($1,'PEN-20260312-0001',$2,$3,'AA-12345-A','SHORTAGE',2,500,1000,'Pending',0,'2026-03-12')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.cem_pen1, IDs.cem_lift1, IDs.trans1]);

  // ─────────────────────────────────────────────
  // WORKFLOW 3: MEDICAL end-to-end
  //   Request → Quote → Approve → Store Issue → Delivery → Invoice
  // ─────────────────────────────────────────────
  console.log('  → Medical workflow...');

  await sql(`INSERT INTO medical_requests(id,"requestNo","customerId",items,priority,status,"requestDate") VALUES
    ($1,'MED-2026-001',$2,$3,'High','Approved','2026-03-15')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.med_req1, IDs.cust2, JSON.stringify([{itemId: IDs.item_med, qty: 50, unitPrice: 85}])]);

  await sql(`INSERT INTO medical_store_issues(id,"issueNo","customerId",items,status,"issueDate","issuedBy") VALUES
    ($1,'ISSUE-2026-001',$2,$3,'Delivered','2026-03-16','admin')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.med_issue1, IDs.cust2, JSON.stringify([{itemId: IDs.item_med, batchNo: 'BATCH-AMX-2026-01', qty: 50}])]);

  // Medical Sales Invoice
  await sql(`INSERT INTO sales_invoices(id,"invoiceNo","customerId",division,items,
    subtotal,"vatRate","vatAmount",withholding,"totalAmount",status,"invoiceDate","dueDate") VALUES
    ($1,'MINV-2026-001',$2,'MEDICAL',$3,4250,15,637.5,0,4887.5,'Unpaid','2026-03-16','2026-04-15')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.inv1, IDs.cust2, JSON.stringify([{itemId: IDs.item_med, qty: 50, unitPrice: 85}])]);

  // Update store issue with invoice link
  await sql(`UPDATE medical_store_issues SET "invoiceId"=$1 WHERE id=$2`, [IDs.inv1, IDs.med_issue1]);

  // ─────────────────────────────────────────────
  // WORKFLOW 4: FINANCE — Sales Invoice → Payment → Ledger
  // ─────────────────────────────────────────────
  console.log('  → Finance workflow...');

  // Construction Sales Order + Invoice
  await sql(`INSERT INTO sales_orders(id,"orderNo","customerId",division,items,"totalAmount",status) VALUES
    ($1,'ORD-2026-001',$2,'CONSTRUCTION',$3,115000,'Delivered')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.order1, IDs.cust1, JSON.stringify([{itemId: IDs.item_cem, qty: 100, unitPrice: 1000}])]);

  await sql(`INSERT INTO sales_invoices(id,"invoiceNo","customerId","salesOrderId",division,items,
    subtotal,"vatRate","vatAmount",withholding,"totalAmount",status,"invoiceDate","dueDate") VALUES
    ($1,'INV-2026-001',$2,$3,'CONSTRUCTION',$4,100000,15,15000,0,115000,'Paid','2026-03-10','2026-04-10')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.inv2, IDs.cust1, IDs.order1, JSON.stringify([{itemId: IDs.item_cem, qty: 100, unitPrice: 1000}])]);

  await sql(`INSERT INTO customer_payments(id,"receiptNo","customerId","invoiceId",
    amount,"paymentMethod","bankName","refNo",status,"verifiedBy","paymentDate") VALUES
    ($1,'RCP-2026-001',$2,$3,115000,'bank_transfer','CBE','TRF-20260312-001','Verified','admin','2026-03-12')
    ON CONFLICT(id) DO NOTHING`,
    ['cpay-001', IDs.cust1, IDs.inv2]);

  // VAT Period (March 2026)
  await sql(`INSERT INTO vat_periods(id,"periodName","startDate","endDate","outputVat","inputVat","netVat",status) VALUES
    ($1,'2026-03','2026-03-01','2026-03-31',17137.5,0,17137.5,'Open')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.vat_period1]);

  // Daily Cash register
  await sql(`INSERT INTO daily_cashes(id,date,"openingBalance","totalReceipts","totalPayments","closingBalance",status,"openedBy") VALUES
    ($1,'2026-03-31',50000,25000,18500,56500,'Open','admin')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.daily1]);

  // ─────────────────────────────────────────────
  // WORKFLOW 5: SUPPLIER PAYMENT
  //   PO → GRN → Supplier Payment (Pending→Approved→Voucher→Bank Posted)
  // ─────────────────────────────────────────────
  console.log('  → Supplier payment workflow...');

  await sql(`INSERT INTO purchase_orders(id,"poNo","supplierId",items,"totalAmount",status,"approvedBy") VALUES
    ($1,'PO-2026-001',$2,$3,680000,'Approved','admin')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.po1, IDs.supp1, JSON.stringify([{itemId: IDs.item_cem, qty: 1000, unitPrice: 680}])]);

  await sql(`INSERT INTO goods_receives(id,"grnNo","supplierId","poId",items,"totalAmount",status,"receivedBy") VALUES
    ($1,'GRN-2026-001',$2,$3,$4,680000,'Received','admin')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.grn1, IDs.supp1, IDs.po1, JSON.stringify([{itemId: IDs.item_cem, qty: 1000}])]);

  await sql(`INSERT INTO supplier_payments(id,"paymentNo","supplierId","poId","grnId",
    amount,"paymentMethod","bankId",description,status,"approvedBy","paymentDate","voucherId") VALUES
    ($1,'SPAY-2026-001',$2,$3,$4,680000,'bank',$5,
    'Payment for cement purchase PO-2026-001','Posted','admin','2026-03-15',$6)
    ON CONFLICT(id) DO NOTHING`,
    [IDs.sup_pay1, IDs.supp1, IDs.po1, IDs.grn1, IDs.bank1, IDs.voucher1]);

  await sql(`INSERT INTO payment_vouchers(id,"voucherNo","voucherType","payeeName","payeeType","payeeId",
    amount,"paymentMethod","bankId","bankName","refNo",description,"sourceModule","sourceId",
    status,"approvedBy","postedBy","voucherDate") VALUES
    ($1,'PV-2026-001','payment','Derba Micro Cement','supplier',$2,
    680000,'bank',$3,'CBE','TRF-20260315-001',
    'Supplier payment - cement purchase','SUPPLIER_PAYMENT',$4,
    'Posted','admin','admin','2026-03-15')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.voucher1, IDs.supp1, IDs.bank1, IDs.sup_pay1]);

  // ─────────────────────────────────────────────
  // WORKFLOW 6: CUSTOMER DEPOSIT
  //   Deposit Slip → Finance Verify → Unapplied → Apply to Invoice
  // ─────────────────────────────────────────────
  console.log('  → Customer deposit workflow...');

  await sql(`INSERT INTO customer_deposits(id,"depositNo","customerId",
    amount,"bankName","refNo",status,"verifiedBy","depositDate","appliedAmount","unappliedAmount",notes) VALUES
    ($1,'DEP-2026-001',$2,50000,'CBE','DEP-SLIP-001','Verified',
    'admin','2026-03-18',4887.5,45112.5,'Partial application to medical invoice')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.deposit1, IDs.cust2]);

  await sql(`INSERT INTO deposit_applications(id,"depositId","invoiceId",amount,"appliedBy","appliedAt",notes) VALUES
    ($1,$2,$3,4887.5,'admin','2026-03-18','Applied to medical invoice MINV-2026-001')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.dep_app1, IDs.deposit1, IDs.inv1]);

  // Update medical invoice to Paid after deposit application
  await sql(`UPDATE sales_invoices SET status='Paid' WHERE id=$1`, [IDs.inv1]);

  // ─────────────────────────────────────────────
  // WORKFLOW 7: PAYROLL RELEASE
  //   Approved Payroll → Release → Tax/Pension Payable → Bank Posted
  // ─────────────────────────────────────────────
  console.log('  → Payroll workflow...');

  await sql(`INSERT INTO employees(id,"empNo","firstName","lastName",phone,department,"jobTitle",
    "basicSalary","hireDate","bankAccountNo","bankName",status) VALUES
    ($1,'EMP-001','Abebe','Kebede','+251911004001','Operations','Logistics Manager',
    8500,'2023-01-15','1000023456789','CBE','Active')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.emp1]);

  await sql(`INSERT INTO payroll_periods(id,"periodName","periodFrom","periodTo",
    "totalGross","totalTax","totalPension","totalNet",status,"approvedBy","releasedBy","releasedAt") VALUES
    ($1,'March 2026','2026-03-01','2026-03-31',8500,1095,595,6810,'Released','admin','admin',now())
    ON CONFLICT(id) DO NOTHING`,
    [IDs.payroll1]);

  await sql(`INSERT INTO payroll_items(id,"periodId","employeeId","basicSalary","totalAllowance",
    "grossSalary","incomeTax","employeePension","employerPension","totalDeduction","netSalary",status,"voucherId") VALUES
    ($1,$2,$3,8500,0,8500,1095,595,935,1690,6810,'Released',$4)
    ON CONFLICT(id) DO NOTHING`,
    [IDs.p_item1, IDs.payroll1, IDs.emp1, IDs.voucher2]);

  await sql(`INSERT INTO payment_vouchers(id,"voucherNo","voucherType","payeeName","payeeType","payeeId",
    amount,"paymentMethod","bankId","bankName",description,"sourceModule","sourceId",
    status,"approvedBy","postedBy","voucherDate") VALUES
    ($1,'PV-2026-002','payment','Abebe Kebede','employee',$2,
    6810,'bank',$3,'CBE','March 2026 salary','PAYROLL',$4,
    'Posted','admin','admin','2026-03-31')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.voucher2, IDs.emp1, IDs.bank1, IDs.payroll1]);

  // ─────────────────────────────────────────────
  // WORKFLOW 8: VAT PAYMENT WORKFLOW
  //   Filed Period → Government Payable → PV → Bank Posted → Lock
  // ─────────────────────────────────────────────
  console.log('  → VAT payment workflow...');

  // A second VAT period that is Filed
  await sql(`INSERT INTO vat_periods(id,"periodName","startDate","endDate","outputVat","inputVat","netVat",status,"filedBy","filedDate") VALUES
    ('vat-period-002','2026-02','2026-02-01','2026-02-28',95000,42000,53000,'Filed','admin','2026-03-10')
    ON CONFLICT(id) DO NOTHING`);

  await sql(`INSERT INTO payment_vouchers(id,"voucherNo","voucherType","payeeName","payeeType",
    amount,"paymentMethod","bankId","bankName","refNo",description,"sourceModule","sourceId",
    status,"approvedBy","postedBy","voucherDate") VALUES
    ($1,'PV-2026-003','payment','Ethiopian Revenue and Customs Authority','government',
    53000,'bank',$2,'CBE','VAT-FEB-2026',
    'VAT payment February 2026','VAT','vat-period-002',
    'Posted','admin','admin','2026-03-10')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.voucher3, IDs.bank1]);

  // Lock the period after payment
  await sql(`UPDATE vat_periods SET status='Locked' WHERE id='vat-period-002'`);

  // ─────────────────────────────────────────────
  // WORKFLOW 9: TRANSPORTER RECOVERY
  //   Shortage/Penalty → Receivable Register → Follow-up
  // ─────────────────────────────────────────────
  console.log('  → Transporter recovery workflow...');

  await sql(`INSERT INTO transporter_recoveries(id,"recoveryNo","transporterId","sourceModule","sourceId",
    description,amount,"recoveredAmount",status,"dueDate") VALUES
    ($1,'REC-2026-001',$2,'CEMENT_PENALTY',$3,
    'Shortage penalty recovery - CLFT-2026-001',1000,0,'Pending','2026-04-15')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.recovery1, IDs.trans1, IDs.cem_pen1]);

  // ─────────────────────────────────────────────
  // WORKFLOW 10: ASSOCIATION COMMISSION PAYMENT
  //   Settlement totals × 5% → Commission Record → Approval → Payment
  // ─────────────────────────────────────────────
  console.log('  → Commission workflow...');

  await sql(`INSERT INTO commission_calculations(id,"calculationNo","salespersonId",
    "periodFrom","periodTo","totalSales","commissionRate","grossCommission","adjustments","netCommission",
    status,"approvedBy") VALUES
    ($1,'COMM-2026-001',$2,'2026-03-01','2026-03-31',
    115000,5,5750,0,5750,'Approved','admin')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.commission1, IDs.user]);

  // Commission payment voucher
  await sql(`INSERT INTO payment_vouchers(id,"voucherNo","voucherType","payeeName","payeeType","payeeId",
    amount,"paymentMethod","bankId","bankName",description,"sourceModule","sourceId",
    status,"approvedBy","postedBy","voucherDate") VALUES
    ('voucher-comm-001','PV-2026-004','payment','Habesha Transport Co.','transporter',$1,
    337,'bank',$2,'CBE','Association service charge March 2026','COMMISSION',$3,
    'Posted','admin','admin','2026-03-31')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.trans1, IDs.bank1, IDs.commission1]);

  // ─────────────────────────────────────────────
  // EXCEPTION LOGS
  // ─────────────────────────────────────────────
  console.log('  → Exception logs...');

  await sql(`INSERT INTO exception_logs(id,"exceptionNo",module,"recordId","exceptionType",description,severity,status,"reportedBy") VALUES
    ('exc-001','EXC-2026-001','AGGREGATE',$1,'SHORTAGE','Truck AA-12345-A delivered 0.8m3 short on dispatch DSP-2026-0001','Medium','Open','admin'),
    ('exc-002','EXC-2026-002','CEMENT',$2,'SHORTAGE','2 bags shortage on lifting CLFT-2026-001','Low','Open','admin')
    ON CONFLICT(id) DO NOTHING`,
    [IDs.agg_del1, IDs.cem_lift1]);

  // SYSTEM SETTINGS
  await sql(`INSERT INTO system_settings(id,key,value,description) VALUES
    ('sys-001','company_name','Samaria Trading PLC','Company display name'),
    ('sys-002','currency','ETB','Default currency'),
    ('sys-003','vat_rate','15','Standard VAT rate (%)'),
    ('sys-004','pension_employee','7','Employee pension contribution (%)'),
    ('sys-005','pension_employer','11','Employer pension contribution (%)'),
    ('sys-006','withholding_rate','2','Default withholding tax rate (%)')
    ON CONFLICT(id) DO NOTHING`);

  // CHART OF ACCOUNTS (basic)
  await sql(`INSERT INTO chart_of_accounts(id,code,name,type,balance) VALUES
    ('coa-001','1000','Cash and Bank','asset',906500),
    ('coa-002','1100','Accounts Receivable','asset',115000),
    ('coa-003','2000','Accounts Payable','liability',0),
    ('coa-004','2100','VAT Payable','liability',17137.5),
    ('coa-005','3000','Revenue','income',119887.5),
    ('coa-006','5000','Cost of Goods Sold','expense',680000),
    ('coa-007','6000','Salaries Expense','expense',8500)
    ON CONFLICT(id) DO NOTHING`);

  console.log('\n✅ All seed data inserted successfully!\n');

  // Summary
  const tables = [
    'users','customers','suppliers','factories','transporters','trucks',
    'items','medical_batches',
    'aggregate_deliveries','aggregate_settlements','truck_payments',
    'cement_purchases','cement_liftings','cement_weighbridges','cement_balances','cement_penalties',
    'medical_requests','medical_store_issues','sales_invoices',
    'payment_vouchers','customer_deposits','deposit_applications',
    'purchase_orders','goods_receives','supplier_payments',
    'employees','payroll_periods','payroll_items',
    'vat_periods','daily_cashes','transporter_recoveries',
    'commission_calculations','exception_logs','system_settings',
  ];

  console.log('📊 Record counts:');
  for (const t of tables) {
    try {
      const r = await sql(`SELECT count(*) FROM ${t}`);
      console.log(`   ${t.padEnd(35)} ${r[0].count}`);
    } catch {}
  }
}

await run();
await client.end();
console.log('\n🎉 Seeding complete. Start dev server: npm run dev\n');
