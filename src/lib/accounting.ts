/**
 * Accounting Helper Library
 * Provides standardized Chart of Account codes, auto-journal entry creation,
 * and automatic subledger synchronization (linking Customers, Suppliers, and Bank Accounts
 * as child accounts under Accounts Receivable, Accounts Payable, and Cash in Bank).
 */

import { prisma } from '@/lib/prisma';

// ============================================================
// Standard Account Codes (matches seed data)
// ============================================================
export const ACCOUNTS = {
  // Assets (1xxx)
  CURRENT_ASSETS:      '1000',
  CASH:                '1010',
  BANK:                '1020',
  ACCOUNTS_RECEIVABLE: '1030',
  INVENTORY:           '1040',
  CEMENT_INVENTORY:    '1050',

  // Liabilities (2xxx)
  CURRENT_LIABILITIES: '2000',
  ACCOUNTS_PAYABLE:    '2010',
  VAT_OUTPUT:          '2020',  // VAT collected on sales (output VAT)
  VAT_INPUT:           '2030',  // VAT paid on purchases (input VAT)
  WITHHOLDING_TAX:     '2040',
  CUSTOMER_DEPOSITS:   '2050',

  // Equity (3xxx)
  EQUITY:              '3000',
  CAPITAL:             '3010',
  RETAINED_EARNINGS:   '3020',

  // Revenue (4xxx)
  SALES_REVENUE:       '4000',
  PRODUCT_SALES:       '4010',
  SERVICE_INCOME:      '4020',
  CEMENT_SALES:        '4030',

  // Expenses (5xxx)
  OPERATING_EXPENSE:   '5000',
  COGS:                '5010',
  SALARIES:            '5020',
  UTILITIES:           '5030',
  RENT:                '5040',
  CEMENT_COGS:         '5050',
  TRANSPORT_EXPENSE:   '5060',
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
 * If not found, ensures base chart of accounts and tries again.
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

  // If standard account is missing, ensure base chart of accounts and retry
  await ensureBaseChartOfAccounts();

  account = await prisma.chartOfAccount.findFirst({
    where: { accountCode: code, isActive: true },
  });
  if (account) return account.id;

  throw new Error(`Chart of Account not found: code=${code}, name=${fallbackName || 'N/A'}`);
}

// ============================================================
// Subledger Linking: Customers, Suppliers & Bank Accounts
// ============================================================

/**
 * Ensure base parent accounts exist in Chart of Accounts
 */
export async function ensureBaseChartOfAccounts() {
  // 1. Create top-level parent accounts
  const parentAccounts = CHART_OF_ACCOUNTS_SEED.filter((a) => !('parentCode' in a) || !a.parentCode);
  for (const acct of parentAccounts) {
    await prisma.chartOfAccount.upsert({
      where: { accountCode: acct.accountCode },
      update: { accountName: acct.accountName, accountType: acct.accountType, isActive: true },
      create: { accountCode: acct.accountCode, accountName: acct.accountName, accountType: acct.accountType, isActive: true },
    });
  }

  // 2. Create second-level category accounts
  const childAccounts = CHART_OF_ACCOUNTS_SEED.filter((a) => 'parentCode' in a && a.parentCode);
  for (const acct of childAccounts) {
    const parent = await prisma.chartOfAccount.findFirst({ where: { accountCode: (acct as any).parentCode } });
    await prisma.chartOfAccount.upsert({
      where: { accountCode: acct.accountCode },
      update: { accountName: acct.accountName, accountType: acct.accountType, parentId: parent?.id || null, isActive: true },
      create: { accountCode: acct.accountCode, accountName: acct.accountName, accountType: acct.accountType, parentId: parent?.id || null, isActive: true },
    });
  }
}

/**
 * Ensure or create a Customer's Sub-Account under Accounts Receivable (1030)
 */
