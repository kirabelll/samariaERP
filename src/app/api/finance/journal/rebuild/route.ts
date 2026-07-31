import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  journalCementPurchaseApproved,
  journalSalesInvoice,
  journalCementLifting,
  journalSupplierPayment,
  createJournalEntries,
  ACCOUNTS,
} from '@/lib/accounting';

export const dynamic = 'force-dynamic';

/**
 * POST /api/finance/journal/rebuild
 * Rebuilds all journal entries from existing transactions.
 * Only creates entries for records that don't already have journal entries.
 * Safe to run multiple times — skips records that already have entries.
 */
export async function POST(request: NextRequest) {
  try {
    const results: any = {
      postedVouchers: { processed: 0, created: 0, skipped: 0, errors: 0 },
      cementPurchases: { processed: 0, created: 0, skipped: 0, errors: 0 },
      salesInvoices: { processed: 0, created: 0, skipped: 0, errors: 0 },
      cementLiftings: { processed: 0, created: 0, skipped: 0, errors: 0 },
      cementPurchasePayments: { processed: 0, created: 0, skipped: 0, errors: 0 },
      customerPayments: { processed: 0, created: 0, skipped: 0, errors: 0 },
    };

    // Helper: check if journal entries already exist for a record
    const hasJournalEntries = async (refModule: string, refId: string) => {
      const count = await prisma.journalEntry.count({
        where: { refModule, refId },
      });
      return count > 0;
    };

    // ============================================================
    // 1. Posted Payment Vouchers
    // ============================================================
    const postedVouchers = await prisma.paymentVoucher.findMany({
      where: { status: 'Posted' },
    });

    for (const voucher of postedVouchers) {
      results.postedVouchers.processed++;
      if (await hasJournalEntries('VOUCHER', voucher.id)) {
        results.postedVouchers.skipped++;
        continue;
      }

      try {
        const amount = Number(voucher.amount) || 0;
        if (amount <= 0) { results.postedVouchers.skipped++; continue; }

        // Payment vouchers: Debit expense/payable, Credit bank/cash
        const isPayment = voucher.voucherType === 'PAYMENT';
        const isReceipt = voucher.voucherType === 'RECEIPT';

        if (isPayment) {
          // Payment: Debit Accounts Payable/Expense, Credit Bank
          const result = await createJournalEntries({
            lines: [
              {
                accountCode: ACCOUNTS.ACCOUNTS_PAYABLE,
                accountFallbackName: 'Accounts Payable',
                debit: amount,
                credit: 0,
                description: `Voucher ${voucher.voucherNo} — ${voucher.description || voucher.payeeName || ''}`,
              },
              {
                accountCode: ACCOUNTS.BANK,
                accountFallbackName: 'Bank',
                debit: 0,
                credit: amount,
                description: `Voucher ${voucher.voucherNo} — ${voucher.description || voucher.payeeName || ''}`,
              },
            ],
            refModule: 'VOUCHER',
            refId: voucher.id,
            postedBy: voucher.postedBy || 'system',
          });
          if (result.created) results.postedVouchers.created++;
          else results.postedVouchers.errors++;
        } else if (isReceipt) {
          // Receipt: Debit Bank, Credit Accounts Receivable
          const result = await createJournalEntries({
            lines: [
              {
                accountCode: ACCOUNTS.BANK,
                accountFallbackName: 'Bank',
                debit: amount,
                credit: 0,
                description: `Receipt ${voucher.voucherNo} — ${voucher.description || ''}`,
              },
              {
                accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE,
                accountFallbackName: 'Accounts Receivable',
                debit: 0,
                credit: amount,
                description: `Receipt ${voucher.voucherNo} — ${voucher.description || ''}`,
              },
            ],
            refModule: 'VOUCHER',
            refId: voucher.id,
            postedBy: voucher.postedBy || 'system',
          });
          if (result.created) results.postedVouchers.created++;
          else results.postedVouchers.errors++;
        } else {
          results.postedVouchers.skipped++;
        }
      } catch (err) {
        console.error(`[Rebuild] Voucher ${voucher.voucherNo} error:`, err);
        results.postedVouchers.errors++;
      }
    }

    // ============================================================
    // 2. Approved/Active Cement Purchases
    // ============================================================
    const approvedPurchases = await prisma.cementPurchase.findMany({
      where: { status: { in: ['Approved', 'Active', 'Exhausted'] } },
      include: { factory: true },
    });

    for (const purchase of approvedPurchases) {
      results.cementPurchases.processed++;
      if (await hasJournalEntries('CEMENT_PURCHASE', purchase.id)) {
        results.cementPurchases.skipped++;
        continue;
      }
      try {
        const result = await journalCementPurchaseApproved(purchase);
        if (result.created) results.cementPurchases.created++;
        else results.cementPurchases.skipped++;
      } catch (err) {
        console.error(`[Rebuild] Purchase ${purchase.purchaseNo} error:`, err);
        results.cementPurchases.errors++;
      }
    }

    // ============================================================
    // 3. Sales Invoices (non-cancelled)
    // ============================================================
    const invoices = await prisma.salesInvoice.findMany({
      where: { status: { not: 'Cancelled' } },
    });

    for (const invoice of invoices) {
      results.salesInvoices.processed++;
      if (await hasJournalEntries('SALES_INVOICE', invoice.id)) {
        results.salesInvoices.skipped++;
        continue;
      }
      try {
        const result = await journalSalesInvoice(invoice);
        if (result.created) results.salesInvoices.created++;
        else results.salesInvoices.skipped++;
      } catch (err) {
        console.error(`[Rebuild] Invoice ${invoice.invoiceNo} error:`, err);
        results.salesInvoices.errors++;
      }
    }

    // ============================================================
    // 4. Cement Liftings (delivered or verified)
    // ============================================================
    const liftings = await prisma.cementLifting.findMany({
      where: { status: { in: ['Delivered', 'Verified'] } },
      include: { purchase: true },
    });

    for (const lifting of liftings) {
      results.cementLiftings.processed++;
      if (await hasJournalEntries('CEMENT_LIFTING', lifting.id)) {
        results.cementLiftings.skipped++;
        continue;
      }
      try {
        const result = await journalCementLifting(lifting);
        if (result.created) results.cementLiftings.created++;
        else results.cementLiftings.skipped++;
      } catch (err) {
        console.error(`[Rebuild] Lifting ${lifting.liftingNo} error:`, err);
        results.cementLiftings.errors++;
      }
    }

    // ============================================================
    // 5. Cement Purchase Payments (tracked via BankTransaction with refModule='CEMENT_PURCHASE')
    // Debit AP, Credit Bank
    // ============================================================
    const purchasePaymentTxns = await prisma.bankTransaction.findMany({
      where: { refModule: 'CEMENT_PURCHASE', type: 'withdrawal' },
    });

    for (const txn of purchasePaymentTxns) {
      results.cementPurchasePayments.processed++;
      if (await hasJournalEntries('CEMENT_PURCHASE_PAYMENT', txn.id)) {
        results.cementPurchasePayments.skipped++;
        continue;
      }
      try {
        const amount = Number(txn.amount) || 0;
        if (amount <= 0) { results.cementPurchasePayments.skipped++; continue; }

        // Look up the purchase for description
        let purchaseRef = txn.description || '';
        if (txn.refId) {
          const purchase = await prisma.cementPurchase.findUnique({
            where: { id: txn.refId },
            include: { factory: true },
          });
          if (purchase) {
            purchaseRef = `Cement purchase payment — ${purchase.purchaseNo} — ${purchase.factory?.name || ''}`;
          }
        }

        const result = await createJournalEntries({
          lines: [
            {
              accountCode: ACCOUNTS.ACCOUNTS_PAYABLE,
              accountFallbackName: 'Accounts Payable',
              debit: amount,
              credit: 0,
              description: purchaseRef,
            },
            {
              accountCode: ACCOUNTS.BANK,
              accountFallbackName: 'Bank',
              debit: 0,
              credit: amount,
              description: purchaseRef,
            },
          ],
          refModule: 'CEMENT_PURCHASE_PAYMENT',
          refId: txn.id,
          postedBy: txn.createdBy || 'system',
        });
        if (result.created) results.cementPurchasePayments.created++;
        else results.cementPurchasePayments.skipped++;
      } catch (err) {
        console.error(`[Rebuild] Purchase payment error:`, err);
        results.cementPurchasePayments.errors++;
      }
    }

    // ============================================================
    // 6. Verified Customer Payments (Debit Bank, Credit AR)
    // ============================================================
    const customerPayments = await prisma.customerPayment.findMany({
      where: { status: 'Verified' },
      include: { invoice: true },
    });

    for (const cp of customerPayments) {
      results.customerPayments.processed++;
      if (await hasJournalEntries('CUSTOMER_PAYMENT', cp.id)) {
        results.customerPayments.skipped++;
        continue;
      }
      try {
        const amount = Number(cp.amount) || 0;
        if (amount <= 0) { results.customerPayments.skipped++; continue; }

        const result = await createJournalEntries({
          lines: [
            {
              accountCode: ACCOUNTS.BANK,
              accountFallbackName: 'Bank',
              debit: amount,
              credit: 0,
              description: `Customer payment ${cp.receiptNo} — ${cp.invoice?.invoiceNo || 'General'}`,
            },
            {
              accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE,
              accountFallbackName: 'Accounts Receivable',
              debit: 0,
              credit: amount,
              description: `Customer payment ${cp.receiptNo} — ${cp.invoice?.invoiceNo || 'General'}`,
            },
          ],
          refModule: 'CUSTOMER_PAYMENT',
          refId: cp.id,
          postedBy: 'system',
        });
        if (result.created) results.customerPayments.created++;
        else results.customerPayments.skipped++;
      } catch (err) {
        console.error(`[Rebuild] Customer payment ${cp.receiptNo} error:`, err);
        results.customerPayments.errors++;
      }
    }

    // ============================================================
    // Summary
    // ============================================================
    const totalCreated = Object.values(results).reduce(
      (sum: number, r: any) => sum + r.created, 0
    );

    return NextResponse.json({
      success: true,
      message: `Journal rebuild complete. Created ${totalCreated} journal entry pairs.`,
      results,
    });
  } catch (error: any) {
    console.error('[Journal Rebuild] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
