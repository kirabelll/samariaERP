import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toCSV, csvResponse } from '@/lib/csv-export';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'customers';

    let columns: string[] = [];
    let rows: any[] = [];

    if (type === 'customers') {
      columns = ['Customer', 'Total Invoiced (ETB)', 'Total Paid (ETB)', 'Outstanding (ETB)', '% Paid'];
      const customers = await prisma.customer.findMany({
        select: { id: true, companyName: true, firstName: true, lastName: true },
      });
      for (const customer of customers) {
        const invoiceData = await prisma.salesInvoice.aggregate({
          where: { customerId: customer.id }, _sum: { totalAmount: true },
        });
        const given = invoiceData._sum.totalAmount ?? 0;
        const paymentData = await prisma.customerPayment.aggregate({
          where: { customerId: customer.id, status: { not: 'Rejected' } }, _sum: { amount: true },
        });
        const paid = paymentData._sum.amount ?? 0;
        const outstanding = Math.max(0, given - paid);
        if (given > 0 || paid > 0) {
          const name = customer.companyName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
          const pctPaid = given > 0 ? ((paid / given) * 100).toFixed(1) : '0';
          rows.push({ 'Customer': name, 'Total Invoiced (ETB)': given.toFixed(2), 'Total Paid (ETB)': paid.toFixed(2),
            'Outstanding (ETB)': outstanding.toFixed(2), '% Paid': `${pctPaid}%` });
        }
      }
      rows.sort((a, b) => parseFloat(b['Outstanding (ETB)']) - parseFloat(a['Outstanding (ETB)']));
    }
    else if (type === 'suppliers') {
      columns = ['Supplier', 'Total Orders (ETB)', 'Total Paid (ETB)', 'Outstanding (ETB)', '% Paid'];
      const suppliers = await prisma.supplier.findMany({
        select: { id: true, companyName: true },
      });
      for (const supplier of suppliers) {
        const poData = await prisma.purchaseOrder.aggregate({
          where: { supplierId: supplier.id, status: { notIn: ['Draft', 'Cancelled'] } }, _sum: { totalAmount: true },
        });
        const given = poData._sum.totalAmount ?? 0;
        const paymentData = await prisma.supplierPayment.aggregate({
          where: { supplierId: supplier.id, status: 'Paid' }, _sum: { amount: true },
        });
        const paid = paymentData._sum.amount ?? 0;
        const outstanding = Math.max(0, given - paid);
        if (given > 0 || paid > 0) {
          const pctPaid = given > 0 ? ((paid / given) * 100).toFixed(1) : '0';
          rows.push({ 'Supplier': supplier.companyName, 'Total Orders (ETB)': given.toFixed(2),
            'Total Paid (ETB)': paid.toFixed(2), 'Outstanding (ETB)': outstanding.toFixed(2), '% Paid': `${pctPaid}%` });
        }
      }
      rows.sort((a, b) => parseFloat(b['Outstanding (ETB)']) - parseFloat(a['Outstanding (ETB)']));
    }
    else if (type === 'transporters') {
      columns = ['Transporter', 'Total Owed (ETB)', 'Total Paid (ETB)', 'Outstanding (ETB)', '% Paid'];
      const transporters = await prisma.transporter.findMany({
        select: { id: true, companyName: true, firstName: true, lastName: true },
      });
      for (const transporter of transporters) {
        const deliveryData = await prisma.aggregateDelivery.aggregate({
          where: { transporterId: transporter.id, status: { not: 'Dispatched' } }, _sum: { netTruckPayment: true },
        });
        const given = deliveryData._sum.netTruckPayment ?? 0;
        const truckPaymentData = await prisma.truckPayment.aggregate({
          where: { transporterId: transporter.id, status: 'Paid' }, _sum: { finalPayable: true },
        });
        const settlementData = await prisma.aggregateSettlement.aggregate({
          where: { transporterId: transporter.id, status: 'Paid' }, _sum: { finalPayable: true },
        });
        const paid = (truckPaymentData._sum.finalPayable ?? 0) + (settlementData._sum.finalPayable ?? 0);
        const outstanding = Math.max(0, given - paid);
        if (given > 0 || paid > 0) {
          const name = transporter.companyName || `${transporter.firstName || ''} ${transporter.lastName || ''}`.trim();
          const pctPaid = given > 0 ? ((paid / given) * 100).toFixed(1) : '0';
          rows.push({ 'Transporter': name, 'Total Owed (ETB)': given.toFixed(2), 'Total Paid (ETB)': paid.toFixed(2),
            'Outstanding (ETB)': outstanding.toFixed(2), '% Paid': `${pctPaid}%` });
        }
      }
      rows.sort((a, b) => parseFloat(b['Outstanding (ETB)']) - parseFloat(a['Outstanding (ETB)']));
    }
    else {
      return new Response('Invalid type', { status: 400 });
    }

    const csv = toCSV(columns, rows);
    return csvResponse(csv, `outstanding-${type}-report.csv`);
  } catch (error: any) {
    console.error('Error exporting outstanding report:', error);
    return new Response(error.message, { status: 500 });
  }
}