export async function ensureCustomerAccount(customer: {
  id: string;
  code?: string;
  companyName?: string;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<string> {
  const parentId = await requireAccount(ACCOUNTS.ACCOUNTS_RECEIVABLE, 'Accounts Receivable');
  const cleanCode = (customer.code || customer.id.slice(-6)).toUpperCase();
  const accountCode = `1030-${cleanCode}`;
  const name = customer.companyName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || cleanCode;
  const accountName = `AR - ${name}`;

  const acct = await prisma.chartOfAccount.upsert({
    where: { accountCode },
    update: {
      accountName,
      accountType: 'Asset',
      parentId,
      isActive: true,
    },
    create: {
      accountCode,
      accountName,
      accountType: 'Asset',
      parentId,
      isActive: true,
    },
  });

  return acct.id;
}

/**
 * Ensure or create a Supplier's Sub-Account under Accounts Payable (2010)
 */
export async function ensureSupplierAccount(supplier: {
  id: string;
  code?: string;
  companyName?: string;
}): Promise<string> {
  const parentId = await requireAccount(ACCOUNTS.ACCOUNTS_PAYABLE, 'Accounts Payable');
  const cleanCode = (supplier.code || supplier.id.slice(-6)).toUpperCase();
  const accountCode = `2010-${cleanCode}`;
  const name = supplier.companyName || cleanCode;
  const accountName = `AP - ${name}`;

  const acct = await prisma.chartOfAccount.upsert({
    where: { accountCode },
    update: {
      accountName,
      accountType: 'Liability',
      parentId,
      isActive: true,
    },
    create: {
      accountCode,
      accountName,
      accountType: 'Liability',
      parentId,
      isActive: true,
    },
  });

  return acct.id;
}

/**
 * Ensure or create a Bank Account's Sub-Account under Cash in Bank (1020)
 */
export async function ensureBankAccount(bank: {
  id: string;
  bankName: string;
  accountNo: string;
}): Promise<string> {
  const parentId = await requireAccount(ACCOUNTS.BANK, 'Cash in Bank');
  const cleanNo = bank.accountNo ? bank.accountNo.replace(/[^a-zA-Z0-9]/g, '').slice(-8) : bank.id.slice(-6).toUpperCase();
  const accountCode = `1020-${cleanNo}`;
  const accountName = `${bank.bankName} (${bank.accountNo})`;

  // First check if an account with this exact code exists
  let acct = await prisma.chartOfAccount.findUnique({
    where: { accountCode },
  });

  // Also check if a child under parentId matches specific accountNo
  if (!acct && bank.accountNo) {
    acct = await prisma.chartOfAccount.findFirst({
      where: {
        parentId,
        accountCode: { startsWith: '1020-' },
        accountName: { contains: bank.accountNo },
      },
    });
  }

  if (acct) {
    return acct.id;
  }

  const created = await prisma.chartOfAccount.create({
    data: {
      accountCode,
      accountName,
      accountType: 'Asset',
      parentId,
      isActive: true,
    },
  });

  return created.id;
}

/**
 * Lookup Account ID for Customer with fallback to AR parent (1030)
 */
export async function getAccountForCustomer(customerId: string): Promise<string> {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (customer) {
      return await ensureCustomerAccount(customer);
    }
  } catch (err) {
    console.warn(`Could not resolve specific account for customer ${customerId}:`, err);
  }
  return await requireAccount(ACCOUNTS.ACCOUNTS_RECEIVABLE, 'Accounts Receivable');
}

/**
 * Lookup Account ID for Supplier with fallback to AP parent (2010)
 */
export async function getAccountForSupplier(supplierId: string): Promise<string> {
  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (supplier) {
      return await ensureSupplierAccount(supplier);
    }
  } catch (err) {
    console.warn(`Could not resolve specific account for supplier ${supplierId}:`, err);
  }
  return await requireAccount(ACCOUNTS.ACCOUNTS_PAYABLE, 'Accounts Payable');
}

/**
 * Lookup Account ID for Bank Account with fallback to Bank parent (1020)
 */
