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
      case 'sales-by-customer': {
        columns = ['Customer', 'Code', 'Total Invoices', 'Total Amount (ETB)', 'Paid', 'Unpaid'];
        const invoices = await prisma.salesInvoice.findMany({
          where: { division: 'MEDICAL', ...dateRange('invoiceDate') },
          include: { customer: { select: { companyName: true, code: true } } },
        });
        const customerMap = new Map<string, any>();
        for (const inv of invoices) {
          const key = inv.customerId;
          if (!customerMap.has(key)) customerMap.set(key, { name: inv.customer?.companyName || 'Unknown', code: inv.customer?.code || '-', count: 0, total: 0, paid: 0, unpaid: 0 });
          const c = customerMap.get(key)!;
          c.count += 1; c.total += inv.totalAmount || 0;
          if (inv.status === 'Paid') c.paid += inv.totalAmount || 0; else c.unpaid += inv.totalAmount || 0;
        }
        rows = Array.from(customerMap.values()).sort((a, b) => b.total - a.total).map((c) => ({
          'Customer': c.name, 'Code': c.code, 'Total Invoices': c.count,
          'Total Amount (ETB)': c.total.toFixed(2), 'Paid': c.paid.toFixed(2), 'Unpaid': c.unpaid.toFixed(2),
        }));
        break;
      }
      case 'batch-expiry': {
        columns = ['Item', 'Batch No', 'Expiry Date', 'Days Until Expiry', 'Quantity', 'Status', 'Warehouse'];
        const now = new Date();
        const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        const batches = await prisma.medicalBatch.findMany({
          where: { status: 'Available', expiryDate: { lte: ninetyDays } },
          include: { item: { select: { name: true } } },
          orderBy: { expiryDate: 'asc' }, take: 5000,
        });
        rows = batches.map((b) => {
          const daysUntil = Math.floor((new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          let status = daysUntil <= 0 ? 'EXPIRED' : daysUntil <= 30 ? 'Critical' : daysUntil <= 60 ? 'Warning' : 'Monitor';
          return { 'Item': b.item?.name || '-', 'Batch No': b.batchNo, 'Expiry Date': new Date(b.expiryDate).toLocaleDateString(),
            'Days Until Expiry': daysUntil, 'Quantity': b.quantity, 'Status': status, 'Warehouse': b.warehouse };
        });
        break;
      }
      case 'store-issue': {
        columns = ['Issue No', 'Customer', 'Items Count', 'Total Amount (ETB)', 'Issued By', 'Status', 'Date'];
        const issues = await prisma.medicalStoreIssue.findMany({
          where: { ...dateRange('createdAt') },
          include: { customer: { select: { companyName: true } } },
          orderBy: { createdAt: 'desc' }, take: 5000,
        });
        rows = issues.map((iss) => {
          let itemsCount = 0;
          try { const items = typeof iss.items === 'string' ? JSON.parse(iss.items) : iss.items; itemsCount = Array.isArray(items) ? items.length : 0; } catch {}
          return { 'Issue No': iss.issueNo, 'Customer': iss.customer?.companyName || '-', 'Items Count': itemsCount,
            'Total Amount (ETB)': (iss.totalAmount || 0).toFixed(2), 'Issued By': iss.issuedBy || '-', 'Status': iss.status,
            'Date': new Date(iss.createdAt).toLocaleDateString() };
        });
        break;
      }
      case 'margin-analysis': {
        columns = ['Item ID', 'Total Cost', 'Manufacturer Price', 'Recommended Price', 'Margin', 'Margin %'];
        const pricings = await prisma.medicalPricing.findMany({ take: 5000 });
        rows = pricings.map((p) => {
          const totalCost = p.totalCost || ((p.manufacturerPrice || 0) + (p.freight || 0) + (p.insurance || 0) + (p.customs || 0) + (p.inlandTransport || 0) + (p.bankCost || 0) + (p.warehouseCost || 0));
          const selling = p.approvedPrice || p.recommendedPrice || 0;
          const margin = selling - totalCost;
          const marginPct = totalCost > 0 ? ((margin / totalCost) * 100).toFixed(1) : '0';
          return { 'Item ID': p.itemId, 'Total Cost': totalCost.toFixed(2), 'Manufacturer Price': (p.manufacturerPrice || 0).toFixed(2),
            'Recommended Price': (p.recommendedPrice || 0).toFixed(2), 'Margin': margin.toFixed(2), 'Margin %': `${marginPct}%` };
        });
        break;
      }
      case 'commission': {
        columns = ['Salesperson', 'Period', 'Total Sales', 'Commission Rate', 'Commission Amount', 'Status'];
        const commissions = await prisma.commissionCalculation.findMany({
          where: { ...dateRange('periodFrom') }, orderBy: { periodFrom: 'desc' }, take: 5000,
        });
        rows = commissions.map((c) => ({
          'Salesperson': c.salespersonId, 'Period': `${new Date(c.periodFrom).toLocaleDateString()} - ${new Date(c.periodTo).toLocaleDateString()}`,
          'Total Sales': (c.totalSales || 0).toFixed(2), 'Commission Rate': `${c.commissionRate || 0}%`,
          'Commission Amount': (c.netCommission || 0).toFixed(2), 'Status': c.status,
        }));
        break;
      }
      case 'license-expiry': {
        columns = ['Customer', 'Code', 'License No', 'License Expiry', 'Days Until Expiry', 'Status'];
        const customers = await prisma.customer.findMany({
          where: { licenseExpiry: { not: null } },
          select: { companyName: true, code: true, licenseNo: true, licenseExpiry: true },
          orderBy: { licenseExpiry: 'asc' },
        });
        const now = new Date();
        rows = customers.filter((c) => c.licenseExpiry).map((c) => {
          const daysUntil = Math.floor((new Date(c.licenseExpiry!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          let status = daysUntil <= 0 ? 'EXPIRED' : daysUntil <= 30 ? 'Expiring Soon' : daysUntil <= 90 ? 'Warning' : 'Valid';
          return { 'Customer': c.companyName, 'Code': c.code || '-', 'License No': c.licenseNo || '-',
            'License Expiry': new Date(c.licenseExpiry!).toLocaleDateString(), 'Days Until Expiry': daysUntil, 'Status': status };
        });
        break;
      }
      default:
        return new Response('Unknown report', { status: 400 });
    }

    const csv = toCSV(columns, rows);
    return csvResponse(csv, `${reportId}-report.csv`);
  } catch (error: any) {
    console.error('Error exporting medical report:', error);
    return new Response(error.message, { status: 500 });
  }
}
