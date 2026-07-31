/**
 * Accounting Helper Library
 * Provides standardized Chart of Account codes and auto-journal entry creation.
 * Used across all modules for consistent double-entry bookkeeping.
 */

import { prisma } from '@/lib/prisma';

// ============================================================
// Standard Account Codes (matches seed data)
// ============================================================
export const ACCOUNTS = {
  // Assets (1xxx)
  CASH:                '1010',
  BANK:                '1020',
  ACCOUNTS_RECEIVABLE: '1030',
  INVENTORY:           '1040',
  CEMENT_INVENTORY:    '1050',

  // Liabilities (2xxx)
  ACCOUNTS_PAYABLE:    '2010',
  VAT_OUTPUT:          '2020',  // VAT collected on sales (output VAT)
  VAT_INPUT:           '2030',  // VAT paid on purchases (input VAT) - asset-like but kept in liabilities for netting
  WITHHOLDING_TAX:     '2040',
  CUSTOMER_DEPOSITS:   '2050',

  // Equity (3xxx)
  CAPITAL:             '3010',
  RETAINED_EARNINGS:   '3020',

  // Revenue (4xxx)
  SALES_REVENUE:       '4000',
  PRODUCT_SALES:       '4010',
  SERVICE_INCOME:      '4020',
  CEMENT_SALES:        '4030',

  // Expenses (5xxx)
  COGS:                '5010',
  CEMENT_COGS:         '5050',
  SALARIES:            '5020',
  TRANSPORT_EXPENSE:   '5060',
  OPERATING_EXPENSE:   '5000',
};

// ============================================================
// Account Lookup
// ============================================================

/**
 * Find a ChartOfAccount by exact code. Returns the account ID or null.
 */
export async function findAccountByCode(code: string): Promise<string | null> {
  const account = await prisma.chartOfAccount.findFirst({
    where: { accountCode: code, isActive: true },
  });
  return account?.id || null;
}

/**
 * Find a ChartOfAccount by code, with fallback to name search.
 * Throws if not found (use when account is required).
 */
export async function requireAccount(code: string, fallbackName?: string): Promise<string> {
  // Try exact code
  let account = await prisma.chartOfAccount.findFirst({
    where: { accountCode: code, isActive: true },
  });
  if (account) return account.id;

  // Try name fallback
  if (fallbackName) {
    account = await prisma.chartOfAccount.findFirst({
      where: { accountName: { contains: fallbackName, mode: 'insensitive' }, isActive: true },
    });
    if (account) return account.id;
  }

  throw new Error(`Chart of Account not found: code=${code}, name=${fallbackName || 'N/A'}`);
}

// ============================================================
// Journal Entry Creation
// ============================================================

interface JournalLine {
  accountCode: string;
  accountFallbackName?: string;
  debit: number;
  credit: number;
  description: string;
}

interface CreateJournalOptions {
  lines: JournalLine[];
  refModule: string;
  refId: string;
  postedBy?: string;
}

/**
 * Create double-entry journal entries from a set of lines.
 * Validates that debits = credits. Generates a JE-XXXXXXX voucher number.
 * Returns the journal voucher number and created entries.
 *
 * If accounts are not found, returns { created: false } with reason.
 */
export async function createJournalEntries(options: CreateJournalOptions) {
  const { lines, refModule, refId, postedBy } = options;

  // Validate debit = credit
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    console.error(`Journal imbalanced: debit=${totalDebit}, credit=${totalCredit}`);
    return { created: false, reason: `Journal entries not balanced: debit=${totalDebit}, credit=${totalCredit}` };
  }

  // Skip zero-amount journals
  if (totalDebit === 0) {
    return { created: false, reason: 'Zero amount — no journal needed' };
  }

  // Resolve all account IDs
  const resolvedLines: Array<{ accountId: string; debit: number; credit: number; description: string }> = [];
  for (const line of lines) {
    if (line.debit === 0 && line.credit === 0) continue; // skip zero lines
    try {
      const accountId = await requireAccount(line.accountCode, line.accountFallbackName);
      resolvedLines.push({
        accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
      });
    } catch (err: any) {
      console.warn(`Auto-journal skipped for ${refModule}/${refId}: ${err.message}`);
      return {
        created: false,
        reason: `Missing account: ${line.accountCode} (${line.accountFallbackName || 'N/A'}). Set up Chart of Accounts first.`,
      };
    }
  }

  // Generate journal voucher number
  const count = await prisma.journalEntry.count();
  const voucherNo = `JE-${String(Math.floor(count / 2) + 1).padStart(7, '0')}`;

  // Create all entries
  const entries = await Promise.all(
    resolvedLines.map((line) =>
      prisma.journalEntry.create({
        data: {
          voucherNo,
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          description: line.description,
          refModule,
          refId,
          postedBy: postedBy || 'system',
        },
      })
    )
  );

  return { created: true, voucherNo, entries };
}

// ============================================================
// Module-Specific Auto-Journal Functions
// ============================================================