export async function getAccountForBank(bankAccountId: string): Promise<string> {
  try {
    // 1. Direct ChartOfAccount lookup if already an account ID
    const directAcct = await prisma.chartOfAccount.findUnique({ where: { id: bankAccountId } });
    if (directAcct) return directAcct.id;

    // 2. BankAccount lookup
    const bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (bank) {
      return await ensureBankAccount(bank);
    }
  } catch (err) {
    console.warn(`Could not resolve specific account for bank ${bankAccountId}:`, err);
  }
  return await requireAccount(ACCOUNTS.BANK, 'Cash in Bank');
}

/**
 * Bank Transaction (Deposit / Withdrawal) → Creates double-entry Journal Entry
 */
export async function journalBankTransaction(transaction: any) {
  try {
    const amount = Number(transaction.amount) || 0;
    if (amount <= 0) return { created: false, reason: 'Zero amount' };

    const bankAccountId = await getAccountForBank(transaction.bankAccountId);
    const bankAccount = await prisma.bankAccount.findUnique({ where: { id: transaction.bankAccountId } });
    const bankLabel = bankAccount ? `${bankAccount.bankName} (${bankAccount.accountNo})` : 'Bank';
    const txnRef = transaction.refNo ? `[${transaction.refNo}] ` : '';
    const desc = transaction.description || `${transaction.type === 'deposit' ? 'Bank Deposit' : 'Bank Withdrawal'} — ${bankLabel}`;

    if (transaction.type === 'deposit') {
      // Debit: Bank Account (Asset increases)
      // Credit: Cash / Opening Equity / Offset Account
      let offsetAccountCode = ACCOUNTS.CASH;
      let offsetAccountFallback = 'Cash on Hand';
      
      const isInitial = 
        transaction.refModule === 'INITIAL_BALANCE' || 
        transaction.refNo?.startsWith('INIT-') ||
        (transaction.description && transaction.description.toLowerCase().includes('initial'));

      if (isInitial) {
        offsetAccountCode = ACCOUNTS.CAPITAL;
        offsetAccountFallback = 'Capital Stock';
      } else if (transaction.refModule === 'CUSTOMER_PAYMENT') {
        offsetAccountCode = ACCOUNTS.ACCOUNTS_RECEIVABLE;
        offsetAccountFallback = 'Accounts Receivable';
      }

      return await createJournalEntries({
        lines: [
          {
            accountId: bankAccountId,
            debit: amount,
            credit: 0,
            description: `${txnRef}${desc}`,
          },
          {
            accountCode: offsetAccountCode,
            accountFallbackName: offsetAccountFallback,
            debit: 0,
            credit: amount,
            description: `${txnRef}${desc}`,
          },
        ],
        refModule: transaction.refModule || 'BANK_DEPOSIT',
        refId: transaction.id,
        entryDate: transaction.transDate,
        postedBy: transaction.createdBy || 'system',
      });
    } else if (transaction.type === 'withdrawal') {
      // Debit: Operating Expense / Cash / AP / Offset Account
      // Credit: Bank Account (Asset decreases)
      let offsetAccountCode = ACCOUNTS.OPERATING_EXPENSE;
      let offsetAccountFallback = 'Operating Expenses';

      if (transaction.refModule === 'CASH_WITHDRAWAL') {
        offsetAccountCode = ACCOUNTS.CASH;
        offsetAccountFallback = 'Cash on Hand';
      } else if (
        transaction.refModule === 'CEMENT_PURCHASE' || 
        transaction.refModule === 'SUPPLIER_PAYMENT' || 
        transaction.refModule === 'PURCHASE'
      ) {
        offsetAccountCode = ACCOUNTS.ACCOUNTS_PAYABLE;
        offsetAccountFallback = 'Accounts Payable';
      }

      return await createJournalEntries({
        lines: [
          {
            accountCode: offsetAccountCode,
            accountFallbackName: offsetAccountFallback,
            debit: amount,
            credit: 0,
            description: `${txnRef}${desc}`,
          },
          {
            accountId: bankAccountId,
            debit: 0,
            credit: amount,
            description: `${txnRef}${desc}`,
          },
        ],
        refModule: transaction.refModule || 'BANK_WITHDRAWAL',
        refId: transaction.id,
        entryDate: transaction.transDate,
        postedBy: transaction.createdBy || 'system',
      });
    }

    return { created: false, reason: `Unsupported transaction type: ${transaction.type}` };
  } catch (error: any) {
    console.error('Auto-journal for bank transaction failed:', error);
    return { created: false, reason: error.message };
  }
}

