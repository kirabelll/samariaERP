import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { notify } from '@/lib/telegram';
import { createJournalEntries, ACCOUNTS } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

/**
 * Update DailyCash when a voucher is posted.
 * Adds receipts or payments to today's daily cash record.
 */
async function updateDailyCashForVoucher(voucher: any) {
  try {
    const today = new Date();
    const cashDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    let amountToReceipts = 0;
    let amountToPayments = 0;

    if (voucher.voucherType === 'RECEIPT') {
      amountToReceipts = voucher.amount;
    } else if (voucher.voucherType === 'PAYMENT' || voucher.voucherType === 'REFUND') {
      amountToPayments = voucher.amount;
    }

    const dailyCash = await prisma.dailyCash.upsert({
      where: { cashDate },
      update: {
        totalReceipts: { increment: amountToReceipts },
        totalPayments: { increment: amountToPayments },
      },
      create: {
        cashDate,
        openingBalance: 0,
        totalReceipts: amountToReceipts,
        totalPayments: amountToPayments,
      },
    });

    const updatedDailyCash = await prisma.dailyCash.update({
      where: { cashDate },
      data: {
        closingBalance: dailyCash.openingBalance + dailyCash.totalReceipts - dailyCash.totalPayments,
      },
    });

    return { success: true, dailyCash: updatedDailyCash };
  } catch (error: any) {
    console.warn(`DailyCash update failed for voucher ${voucher.voucherNo}:`, error.message);
    return { success: false, reason: error.message };
  }
}

/**
 * Auto-create journal entries when a payment voucher is posted.
 * Uses the shared accounting library for reliable account lookup.
 */
