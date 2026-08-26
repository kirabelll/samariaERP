import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const [
      proformasAgg,
      ordersAgg,
      invoicesPaidAgg,
      invoicesUnpaidAgg,
      proformaStatusCounts,
      orderStatusCounts,
      activeAgreementsCount,
      recentOrders,
      recentInvoices,
      topCustomers,
    ] = await Promise.all([
      prisma.proforma.aggregate({
        where: { status: { in: ['Draft', 'Sent', 'Accepted'] } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.salesOrder.aggregate({
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.salesInvoice.aggregate({
        where: { status: 'Paid' },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.salesInvoice.aggregate({
        where: { status: { in: ['Unpaid', 'Partial'] } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      Promise.all([
        prisma.proforma.count({ where: { status: 'Draft' } }),
        prisma.proforma.count({ where: { status: 'Sent' } }),
        prisma.proforma.count({ where: { status: 'Accepted' } }),
        prisma.proforma.count({ where: { status: 'Expired' } }),
      ]),
      Promise.all([
        prisma.salesOrder.count({ where: { status: 'Pending' } }),
        prisma.salesOrder.count({ where: { status: 'Confirmed' } }),
        prisma.salesOrder.count({ where: { status: 'InProgress' } }),
        prisma.salesOrder.count({ where: { status: 'Delivered' } }),
      ]),
      prisma.salesAgreement.count({ where: { status: 'Active' } }),
      prisma.salesOrder.findMany({
        take: 6,
        orderBy: { orderDate: 'desc' },
        include: { customer: { select: { companyName: true } } },
      }),
      prisma.salesInvoice.findMany({
        take: 6,
        orderBy: { invoiceDate: 'desc' },
        include: { customer: { select: { companyName: true } } },
      }),
      prisma.customer.findMany({
        take: 5,
        orderBy: { salesOrders: { _count: 'desc' } },
        include: {
          _count: { select: { salesOrders: true, invoices: true } },
        },
      }),
    ]);

    const [draftProformas, sentProformas, acceptedProformas, expiredProformas] = proformaStatusCounts;
    const [pendingOrders, confirmedOrders, inProgressOrders, deliveredOrders] = orderStatusCounts;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue: invoicesPaidAgg._sum.totalAmount || 0,
          pipelineValue: proformasAgg._sum.totalAmount || 0,
          totalOrderValue: ordersAgg._sum.totalAmount || 0,
          outstandingReceivables: invoicesUnpaidAgg._sum.totalAmount || 0,
          activeAgreements: activeAgreementsCount,
          totalOrdersCount: ordersAgg._count || 0,
        },
        funnel: {
          proformas: {
            draft: draftProformas,
            sent: sentProformas,
            accepted: acceptedProformas,
            expired: expiredProformas,
          },
          orders: {
            pending: pendingOrders,
            confirmed: confirmedOrders,
            inProgress: inProgressOrders,
            delivered: deliveredOrders,
          },
        },
        topCustomers: topCustomers.map((c) => ({
          id: c.id,
          name: c.companyName,
          phone: c.phone,
          ordersCount: c._count.salesOrders,
          invoicesCount: c._count.invoices,
          status: c.status,
        })),
        recentOrders: recentOrders.map((o) => ({
          id: o.id,
          orderNo: o.orderNo,
          customer: o.customer?.companyName || '—',
          totalAmount: o.totalAmount,
          status: o.status,
          date: o.orderDate,
        })),
        recentInvoices: recentInvoices.map((inv) => ({
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          customer: inv.customer?.companyName || '—',
          totalAmount: inv.totalAmount,
          status: inv.status,
          date: inv.invoiceDate,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales dashboard stats:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
