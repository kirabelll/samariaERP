import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportId = searchParams.get('reportId') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (dateFrom) {
      startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0);
    }
    if (dateTo) {
      endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
    }

    let columns: string[] = [];
    let rows: any[] = [];

    switch (reportId) {
      case 'sales-by-customer': {
        columns = ['Customer', 'Code', 'Total Invoices', 'Total Amount (ETB)', 'Paid', 'Unpaid'];

        const invoices = await prisma.salesInvoice.findMany({
          where: {
            division: 'MEDICAL',
            ...(startDate || endDate ? {
              invoiceDate: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            } : {}),
          },
          include: { customer: { select: { companyName: true, code: true } } },
        });

        const customerMap = new Map<string, any>();
        for (const inv of invoices) {
          const key = inv.customerId;
          if (!customerMap.has(key)) {
            customerMap.set(key, {
              name: inv.customer?.companyName || 'Unknown',
              code: inv.customer?.code || '-',
              count: 0, total: 0, paid: 0, unpaid: 0,
            });
          }
          const c = customerMap.get(key)!;
          c.count += 1;
          c.total += inv.totalAmount || 0;
          if (inv.status === 'Paid') c.paid += inv.totalAmount || 0;
          else c.unpaid += inv.totalAmount || 0;
        }

        rows = Array.from(customerMap.values())
          .sort((a, b) => b.total - a.total)
          .map((c) => ({
            'Customer': c.name,
            'Code': c.code,
            'Total Invoices': c.count,
            'Total Amount (ETB)': `ETB ${c.total.toLocaleString('en-US')}`,
            'Paid': `ETB ${c.paid.toLocaleString('en-US')}`,
            'Unpaid': `ETB ${c.unpaid.toLocaleString('en-US')}`,
          }));
        break;
      }

      case 'batch-expiry': {
        columns = ['Item', 'Batch No', 'Expiry Date', 'Days Until Expiry', 'Quantity', 'Status', 'Warehouse'];

        const now = new Date();
        const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

        const batches = await prisma.medicalBatch.findMany({
          where: {
            status: 'Available',
            expiryDate: { lte: ninetyDays },
          },
          include: { item: { select: { name: true, code: true } } },
          orderBy: { expiryDate: 'asc' },
          take: 500,
        });

        rows = batches.map((b) => {
          const daysUntil = Math.floor((new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          let status = 'OK';
          if (daysUntil <= 0) status = 'EXPIRED';
          else if (daysUntil <= 30) status = 'Critical (<30 days)';
          else if (daysUntil <= 60) status = 'Warning (<60 days)';
          else status = 'Monitor (<90 days)';

          return {
            'Item': b.item?.name || '-',
            'Batch No': b.batchNo,
            'Expiry Date': new Date(b.expiryDate).toLocaleDateString(),
            'Days Until Expiry': daysUntil,
            'Quantity': b.quantity,
            'Status': status,
            'Warehouse': b.warehouse,
          };
        });
        break;
      }

      case 'store-issue': {
        columns = ['Issue No', 'Customer', 'Items Count', 'Total Amount (ETB)', 'Issued By', 'Status', 'Date'];

        const issues = await prisma.medicalStoreIssue.findMany({
          where: {
            ...(startDate || endDate ? {
              createdAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            } : {}),
          },
          include: { customer: { select: { companyName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });

        rows = issues.map((iss) => {
          let itemsCount = 0;
          try {
            const items = typeof iss.items === 'string' ? JSON.parse(iss.items) : iss.items;
            itemsCount = Array.isArray(items) ? items.length : 0;
          } catch { /* ignore */ }

          return {
            'Issue No': iss.issueNo,
            'Customer': iss.customer?.companyName || '-',
            'Items Count': itemsCount,
            'Total Amount (ETB)': `ETB ${(iss.totalAmount || 0).toLocaleString('en-US')}`,
            'Issued By': iss.issuedBy || '-',
            'Status': iss.status,
            'Date': new Date(iss.createdAt).toLocaleDateString(),
          };
        });
        break;
      }

      case 'margin-analysis': {
        columns = ['Item ID', 'Total Cost', 'Manufacturer Price', 'Recommended Price', 'Margin', 'Margin %'];

        const pricings = await prisma.medicalPricing.findMany({
          take: 500,
        });

        rows = pricings.map((p) => {
          const totalCost = p.totalCost || ((p.manufacturerPrice || 0) + (p.freight || 0) + (p.insurance || 0) + (p.customs || 0) + (p.inlandTransport || 0) + (p.bankCost || 0) + (p.warehouseCost || 0));
          const selling = p.approvedPrice || p.recommendedPrice || 0;
          const margin = selling - totalCost;
          const marginPct = totalCost > 0 ? ((margin / totalCost) * 100).toFixed(1) : '0';

          return {
            'Item ID': p.itemId,
            'Total Cost': `ETB ${totalCost.toLocaleString('en-US')}`,
            'Manufacturer Price': `ETB ${(p.manufacturerPrice || 0).toLocaleString('en-US')}`,
            'Recommended Price': `ETB ${(p.recommendedPrice || 0).toLocaleString('en-US')}`,
            'Margin': `ETB ${margin.toLocaleString('en-US')}`,
            'Margin %': `${marginPct}%`,
          };
        });
        break;
      }

      case 'commission': {
        columns = ['Salesperson', 'Period', 'Total Sales', 'Commission Rate', 'Commission Amount', 'Status'];

        const commissions = await prisma.commissionCalculation.findMany({
          where: {
            ...(startDate || endDate ? {
              periodFrom: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            } : {}),
          },
          orderBy: { periodFrom: 'desc' },
          take: 200,
        });

        rows = commissions.map((c) => ({
          'Salesperson': c.salespersonId,
          'Period': `${new Date(c.periodFrom).toLocaleDateString()} - ${new Date(c.periodTo).toLocaleDateString()}`,
          'Total Sales': `ETB ${(c.totalSales || 0).toLocaleString('en-US')}`,
          'Commission Rate': `${c.commissionRate || 0}%`,
          'Commission Amount': `ETB ${(c.netCommission || 0).toLocaleString('en-US')}`,
          'Status': c.status,
        }));
        break;
      }

      case 'license-expiry': {
        columns = ['Customer', 'Code', 'License No', 'License Expiry', 'Days Until Expiry', 'Status'];

        const customers = await prisma.customer.findMany({
          where: {
            licenseExpiry: { not: null },
          },
          select: { companyName: true, code: true, licenseNo: true, licenseExpiry: true },
          orderBy: { licenseExpiry: 'asc' },
        });

        const now = new Date();
        rows = customers
          .filter((c) => c.licenseExpiry)
          .map((c) => {
            const daysUntil = Math.floor((new Date(c.licenseExpiry!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            let status = 'Valid';
            if (daysUntil <= 0) status = 'EXPIRED';
            else if (daysUntil <= 30) status = 'Expiring Soon';
            else if (daysUntil <= 90) status = 'Warning';

            return {
              'Customer': c.companyName,
              'Code': c.code || '-',
              'License No': c.licenseNo || '-',
              'License Expiry': new Date(c.licenseExpiry!).toLocaleDateString(),
              'Days Until Expiry': daysUntil,
              'Status': status,
            };
          });
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown report: ${reportId}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data: { columns, rows } });
  } catch (error: any) {
    console.error('Error generating medical report:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
