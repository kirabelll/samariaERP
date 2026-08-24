import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get counts from all major tables
    const [
      totalCustomers,
      totalSuppliers,
      totalEmployees,
      totalFactories,
      totalTransporters,
      totalItems,
    ] = await Promise.all([
      prisma.customer.count({ where: { status: 'Active' } }),
      prisma.supplier.count({ where: { status: 'Active' } }),
      prisma.employee.count({ where: { status: 'Active' } }),
      prisma.factory.count({ where: { status: 'Active' } }),
      prisma.transporter.count({ where: { status: 'Active' } }),
      prisma.item.count({ where: { status: 'Active' } }),
    ]);

    // Get financial metrics
    const paidInvoices = await prisma.salesInvoice.aggregate({
      where: { status: 'Paid' },
      _sum: { totalAmount: true },
    });

    const unpaidInvoices = await prisma.salesInvoice.aggregate({
      where: { status: { in: ['Unpaid', 'Partial'] } },
      _sum: { totalAmount: true },
    });

    const totalRevenue = paidInvoices._sum.totalAmount || 0;
    const outstandingReceivables = unpaidInvoices._sum.totalAmount || 0;

    // Get pending approvals
    const pendingApprovals = await prisma.approval.count({
      where: { status: 'PENDING' },
    });

    // Get recent activity logs (last 10)
    const recentActivities = await prisma.activityLog.findMany({
      take: 10,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Get stock summary
    const lowStockItems = await prisma.stockBalance.findMany({
      where: { quantity: { lte: 10 } },
      include: { item: true },
      take: 10,
    });

    // Get recent orders
    const recentOrders = await prisma.salesOrder.findMany({
      take: 5,
      include: { customer: true },
      orderBy: { orderDate: 'desc' },
    });

    // Get recent invoices
    const recentInvoices = await prisma.salesInvoice.findMany({
      take: 5,
      include: { customer: true },
      orderBy: { invoiceDate: 'desc' },
    });

    // Get bank accounts
    const bankAccounts = await prisma.bankAccount.findMany({
      orderBy: [{ status: 'asc' }, { balance: 'desc' }],
    });
    const totalBankBalance = bankAccounts
      .filter((b) => b.status === 'Active')
      .reduce((sum, b) => sum + (b.balance || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalCustomers,
          totalSuppliers,
          totalEmployees,
          totalFactories,
          totalTransporters,
          totalItems,
          totalRevenue,
          outstandingReceivables,
          pendingApprovals,
          totalBankBalance,
        },
        bankSummary: {
          totalBalance: totalBankBalance,
          accounts: bankAccounts.map((b) => ({
            id: b.id,
            bankName: b.bankName,
            accountNo: b.accountNo,
            accountName: b.accountName,
            branch: b.branch,
            currency: b.currency,
            balance: b.balance,
            status: b.status,
          })),
        },
        charts: {
          lowStockItems: lowStockItems.map((item) => ({
            itemName: item.item.name,
            quantity: item.quantity,
            warehouse: item.warehouse,
          })),
          recentOrders: recentOrders.map((order) => ({
            orderNo: order.orderNo,
            customerName: order.customer.companyName,
            totalAmount: order.totalAmount,
            status: order.status,
            date: order.orderDate,
          })),
          recentInvoices: recentInvoices.map((invoice) => ({
            invoiceNo: invoice.invoiceNo,
            customerName: invoice.customer.companyName,
            totalAmount: invoice.totalAmount,
            status: invoice.status,
            date: invoice.invoiceDate,
          })),
        },
        activities: recentActivities.map((activity) => ({
          id: activity.id,
          action: activity.action,
          module: activity.module,
          user: `${activity.user.firstName} ${activity.user.lastName}`,
          timestamp: activity.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