/**
 * Cement Purchase Approved → Debit Cement Inventory, Credit Accounts Payable
 * Also records VAT Input if purchase has VAT.
 */
export async function journalCementPurchaseApproved(purchase: any) {
  try {
    const amount = Number(purchase.totalAmount) || 0;
    if (amount <= 0) return { created: false, reason: 'Zero amount' };

    // Calculate VAT if applicable (15% is standard Ethiopian VAT)
    const vatAmount = Number(purchase.vatAmount) || 0;
    const netAmount = vatAmount > 0 ? amount - vatAmount : amount;

    const lines: JournalLine[] = [
      {
        accountCode: ACCOUNTS.CEMENT_INVENTORY,
        accountFallbackName: 'Cement Inventory',
        debit: netAmount,
        credit: 0,
        description: `Cement purchase ${purchase.purchaseNo} — ${purchase.factory?.name || 'Factory'}`,
      },
    ];

    // Add VAT Input line if applicable
    if (vatAmount > 0) {
      lines.push({
        accountCode: ACCOUNTS.VAT_INPUT,
        accountFallbackName: 'VAT Input',
        debit: vatAmount,
        credit: 0,
        description: `VAT on cement purchase ${purchase.purchaseNo}`,
      });
    }

    lines.push({
      accountCode: ACCOUNTS.ACCOUNTS_PAYABLE,
      accountFallbackName: 'Accounts Payable',
      debit: 0,
      credit: amount,
      description: `Cement purchase ${purchase.purchaseNo} — ${purchase.factory?.name || 'Factory'}`,
    });

    return await createJournalEntries({
      lines,
      refModule: 'CEMENT_PURCHASE',
      refId: purchase.id,
    });
  } catch (error: any) {
    console.error('Auto-journal for cement purchase failed:', error);
    return { created: false, reason: error.message };
  }
}

/**
 * Sales Invoice Created → Debit Accounts Receivable, Credit Sales Revenue + VAT Output
 * If withholding tax applies, reduces receivable accordingly.
 */
export async function journalSalesInvoice(invoice: any) {
  try {
    const totalAmount = Number(invoice.totalAmount) || 0;
    if (totalAmount <= 0) return { created: false, reason: 'Zero amount' };

    const subtotal = Number(invoice.subtotal) || totalAmount;
    const vatAmount = Number(invoice.vatAmount) || 0;
    const withholding = Number(invoice.withholding) || 0;
    const netReceivable = totalAmount - withholding;
    const invoiceRef = `Invoice ${invoice.invoiceNo}`;

    const lines: JournalLine[] = [];

    // Debit: Accounts Receivable (net of withholding)
    if (netReceivable > 0) {
      lines.push({
        accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE,
        accountFallbackName: 'Accounts Receivable',
        debit: netReceivable,
        credit: 0,
        description: invoiceRef,
      });
    }

    // Debit: Withholding Tax Receivable (if applicable)
    if (withholding > 0) {
      lines.push({
        accountCode: ACCOUNTS.WITHHOLDING_TAX,
        accountFallbackName: 'Withholding Tax',
        debit: withholding,
        credit: 0,
        description: `Withholding on ${invoiceRef}`,
      });
    }

    // Credit: Sales Revenue (subtotal before VAT)
    const revenueCode = (invoice.division || '').toUpperCase() === 'CEMENT' ? ACCOUNTS.CEMENT_SALES : ACCOUNTS.PRODUCT_SALES;
    lines.push({
      accountCode: revenueCode,
      accountFallbackName: 'Sales Revenue',
      debit: 0,
      credit: subtotal,
      description: invoiceRef,
    });

    // Credit: VAT Output Payable
    if (vatAmount > 0) {
      lines.push({
        accountCode: ACCOUNTS.VAT_OUTPUT,
        accountFallbackName: 'VAT Output',
        debit: 0,
        credit: vatAmount,
        description: `VAT on ${invoiceRef}`,
      });
    }

    return await createJournalEntries({
      lines,
      refModule: 'SALES_INVOICE',
      refId: invoice.id,
    });
  } catch (error: any) {
    console.error('Auto-journal for sales invoice failed:', error);
    return { created: false, reason: error.message };
  }
}

/**
 * Cement Lifting → Debit COGS, Credit Cement Inventory
 * Uses factoryWeight × unitPrice from the linked purchase.
 */
export async function journalCementLifting(lifting: any) {
  try {
    const weight = Number(lifting.factoryWeight) || 0;
    const unitPrice = Number(lifting.purchase?.unitPrice) || 0;
    const amount = weight * unitPrice;
    if (amount <= 0) return { created: false, reason: 'Zero amount (no weight or unit price)' };

    const liftingRef = `Cement lifting ${lifting.liftingNo}`;

    return await createJournalEntries({
      lines: [
        {
          accountCode: ACCOUNTS.CEMENT_COGS,
          accountFallbackName: 'Cost of Goods Sold',
          debit: amount,
          credit: 0,
          description: liftingRef,
        },
        {
          accountCode: ACCOUNTS.CEMENT_INVENTORY,
          accountFallbackName: 'Cement Inventory',
          debit: 0,
          credit: amount,
          description: liftingRef,
        },
      ],
      refModule: 'CEMENT_LIFTING',
      refId: lifting.id,
    });
  } catch (error: any) {
    console.error('Auto-journal for cement lifting failed:', error);
    return { created: false, reason: error.message };
  }
}

