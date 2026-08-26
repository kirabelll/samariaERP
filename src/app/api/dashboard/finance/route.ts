import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const [
      paidInvoices,
      unpaidInvoices,
      customerPayments,
      supplierPayments,
      bankAccounts,
      paymentVouchers,
      customerDeposits,
      pettyCashAllocations,
      pettyCashExpenses,
      vatPeriods,
    ] = await Promise.all([
      prisma.salesInvoice.aggregate({
        where: { status: 'Paid' },
        _sum: { totalAmount: true },
      }),
      prisma.salesInvoice.aggregate({
        where: { status: { in: ['Unpaid', 'Partial'] } },
        _sum: { totalAmount: true },
      }),
      prisma.customerPayment.aggregate({
        _sum: { amount: true },
        _count: true,
      }),
      prisma.supplierPayment.aggregate({
        where: { status: { in: ['Pending', 'Approved'] } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.bankAccount.findMany({
        where: { status: 'Active' },
        orderBy: { balance: 'desc' },
        take: 6,
      }),
      prisma.paymentVoucher.findMany({
        take: 6,
        orderBy: { voucherDate: 'desc' },
      }),
      prisma.customerDeposit.findMany({
        take: 6,
        include: { customer: { select: { companyName: true } } },
        orderBy: { depositDate: 'desc' },
      }),
      prisma.pettyCash.aggregate({
        where: { type: 'FUND_ALLOCATION', status: { in: ['Approved', 'Posted'] } },
        _sum: { amount: true },
      }),
      prisma.pettyCash.aggregate({
        where: { type: 'EXPENSE', status: { in: ['Approved', 'Posted'] } },
        _sum: { amount: true },
      }),
      prisma.vatPeriod.findMany({
        take: 3,
        orderBy: { periodName: 'desc' },
      }),
    ]);

    const totalRevenue = paidInvoices._sum.totalAmount || customerPayments._sum.amount || 0;
    const outstandingReceivables = unpaidInvoices._sum.totalAmount || 0;
    const pendingPayables = supplierPayments._sum.amount || 0;
    const totalBankBalance = bankAccounts.reduce((sum, b) => sum + (b.balance || 0), 0);
    const pettyCashBalance = (pettyCashAllocations._sum.amount || 0) - (pettyCashExpenses._sum.amount || 0);
    const unappliedDeposits = customerDeposits.reduce((sum, d) => sum + (d.unappliedAmount || 0), 0);

    const totalOutputVat = vatPeriods.reduce((sum, v) => sum + (v.outputVat || 0), 0);
    const totalInputVat = vatPeriods.reduce((sum, v) => sum + (v.inputVat || 0), 0);
    const netVatLiability = totalOutputVat - totalInputVat;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          outstandingReceivables,
          pendingPayables,
          totalBankBalance,
          pettyCashBalance,
          unappliedDeposits,
          netVatLiability,
          customerPaymentsCount: customerPayments._count || 0,
          pendingPayablesCount: supplierPayments._count || 0,
        },
        bankAccounts: bankAccounts.map((b) => ({
          id: b.id,
          bankName: b.bankName,
          accountNo: b.accountNo,
          accountName: b.accountName,
          balance: b.balance,
          currency: b.currency,
        })),
        recentVouchers: paymentVouchers.map((v) => ({
          id: v.id,
          voucherNo: v.voucherNo,
          voucherType: v.voucherType,
          payeeName: v.payeeName,
          amount: v.amount,
          paymentMethod: v.paymentMethod,
          status: v.status,
          date: v.voucherDate,
        })),
        recentDeposits: customerDeposits.map((d) => ({
          id: d.id,
          depositNo: d.depositNo,
          customer: d.customer?.companyName || 'Unknown Customer',
          amount: d.amount,
          unappliedAmount: d.unappliedAmount,
          method: d.depositMethod,
          status: d.status,
          date: d.depositDate,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching finance dashboard stats:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