/**
 * Bank Transfer → Debit Destination Bank, Credit Source Bank
 */
export async function journalBankTransfer(transfer: {
  sourceBankAccountId: string;
  destinationBankAccountId: string;
  amount: number;
  refNo?: string;
  description?: string;
  refId: string;
  createdBy?: string;
}) {
  try {
    const amount = Number(transfer.amount) || 0;
    if (amount <= 0) return { created: false, reason: 'Zero amount' };

    const srcAccountId = await getAccountForBank(transfer.sourceBankAccountId);
    const destAccountId = await getAccountForBank(transfer.destinationBankAccountId);

    const [srcBank, destBank] = await Promise.all([
      prisma.bankAccount.findUnique({ where: { id: transfer.sourceBankAccountId } }),
      prisma.bankAccount.findUnique({ where: { id: transfer.destinationBankAccountId } }),
    ]);

    const desc = transfer.description || `Transfer from ${srcBank?.bankName || 'Bank'} to ${destBank?.bankName || 'Bank'}`;

    return await createJournalEntries({
      lines: [
        {
          accountId: destAccountId,
          debit: amount,
          credit: 0,
          description: desc,
        },
        {
          accountId: srcAccountId,
          debit: 0,
          credit: amount,
          description: desc,
        },
      ],
      refModule: 'BANK_TRANSFER',
      refId: transfer.refId,
      postedBy: transfer.createdBy || 'system',
    });
  } catch (error: any) {
    console.error('Auto-journal for bank transfer failed:', error);
    return { created: false, reason: error.message };
  }
}

/**
 * Full Sync of all Customers, Suppliers, and Bank Accounts into Chart of Accounts
 * and auto-backfill of any missing double-entry journal records.
 */
export async function syncAllSubledgerAccounts() {
  await ensureBaseChartOfAccounts();

  const [customers, suppliers, bankAccounts] = await Promise.all([
    prisma.customer.findMany(),
    prisma.supplier.findMany(),
    prisma.bankAccount.findMany(),
  ]);

  let syncedCustomers = 0;
  for (const c of customers) {
    try {
      await ensureCustomerAccount(c);
      syncedCustomers++;
    } catch (err) {
      console.warn(`Failed to sync customer account ${c.id}:`, err);
    }
  }

  let syncedSuppliers = 0;
  for (const s of suppliers) {
    try {
      await ensureSupplierAccount(s);
      syncedSuppliers++;
    } catch (err) {
      console.warn(`Failed to sync supplier account ${s.id}:`, err);
    }
  }

  let syncedBanks = 0;
  for (const b of bankAccounts) {
    try {
      await ensureBankAccount(b);
      syncedBanks++;
    } catch (err) {
      console.warn(`Failed to sync bank account ${b.id}:`, err);
    }
  }

  // Backfill any bank transactions that don't yet have double-entry journal records
  let syncedBankTransactions = 0;
  try {
    const bankTxns = await prisma.bankTransaction.findMany({
      orderBy: { transDate: 'asc' },
    });

    for (const txn of bankTxns) {
      const existingJournal = await prisma.journalEntry.findFirst({
        where: {
          OR: [
            { refId: txn.id },
            ...(txn.refId ? [{ refId: txn.refId }] : []),
          ],
        },
      });

      if (!existingJournal) {
        if (txn.type === 'deposit' || txn.type === 'withdrawal') {
          const res = await journalBankTransaction(txn);
          if (res && res.created) syncedBankTransactions++;
        }
      }
    }
  } catch (btErr) {
    console.warn('Failed to sync bank transactions into journal:', btErr);
  }

  return {
    success: true,
    syncedCustomers,
    syncedSuppliers,
    syncedBanks,
    syncedBankTransactions,
    total: syncedCustomers + syncedSuppliers + syncedBanks + syncedBankTransactions,
  };
}