async function createAutoJournal(voucher: any) {
  const amount = Number(voucher.amount) || 0;
  if (amount <= 0) return { created: false, reason: 'Zero amount' };

  const cashOrBank = voucher.paymentMethod === 'cash' ? ACCOUNTS.CASH : ACCOUNTS.BANK;
  const cashOrBankName = voucher.paymentMethod === 'cash' ? 'Cash' : 'Bank';
  let lines: any[] = [];

  if (voucher.voucherType === 'PAYMENT') {
    // Debit: Expense or AP depending on source module
    const debitCode = voucher.sourceModule === 'PURCHASE' ? ACCOUNTS.ACCOUNTS_PAYABLE : ACCOUNTS.OPERATING_EXPENSE;
    const debitName = voucher.sourceModule === 'PURCHASE' ? 'Accounts Payable' : 'Operating Expenses';
    lines = [
      { accountCode: debitCode, accountFallbackName: debitName, debit: amount, credit: 0, description: `Payment to ${voucher.payeeName} — ${voucher.voucherNo}` },
      { accountCode: cashOrBank, accountFallbackName: cashOrBankName, debit: 0, credit: amount, description: `Payment to ${voucher.payeeName} — ${voucher.voucherNo}` },
    ];
  } else if (voucher.voucherType === 'RECEIPT') {
    lines = [
      { accountCode: cashOrBank, accountFallbackName: cashOrBankName, debit: amount, credit: 0, description: `Receipt from ${voucher.payeeName} — ${voucher.voucherNo}` },
      { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, accountFallbackName: 'Accounts Receivable', debit: 0, credit: amount, description: `Receipt from ${voucher.payeeName} — ${voucher.voucherNo}` },
    ];
  } else if (voucher.voucherType === 'REFUND') {
    lines = [
      { accountCode: ACCOUNTS.OPERATING_EXPENSE, accountFallbackName: 'Operating Expenses', debit: amount, credit: 0, description: `Refund to ${voucher.payeeName} — ${voucher.voucherNo}` },
      { accountCode: cashOrBank, accountFallbackName: cashOrBankName, debit: 0, credit: amount, description: `Refund to ${voucher.payeeName} — ${voucher.voucherNo}` },
    ];
  }

  const result = await createJournalEntries({
    lines,
    refModule: 'PAYMENT_VOUCHER',
    refId: voucher.id,
    postedBy: voucher.postedBy || 'system',
  });

  if (result.created) {
    notify({
      module: 'FINANCE',
      event: 'auto_journal_posted',
      details: { voucherNo: voucher.voucherNo, journalNo: result.voucherNo, amount },
    });
  }

  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const voucher = await prisma.paymentVoucher.findUnique({
      where: { id: params.id },
    });

    if (!voucher) {
      return NextResponse.json(
        { success: false, error: 'Voucher not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: voucher,
    });
  } catch (error: any) {
    console.error('Error fetching payment voucher:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const voucher = await prisma.paymentVoucher.findUnique({
      where: { id: params.id },
    });

    if (!voucher) {
      return NextResponse.json(
        { success: false, error: 'Voucher not found' },
        { status: 404 }
      );
    }

    // Reject edit if status is Posted
    if (voucher.status === 'Posted') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit a posted voucher' },
        { status: 400 }
      );
    }

    const body = await request.json();
    // Strip id, createdAt, updatedAt
    const { id, createdAt, updatedAt, ...updateData } = body;

    // Check if this is a status change to "Posted" — require approval first
    const isPostingVoucher = updateData.status === 'Posted' && voucher.status !== 'Posted';

    if (isPostingVoucher && voucher.status !== 'Approved') {
      return NextResponse.json(
        { success: false, error: 'Voucher must be approved before posting. Current status: ' + voucher.status },
        { status: 400 }
      );
    }

    const updatedVoucher = await prisma.paymentVoucher.update({
      where: { id: params.id },
      data: {
        ...updateData,
        ...(isPostingVoucher ? { postedAt: new Date() } : {}),
      },
    });

    // Sync bank account balance and BankTransaction record
    await syncVoucherBankTransaction(updatedVoucher);

    // Auto-create journal entry when voucher is posted
    let journalResult = null;
    let dailyCashResult = null;
    let invoiceUpdate = null;
    if (isPostingVoucher) {
      journalResult = await createAutoJournal(updatedVoucher);
      dailyCashResult = await updateDailyCashForVoucher(updatedVoucher);

      // Auto-settle aggregate deliveries when an AGGREGATE PAYMENT voucher is posted
      if (updatedVoucher.voucherType === 'PAYMENT' && updatedVoucher.sourceModule === 'AGGREGATE' && updatedVoucher.sourceId) {
        try {
          // sourceId may contain comma-separated delivery IDs
          const deliveryIds = updatedVoucher.sourceId.split(',').map((id: string) => id.trim()).filter(Boolean);
          if (deliveryIds.length > 0) {
            await prisma.aggregateDelivery.updateMany({
              where: {
                id: { in: deliveryIds },
                status: 'Verified', // Only settle verified deliveries
              },
              data: { status: 'Settled' },
            });

            // Send Telegram notification
            notify({
              module: 'AGGREGATE',
              event: 'aggregate_bulk_settled',
              details: {
                voucherNo: updatedVoucher.voucherNo,
                deliveryCount: `${deliveryIds.length} deliveries`,
                totalAmount: `ETB ${Number(updatedVoucher.amount).toLocaleString('en-US')}`,
                payee: updatedVoucher.payeeName,
              },
            });
          }
        } catch (settleErr) {
          console.error('Failed to auto-settle aggregate deliveries:', settleErr);
        }
      }

      // Update linked invoice status when a SALES RECEIPT is posted
      if (updatedVoucher.voucherType === 'RECEIPT' && updatedVoucher.sourceModule === 'SALES' && updatedVoucher.sourceId) {
        try {
          const invoice = await prisma.salesInvoice.findUnique({ where: { id: updatedVoucher.sourceId } });
          if (invoice) {
            // Sum all posted RECEIPT vouchers for this invoice
            const allReceipts = await prisma.paymentVoucher.findMany({
              where: {
                sourceModule: 'SALES',
                sourceId: invoice.id,
                voucherType: 'RECEIPT',
                status: 'Posted',
              },
              select: { amount: true },
            });
            const totalPaidVouchers = allReceipts.reduce((sum, v) => sum + Number(v.amount), 0);

            // Also sum verified customer payments and their withholding for this invoice
            const customerPaymentAgg = await prisma.customerPayment.aggregate({
              where: { invoiceId: invoice.id, status: 'Verified' },
              _sum: { amount: true, withholdingAmount: true },
            });
            const totalPaidCustomer = Number(customerPaymentAgg._sum.amount || 0);
            const totalWithheld = Number(customerPaymentAgg._sum.withholdingAmount || 0);

            // Total settled = voucher receipts + customer payments + withholding
            // Avoid double-counting: use the higher of voucher total or customer payment total
            // (since both paths may record the same payment)
            const totalPaid = Math.max(totalPaidVouchers, totalPaidCustomer);
            const totalSettled = Math.round((totalPaid + totalWithheld) * 100) / 100;
            const invoiceTotal = Math.round(Number(invoice.totalAmount) * 100) / 100;
            const newStatus = (totalSettled >= invoiceTotal || Math.abs(invoiceTotal - totalSettled) < 1)
              ? 'Paid' : totalSettled > 0 ? 'Partial' : 'Unpaid';

            await prisma.salesInvoice.update({
              where: { id: invoice.id },
              data: { status: newStatus },
            });

            invoiceUpdate = {
              invoiceNo: invoice.invoiceNo,
              totalAmount: invoiceTotal,
              totalPaid,
              totalWithheld,
              totalSettled,
              newStatus,
            };
          }
        } catch (invErr) {
          console.error('Failed to update invoice status:', invErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedVoucher,
      ...(journalResult ? { journal: journalResult } : {}),
      ...(dailyCashResult ? { dailyCash: dailyCashResult } : {}),
      ...(invoiceUpdate ? { invoiceUpdate } : {}),
    });
  } catch (error: any) {
    console.error('Error updating payment voucher:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Synchronizes BankAccount balance and logs/updates BankTransaction for a PaymentVoucher.
 */
async function syncVoucherBankTransaction(voucher: any, isCancellation: boolean = false) {
  if (!voucher || !voucher.id) return;

  try {
    const existingTxn = await prisma.bankTransaction.findFirst({
      where: { refModule: 'PAYMENT_VOUCHER', refId: voucher.id },
    });

    // Handle cancellation or rejection
    if (isCancellation || voucher.status === 'Cancelled' || voucher.status === 'Rejected') {
      if (existingTxn) {
        const reverseType = existingTxn.type;
        const reverseAmount = Number(existingTxn.amount);
        await prisma.bankAccount.update({
          where: { id: existingTxn.bankAccountId },
          data: {
            balance: reverseType === 'withdrawal'
              ? { increment: reverseAmount }
              : { decrement: reverseAmount },
          },
        });
        await prisma.bankTransaction.delete({
          where: { id: existingTxn.id },
        });
      }
      return;
    }

    const newBankAccountId = voucher.bankAccountId;
    const newAmount = Number(voucher.amount) || 0;
    if (!newBankAccountId || newAmount <= 0) return;

    const isDeduction = voucher.voucherType === 'PAYMENT' || voucher.voucherType === 'REFUND';
    const newTxnType = isDeduction ? 'withdrawal' : 'deposit';

    if (!existingTxn) {
      // Create new bank transaction & update balance
      await prisma.bankAccount.update({
        where: { id: newBankAccountId },
        data: {
          balance: isDeduction
            ? { decrement: newAmount }
            : { increment: newAmount },
        },
      });

      await prisma.bankTransaction.create({
        data: {
          bankAccountId: newBankAccountId,
          type: newTxnType,
          amount: newAmount,
          refNo: voucher.refNo || voucher.checkNo || voucher.voucherNo,
          description: voucher.description || `${voucher.voucherType} Voucher ${voucher.voucherNo} — ${voucher.payeeName}`,
          refModule: 'PAYMENT_VOUCHER',
          refId: voucher.id,
          createdBy: voucher.preparedBy || voucher.createdBy || null,
        },
      });
    } else {
      const oldBankAccountId = existingTxn.bankAccountId;
      const oldAmount = Number(existingTxn.amount);
      const oldTxnType = existingTxn.type;

      if (
        oldBankAccountId !== newBankAccountId ||
        oldAmount !== newAmount ||
        oldTxnType !== newTxnType
      ) {
        // Reverse old leg on old bank account
        await prisma.bankAccount.update({
          where: { id: oldBankAccountId },
          data: {
            balance: oldTxnType === 'withdrawal'
              ? { increment: oldAmount }
              : { decrement: oldAmount },
          },
        });

        // Apply new leg on new bank account
        await prisma.bankAccount.update({
          where: { id: newBankAccountId },
          data: {
            balance: isDeduction
              ? { decrement: newAmount }
              : { increment: newAmount },
          },
        });

        // Update transaction record
        await prisma.bankTransaction.update({
          where: { id: existingTxn.id },
          data: {
            bankAccountId: newBankAccountId,
            type: newTxnType,
            amount: newAmount,
            refNo: voucher.refNo || voucher.checkNo || voucher.voucherNo,
            description: voucher.description || `${voucher.voucherType} Voucher ${voucher.voucherNo} — ${voucher.payeeName}`,
          },
        });
      }
    }
  } catch (err: any) {
    console.error(`Failed to sync bank balance for voucher ${voucher.voucherNo || voucher.id}:`, err.message);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const voucher = await prisma.paymentVoucher.findUnique({
      where: { id: params.id },
    });

    if (!voucher) {
      return NextResponse.json(
        { success: false, error: 'Voucher not found' },
        { status: 404 }
      );
    }

    // Soft delete - set status to Cancelled
    const deletedVoucher = await prisma.paymentVoucher.update({
      where: { id: params.id },
      data: { status: 'Cancelled' },
    });

    // Reverse bank balance & transaction
    await syncVoucherBankTransaction(deletedVoucher, true);

    return NextResponse.json({
      success: true,
      data: deletedVoucher,
    });
  } catch (error: any) {
    console.error('Error deleting payment voucher:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
