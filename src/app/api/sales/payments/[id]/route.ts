import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';
import { createJournalEntries, ACCOUNTS, journalCustomerPayment } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.customerPayment.findUnique({
      where: { id: params.id },
      include: {
        customer: { select: { id: true, companyName: true, phone: true } },
        invoice: { select: { id: true, invoiceNo: true, totalAmount: true, status: true } },
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error('Error fetching record:', error);
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
    const body = await request.json();
    const { id: _id, customer: _customer, invoice: _invoice, ...updateData } = body;

    const record = await prisma.customerPayment.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    const isVerifying = updateData.status === 'Verified' && record.status === 'Pending';
    const isRejecting = updateData.status === 'Rejected' && record.status === 'Pending';

    const updatedRecord = await prisma.customerPayment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: { select: { companyName: true } },
        invoice: { select: { id: true, invoiceNo: true, totalAmount: true } },
      },
    });

    // Helper: recalculate invoice status with tolerance for rounding (within 1 ETB = Paid)
    // totalSettled = totalPaid + totalWithheld — both count towards settling the invoice
    const recalcInvoiceStatus = async (invoiceId: string) => {
      const invoice = await prisma.salesInvoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) return null;
      const verifiedPayments = await prisma.customerPayment.aggregate({
        where: { invoiceId: invoice.id, status: 'Verified' },
        _sum: { amount: true, withholdingAmount: true },
      });
      const totalPaid = Math.round(Number(verifiedPayments._sum.amount || 0) * 100) / 100;
      const totalWithheld = Math.round(Number(verifiedPayments._sum.withholdingAmount || 0) * 100) / 100;
      const totalSettled = totalPaid + totalWithheld;
      const invoiceTotal = Math.round(Number(invoice.totalAmount) * 100) / 100;
      // Tolerance: if within 1 ETB, consider fully paid (handles rounding differences)
      const newStatus = (totalSettled >= invoiceTotal || Math.abs(invoiceTotal - totalSettled) < 1)
        ? 'Paid'
        : totalSettled > 0
          ? 'Partial'
          : 'Unpaid';

      await prisma.salesInvoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      });

      return { invoiceNo: invoice.invoiceNo, totalAmount: invoiceTotal, totalPaid, totalWithheld, newStatus };
    };

    // Auto-update invoice status when payment is verified
    let invoiceUpdate = null;
    if (isVerifying && updatedRecord.invoiceId) {
      try {
        invoiceUpdate = await recalcInvoiceStatus(updatedRecord.invoiceId);
      } catch (invErr) {
        console.error('Failed to update invoice status:', invErr);
      }

      // Auto-update daily cash: add this payment as a receipt for today
      try {
        const paymentDate = new Date(updatedRecord.paymentDate);
        paymentDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(paymentDate);
        nextDay.setDate(nextDay.getDate() + 1);

        let dailyCash = await prisma.dailyCash.findFirst({
          where: { cashDate: { gte: paymentDate, lt: nextDay } },
        });

        const paymentAmount = Number(updatedRecord.amount);

        if (dailyCash) {
          const newReceipts = Number(dailyCash.totalReceipts || 0) + paymentAmount;
          const newClosing = Number(dailyCash.openingBalance || 0) + newReceipts - Number(dailyCash.totalPayments || 0);
          await prisma.dailyCash.update({
            where: { id: dailyCash.id },
            data: { totalReceipts: newReceipts, closingBalance: newClosing },
          });
        } else {
          await prisma.dailyCash.create({
            data: {
              cashDate: paymentDate,
              openingBalance: 0,
              totalReceipts: paymentAmount,
              totalPayments: 0,
              closingBalance: paymentAmount,
              status: 'Open',
            },
          });
        }
      } catch (cashErr) {
        console.error('Failed to update daily cash:', cashErr);
      }

      // Create journal entries: Debit specific Bank/Cash, Credit customer-specific AR sub-account
      const paymentAmount = Number(updatedRecord.amount);
      try {
        const journalResult = await journalCustomerPayment(updatedRecord);

        if (journalResult && journalResult.created) {
          notify({
            module: 'FINANCE',
            event: 'auto_journal_posted',
            details: {
              source: 'Customer Payment',
              ref: updatedRecord.receiptNo,
              voucherNo: journalResult.voucherNo,
              amount: paymentAmount,
            },
          });
        }
      } catch (journalErr) {
        console.error('[Payment] Failed to create journal entries:', journalErr);
      }

      // Update bank account balance - use specific bank account if available
      try {
        let bankAcct;
        if (updatedRecord.bankAccountId) {
          bankAcct = await prisma.bankAccount.findUnique({ where: { id: updatedRecord.bankAccountId } });
        }
        if (!bankAcct) {
          // Fallback to default bank account
          bankAcct = await prisma.bankAccount.findFirst({ where: { accountNo: '1000639115554' } });
        }
        if (bankAcct) {
          await prisma.bankAccount.update({
            where: { id: bankAcct.id },
            data: { balance: { increment: paymentAmount } },
          });

          // Create bank transaction
          await prisma.bankTransaction.create({
            data: {
              bankAccountId: bankAcct.id,
              type: 'deposit',
              amount: paymentAmount,
              refNo: updatedRecord.receiptNo || undefined,
              description: `Customer payment ${updatedRecord.receiptNo}`,
              refModule: 'CUSTOMER_PAYMENT',
              refId: params.id,
              transDate: updatedRecord.paymentDate || new Date(),
              reconStatus: 'Pending',
            },
          });
        }
      } catch (err) {
        console.error('[Payment] Failed to update bank balance:', err);
      }
    }

    // If payment is rejected, also recalculate invoice status
    if (isRejecting && updatedRecord.invoiceId) {
      try {
        await recalcInvoiceStatus(updatedRecord.invoiceId);
      } catch (invErr) {
        console.error('Failed to update invoice status on rejection:', invErr);
      }
    }

    if (isVerifying) {
      notify({
        module: 'FINANCE',
        event: 'payment_verified',
        details: {
          receiptNo: updatedRecord.receiptNo,
          customer: updatedRecord.customer?.companyName,
          amount: `ETB ${Number(updatedRecord.amount).toLocaleString('en-US')}`,
          invoice: updatedRecord.invoice?.invoiceNo || '—',
          ...(invoiceUpdate ? { invoiceStatus: invoiceUpdate.newStatus } : {}),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedRecord,
      ...(invoiceUpdate ? { invoiceUpdate } : {}),
    });
  } catch (error: any) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.customerPayment.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    const deletedRecord = await prisma.customerPayment.update({
      where: { id: params.id },
      data: { status: 'Inactive' },
    });

    return NextResponse.json({ success: true, message: 'Record deleted successfully', data: deletedRecord });
  } catch (error: any) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
