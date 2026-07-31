import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toCSV, csvResponse } from '@/lib/csv-export';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportId = searchParams.get('reportId') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (dateFrom) { startDate = new Date(dateFrom); startDate.setHours(0, 0, 0, 0); }
    if (dateTo) { endDate = new Date(dateTo); endDate.setHours(23, 59, 59, 999); }

    const dateRange = (field: string) => {
      if (!startDate && !endDate) return {};
      return { [field]: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } };
    };

    let columns: string[] = [];
    let rows: any[] = [];

    switch (reportId) {
      case 'receivable-aging': {
        columns = ['Customer', 'Invoice No', 'Total Amount', 'Status', 'Age (Days)', 'Age Bracket'];
        const invoices = await prisma.salesInvoice.findMany({
          where: { status: { in: ['Unpaid', 'Partial'] }, ...dateRange('invoiceDate') },
          include: { customer: { select: { companyName: true } } },
          orderBy: { invoiceDate: 'asc' },
        });
        rows = invoices.map((inv) => {
          const ageDays = Math.floor((Date.now() - new Date(inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24));
          let bracket = ageDays > 90 ? '90+ days' : ageDays > 60 ? '61-90 days' : ageDays > 30 ? '31-60 days' : '0-30 days';
          return { 'Customer': inv.customer?.companyName || 'Unknown', 'Invoice No': inv.invoiceNo,
            'Total Amount': (inv.totalAmount || 0).toFixed(2), 'Status': inv.status, 'Age (Days)': ageDays, 'Age Bracket': bracket };
        });
        break;
      }
      case 'payable-aging': {
        columns = ['Supplier', 'Payment No', 'Amount', 'Status', 'Age (Days)', 'Age Bracket'];
        const payments = await prisma.supplierPayment.findMany({
          where: { status: { in: ['Pending', 'Approved'] }, ...dateRange('paymentDate') },
          include: { supplier: { select: { companyName: true } } },
          orderBy: { paymentDate: 'asc' },
        });
        rows = payments.map((pmt) => {
          const ageDays = Math.floor((Date.now() - new Date(pmt.paymentDate).getTime()) / (1000 * 60 * 60 * 24));
          let bracket = ageDays > 90 ? '90+ days' : ageDays > 60 ? '61-90 days' : ageDays > 30 ? '31-60 days' : '0-30 days';
          return { 'Supplier': pmt.supplier?.companyName || 'Unknown', 'Payment No': pmt.paymentNo,
            'Amount': (pmt.amount || 0).toFixed(2), 'Status': pmt.status, 'Age (Days)': ageDays, 'Age Bracket': bracket };
        });
        break;
      }
      case 'unresolved-exceptions': {
        columns = ['Type', 'Severity', 'Module', 'Reference', 'Description', 'Status', 'Created'];
        const exceptions = await prisma.exceptionLog.findMany({
          where: { status: { in: ['Open', 'In_Progress', 'Escalated'] }, ...dateRange('createdAt') },
          orderBy: { createdAt: 'desc' }, take: 5000,
        });
        rows = exceptions.map((ex) => ({
          'Type': ex.exceptionType, 'Severity': ex.severity, 'Module': ex.module,
          'Reference': ex.recordRef || '-', 'Description': ex.description,
          'Status': ex.status, 'Created': new Date(ex.createdAt).toLocaleDateString(),
        }));
        break;
      }
      case 'document-verification': {
        columns = ['Type', 'Module', 'Reference', 'Description', 'Status', 'Created'];
        const docExceptions = await prisma.exceptionLog.findMany({
          where: { exceptionType: { in: ['MISSING_DOCUMENT', 'EXPIRED_LICENSE'] }, ...dateRange('createdAt') },
          orderBy: { createdAt: 'desc' }, take: 5000,
        });
        rows = docExceptions.map((ex) => ({
          'Type': ex.exceptionType, 'Module': ex.module, 'Reference': ex.recordRef || '-',
          'Description': ex.description, 'Status': ex.status, 'Created': new Date(ex.createdAt).toLocaleDateString(),
        }));
        break;
      }
      case 'approval-turnaround': {
        columns = ['Module', 'Total Records', 'Avg Days to Resolve', 'Open Count', 'Resolved Count'];
        const allExceptions = await prisma.exceptionLog.findMany({
          where: { ...dateRange('createdAt') },
          select: { module: true, status: true, createdAt: true, resolvedAt: true },
        });
        const moduleMap = new Map<string, { total: number; openCount: number; resolvedCount: number; totalDays: number }>();
        for (const ex of allExceptions) {
          if (!moduleMap.has(ex.module)) moduleMap.set(ex.module, { total: 0, openCount: 0, resolvedCount: 0, totalDays: 0 });
          const entry = moduleMap.get(ex.module)!;
          entry.total += 1;
          if (['Open', 'In_Progress', 'Escalated'].includes(ex.status)) { entry.openCount += 1; }
          else {
            entry.resolvedCount += 1;
            if (ex.resolvedAt) {
              entry.totalDays += Math.floor((new Date(ex.resolvedAt).getTime() - new Date(ex.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            }
          }
        }
        rows = Array.from(moduleMap.entries()).map(([module, stats]) => ({
          'Module': module, 'Total Records': stats.total,
          'Avg Days to Resolve': stats.resolvedCount > 0 ? (stats.totalDays / stats.resolvedCount).toFixed(1) : 'N/A',
          'Open Count': stats.openCount, 'Resolved Count': stats.resolvedCount,
        }));
        break;
      }
      default:
        return new Response('Unknown report', { status: 400 });
    }

    const csv = toCSV(columns, rows);
    return csvResponse(csv, `${reportId}-report.csv`);
  } catch (error: any) {
    console.error('Error exporting exception report:', error);
    return new Response(error.message, { status: 500 });
  }
}
