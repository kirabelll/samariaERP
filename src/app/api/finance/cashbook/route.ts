import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json(
        { success: false, error: 'from and to date parameters are required' },
        { status: 400 }
      );
    }

    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // Fetch verified customer payments (these are receipts/cash inflows)
    const customerPayments = await prisma.customerPayment.findMany({
      where: {
        paymentDate: {
          gte: fromDate,
          lte: toDate,
        },
        status: 'Verified',
      },
      include: {
        customer: { select: { companyName: true } },
        invoice: { select: { invoiceNo: true } },
      },
      orderBy: { paymentDate: 'asc' },
    });

    // Fetch approved/posted payment vouchers (these are cash outflows)
    const paymentVouchers = await prisma.paymentVoucher.findMany({
      where: {
        voucherDate: {
          gte: fromDate,
          lte: toDate,
        },
        status: { in: ['Approved', 'Posted'] },
        voucherType: 'PAYMENT',
      },
      orderBy: { voucherDate: 'asc' },
    });

    // Also fetch receipt-type vouchers as inflows
    const receiptVouchers = await prisma.paymentVoucher.findMany({
      where: {
        voucherDate: {
          gte: fromDate,
          lte: toDate,
        },
        status: { in: ['Approved', 'Posted'] },
        voucherType: 'RECEIPT',
      },
      orderBy: { voucherDate: 'asc' },
    });

    // Build cashbook entries sorted by date
    interface CashbookEntry {
      id: string;
      date: string;
      voucherNo: string;
      description: string;
      receipts: number;
      payments: number;
      type: 'receipt' | 'payment';
    }

    const entries: CashbookEntry[] = [];

    // Add customer payments as receipts
    for (const payment of customerPayments) {
      const dateStr = payment.paymentDate.toISOString().split('T')[0];
      entries.push({
        id: payment.id,
        date: dateStr,
        voucherNo: payment.receiptNo,
        description: `Payment from ${payment.customer?.companyName || 'Customer'} ${payment.invoice?.invoiceNo ? `(Inv: ${payment.invoice.invoiceNo})` : ''} - ${payment.paymentMethod}`,
        receipts: payment.amount,
        payments: 0,
        type: 'receipt',
      });
    }

    // Add receipt vouchers as receipts
    for (const voucher of receiptVouchers) {
      const dateStr = voucher.voucherDate.toISOString().split('T')[0];
      entries.push({
        id: voucher.id,
        date: dateStr,
        voucherNo: voucher.voucherNo,
        description: `${voucher.description || `Receipt from ${voucher.payeeName}`}`,
        receipts: voucher.amount,
        payments: 0,
        type: 'receipt',
      });
    }

    // Add payment vouchers as payments
    for (const voucher of paymentVouchers) {
      const dateStr = voucher.voucherDate.toISOString().split('T')[0];
      entries.push({
        id: voucher.id,
        date: dateStr,
        voucherNo: voucher.voucherNo,
        description: `${voucher.description || `Payment to ${voucher.payeeName}`} (${voucher.sourceModule})`,
        receipts: 0,
        payments: voucher.amount,
        type: 'payment',
      });
    }

    // Sort by date, then receipts before payments
    entries.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      // Receipts before payments on same day
      if (a.type === 'receipt' && b.type === 'payment') return -1;
      if (a.type === 'payment' && b.type === 'receipt') return 1;
      return 0;
    });

    // Calculate running balance
    let runningBalance = 0;
    const entriesWithBalance = entries.map((entry) => {
      runningBalance += entry.receipts - entry.payments;
      return {
        ...entry,
        balance: runningBalance,
      };
    });

    // Summary totals
    const totalReceipts = entries.reduce((sum, e) => sum + e.receipts, 0);
    const totalPayments = entries.reduce((sum, e) => sum + e.payments, 0);

    return NextResponse.json({
      success: true,
      data: {
        entries: entriesWithBalance,
        summary: {
          totalReceipts,
          totalPayments,
          netMovement: totalReceipts - totalPayments,
          closingBalance: runningBalance,
          receiptCount: entries.filter((e) => e.type === 'receipt').length,
          paymentCount: entries.filter((e) => e.type === 'payment').length,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching cashbook data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