// ============================================================
// Journal Entry Creation
// ============================================================

export interface JournalLine {
  accountId?: string;
  accountCode?: string;
  accountFallbackName?: string;
  debit: number;
  credit: number;
  description: string;
}

interface CreateJournalOptions {
  lines: JournalLine[];
  refModule: string;
  refId: string;
  entryDate?: Date | string;
  postedBy?: string;
}

/**
 * Create double-entry journal entries from a set of lines.
 * Validates that debits = credits. Generates a JE-XXXXXXX voucher number.
 * Returns the journal voucher number and created entries.
 */
export async function createJournalEntries(options: CreateJournalOptions) {
  const { lines, refModule, refId, entryDate, postedBy } = options;

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
      let targetAccountId = line.accountId;
      if (!targetAccountId && line.accountCode) {
        targetAccountId = await requireAccount(line.accountCode, line.accountFallbackName);
      }

      if (!targetAccountId) {
        throw new Error(`Could not resolve account for ${line.accountCode || line.accountFallbackName || 'line'}`);
      }

      resolvedLines.push({
        accountId: targetAccountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
      });
    } catch (err: any) {
      console.warn(`Auto-journal skipped for ${refModule}/${refId}: ${err.message}`);
      return {
        created: false,
        reason: `Missing account: ${line.accountCode || ''} (${line.accountFallbackName || 'N/A'}). Set up Chart of Accounts first.`,
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
          entryDate: entryDate ? new Date(entryDate) : new Date(),
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
 * Sales Invoice Created → Debit Customer's AR Account, Credit Sales Revenue + VAT Output
 */
export async function journalSalesInvoice(invoice: any) {
  try {
    const totalAmount = Number(invoice.totalAmount) || 0;
    if (totalAmount <= 0) return { created: false, reason: 'Zero amount' };

    const subtotal = Number(invoice.subtotal) || totalAmount;
    const vatAmount = Number(invoice.vatAmount) || 0;
    const withholding = Number(invoice.withholding) || 0;
    const netReceivable = totalAmount - withholding;
    const invoiceRef = `Invoice ${invoice.invoiceNo} — ${invoice.customer?.companyName || ''}`;

    // Resolve customer-specific AR child account
    const customerAccountId = invoice.customerId
      ? await getAccountForCustomer(invoice.customerId)
      : await requireAccount(ACCOUNTS.ACCOUNTS_RECEIVABLE, 'Accounts Receivable');

    const lines: JournalLine[] = [];

    // Debit: Customer AR sub-account (net of withholding)
    if (netReceivable > 0) {
      lines.push({
        accountId: customerAccountId,
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
 * Customer Payment Verified → Debit Cash/Bank Account, Credit Customer's AR Account
 */
export async function journalCustomerPayment(payment: any) {
  try {
    const amount = Number(payment.amount) || 0;
    if (amount <= 0) return { created: false, reason: 'Zero amount' };

    const paymentRef = `Customer payment ${payment.receiptNo} — ${payment.customer?.companyName || ''}`;

    // Resolve specific Bank account or Cash
    let debitAccountId: string;
    if (payment.paymentMethod === 'cash') {
      debitAccountId = await requireAccount(ACCOUNTS.CASH, 'Cash on Hand');
    } else if (payment.bankAccountId) {
      debitAccountId = await getAccountForBank(payment.bankAccountId);
    } else {
      debitAccountId = await requireAccount(ACCOUNTS.BANK, 'Cash in Bank');
    }

    // Resolve customer-specific AR sub-account
    const customerAccountId = payment.customerId
      ? await getAccountForCustomer(payment.customerId)
      : await requireAccount(ACCOUNTS.ACCOUNTS_RECEIVABLE, 'Accounts Receivable');

    return await createJournalEntries({
      lines: [
        {
          accountId: debitAccountId,
          debit: amount,
          credit: 0,
          description: paymentRef,
        },
        {
          accountId: customerAccountId,
          debit: 0,
          credit: amount,
          description: paymentRef,
        },
      ],
      refModule: 'CUSTOMER_PAYMENT',
      refId: payment.id,
    });
  } catch (error: any) {
    console.error('Auto-journal for customer payment failed:', error);
    return { created: false, reason: error.message };
  }
}

/**
 * Supplier Payment → Debit Supplier's AP Account, Credit Cash/Bank Account
 */
export async function journalSupplierPayment(payment: any) {
  try {
    const amount = Number(payment.amount) || 0;
    if (amount <= 0) return { created: false, reason: 'Zero amount' };

    const paymentRef = `Supplier payment ${payment.paymentNo} — ${payment.supplier?.companyName || ''}`;

    // Resolve supplier-specific AP sub-account
    const supplierAccountId = payment.supplierId
      ? await getAccountForSupplier(payment.supplierId)
      : await requireAccount(ACCOUNTS.ACCOUNTS_PAYABLE, 'Accounts Payable');

    // Resolve specific Bank account or Cash
    let creditAccountId: string;
    if (payment.paymentMethod === 'cash') {
      creditAccountId = await requireAccount(ACCOUNTS.CASH, 'Cash on Hand');
    } else if (payment.bankAccountId) {
      creditAccountId = await getAccountForBank(payment.bankAccountId);
    } else {
      creditAccountId = await requireAccount(ACCOUNTS.BANK, 'Cash in Bank');
    }

    return await createJournalEntries({
      lines: [
        {
          accountId: supplierAccountId,
          debit: amount,
          credit: 0,
          description: paymentRef,
        },
        {
          accountId: creditAccountId,
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

/**
 * Cement Purchase Approved → Debit Cement Inventory, Credit Supplier's AP Account
 */
export async function journalCementPurchaseApproved(purchase: any) {
  try {
    const amount = Number(purchase.totalAmount) || 0;
    if (amount <= 0) return { created: false, reason: 'Zero amount' };

    const vatAmount = Number(purchase.vatAmount) || 0;
    const netAmount = vatAmount > 0 ? amount - vatAmount : amount;

    // Resolve supplier/factory AP account
    const supplierAccountId = purchase.supplierId || purchase.factoryId
      ? await getAccountForSupplier(purchase.supplierId || purchase.factoryId)
      : await requireAccount(ACCOUNTS.ACCOUNTS_PAYABLE, 'Accounts Payable');

    const lines: JournalLine[] = [
      {
        accountCode: ACCOUNTS.CEMENT_INVENTORY,
        accountFallbackName: 'Cement Inventory',
        debit: netAmount,
        credit: 0,
        description: `Cement purchase ${purchase.purchaseNo} — ${purchase.factory?.name || 'Factory'}`,
      },
    ];

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
      accountId: supplierAccountId,
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
 * Goods Received Voucher (GRV) Received → Debit Inventory, Credit Supplier AP Account
 */
export async function journalGoodsReceive(grv: any) {
  try {
    const amount = Number(grv.totalAmount) || 0;
    if (amount <= 0) return { created: false, reason: 'Zero amount' };

    const supplierAccountId = grv.supplierId
      ? await getAccountForSupplier(grv.supplierId)
      : await requireAccount(ACCOUNTS.ACCOUNTS_PAYABLE, 'Accounts Payable');

    const inventoryCode = (grv.division || '').toUpperCase() === 'CEMENT' ? ACCOUNTS.CEMENT_INVENTORY : ACCOUNTS.INVENTORY;
    const grvRef = `Goods Received Voucher ${grv.grvNo} — ${grv.supplier?.companyName || ''}`;

    return await createJournalEntries({
      lines: [
        {
          accountCode: inventoryCode,
          accountFallbackName: 'Inventory',
          debit: amount,
          credit: 0,
          description: grvRef,
        },
        {
          accountId: supplierAccountId,
          debit: 0,
          credit: amount,
          description: grvRef,
        },
      ],
      refModule: 'GOODS_RECEIVE',
      refId: grv.id,
    });
  } catch (error: any) {
    console.error('Auto-journal for GRV failed:', error);
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