/**
 * Supplier Payment → Debit Accounts Payable, Credit Cash/Bank
 */
export async function journalSupplierPayment(payment: any) {
  try {
    const amount = Number(payment.amount) || 0;
    if (amount <= 0) return { created: false, reason: 'Zero amount' };

    const cashOrBank = payment.paymentMethod === 'cash' ? ACCOUNTS.CASH : ACCOUNTS.BANK;
    const cashOrBankName = payment.paymentMethod === 'cash' ? 'Cash' : 'Bank';
    const paymentRef = `Supplier payment ${payment.paymentNo} — ${payment.supplier?.companyName || ''}`;

    return await createJournalEntries({
      lines: [
        {
          accountCode: ACCOUNTS.ACCOUNTS_PAYABLE,
          accountFallbackName: 'Accounts Payable',
          debit: amount,
          credit: 0,
          description: paymentRef,
        },
        {
          accountCode: cashOrBank,
          accountFallbackName: cashOrBankName,
          debit: 0,
          credit: amount,
          description: paymentRef,
        },
      ],
      refModule: 'SUPPLIER_PAYMENT',
      refId: payment.id,
    });
  } catch (error: any) {
    console.error('Auto-journal for supplier payment failed:', error);
    return { created: false, reason: error.message };
  }
}

// ============================================================
// Chart of Accounts Seed Data
// ============================================================

export const CHART_OF_ACCOUNTS_SEED = [
  // Assets
  { accountCode: '1000', accountName: 'Current Assets', accountType: 'Asset', parentId: null },
  { accountCode: '1010', accountName: 'Cash on Hand', accountType: 'Asset', parentCode: '1000' },
  { accountCode: '1020', accountName: 'Cash in Bank', accountType: 'Asset', parentCode: '1000' },
  { accountCode: '1030', accountName: 'Accounts Receivable', accountType: 'Asset', parentCode: '1000' },
  { accountCode: '1040', accountName: 'Inventory', accountType: 'Asset', parentCode: '1000' },
  { accountCode: '1050', accountName: 'Cement Inventory', accountType: 'Asset', parentCode: '1000' },

  // Liabilities
  { accountCode: '2000', accountName: 'Current Liabilities', accountType: 'Liability', parentId: null },
  { accountCode: '2010', accountName: 'Accounts Payable', accountType: 'Liability', parentCode: '2000' },
  { accountCode: '2020', accountName: 'VAT Output Payable', accountType: 'Liability', parentCode: '2000' },
  { accountCode: '2030', accountName: 'VAT Input Receivable', accountType: 'Liability', parentCode: '2000' },
  { accountCode: '2040', accountName: 'Withholding Tax Payable', accountType: 'Liability', parentCode: '2000' },
  { accountCode: '2050', accountName: 'Customer Deposits', accountType: 'Liability', parentCode: '2000' },

  // Equity
  { accountCode: '3000', accountName: 'Equity', accountType: 'Equity', parentId: null },
  { accountCode: '3010', accountName: 'Capital Stock', accountType: 'Equity', parentCode: '3000' },
  { accountCode: '3020', accountName: 'Retained Earnings', accountType: 'Equity', parentCode: '3000' },

  // Revenue
  { accountCode: '4000', accountName: 'Sales Revenue', accountType: 'Revenue', parentId: null },
  { accountCode: '4010', accountName: 'Product Sales', accountType: 'Revenue', parentCode: '4000' },
  { accountCode: '4020', accountName: 'Service Income', accountType: 'Revenue', parentCode: '4000' },
  { accountCode: '4030', accountName: 'Cement Sales', accountType: 'Revenue', parentCode: '4000' },

  // Expenses
  { accountCode: '5000', accountName: 'Operating Expenses', accountType: 'Expense', parentId: null },
  { accountCode: '5010', accountName: 'Cost of Goods Sold', accountType: 'Expense', parentCode: '5000' },
  { accountCode: '5020', accountName: 'Salaries and Wages', accountType: 'Expense', parentCode: '5000' },
  { accountCode: '5030', accountName: 'Utilities', accountType: 'Expense', parentCode: '5000' },
  { accountCode: '5040', accountName: 'Rent', accountType: 'Expense', parentCode: '5000' },
  { accountCode: '5050', accountName: 'Cement Cost of Goods Sold', accountType: 'Expense', parentCode: '5000' },
  { accountCode: '5060', accountName: 'Transport Expense', accountType: 'Expense', parentCode: '5000' },
];
