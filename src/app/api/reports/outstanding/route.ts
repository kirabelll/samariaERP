import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'customers';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    let data: any = {};

    // ============================================================
    // CUSTOMERS: given (SalesInvoice total), paid (CustomerPayment verified)
    // ============================================================
    if (type === 'customers') {
      // Get all customers
      const customers = await prisma.customer.findMany({
        select: { id: true, companyName: true, firstName: true, lastName: true },
      });

      const results = [];

      for (const customer of customers) {
        // Sum of all sales invoices (given)
        const invoiceData = await prisma.salesInvoice.aggregate({
          where: { customerId: customer.id },
          _sum: { totalAmount: true },
        });

        const given = invoiceData._sum.totalAmount ?? 0;

        // Sum of verified customer payments (paid)
        const paymentData = await prisma.customerPayment.aggregate({
          where: {
            customerId: customer.id,
            status: { not: 'Rejected' },
          },
          _sum: { amount: true },
        });

        const paid = paymentData._sum.amount ?? 0;
        const outstanding = given - paid;

        // Only include if there's activity
        if (given > 0 || paid > 0) {
          results.push({
            customerId: customer.id,
            customerName: customer.companyName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
            given: Math.max(0, given),
            paid: Math.max(0, paid),
            outstanding: Math.max(0, outstanding),
          });
        }
      }

      // Calculate totals
      const totals = results.reduce(
        (acc, row) => ({
          given: acc.given + row.given,
          paid: acc.paid + row.paid,
          outstanding: acc.outstanding + row.outstanding,
        }),
        { given: 0, paid: 0, outstanding: 0 }
      );

      data = {
        records: results.sort((a, b) => b.outstanding - a.outstanding),
        totals,
      };
    }

    // ============================================================
    // SUPPLIERS: given (PurchaseOrder not Draft/Cancelled), paid (SupplierPayment Paid)
    // ============================================================
    else if (type === 'suppliers') {
      const suppliers = await prisma.supplier.findMany({
        select: { id: true, companyName: true },
      });

      const results = [];

      for (const supplier of suppliers) {
        // Sum of purchase orders (not Draft or Cancelled)
        const poData = await prisma.purchaseOrder.aggregate({
          where: {
            supplierId: supplier.id,
            status: { notIn: ['Draft', 'Cancelled'] },
          },
          _sum: { totalAmount: true },
        });

        const given = poData._sum.totalAmount ?? 0;

        // Sum of paid supplier payments
        const paymentData = await prisma.supplierPayment.aggregate({
          where: {
            supplierId: supplier.id,
            status: 'Paid',
          },
          _sum: { amount: true },
        });

        const paid = paymentData._sum.amount ?? 0;
        const outstanding = given - paid;

        // Only include if there's activity
        if (given > 0 || paid > 0) {
          results.push({
            supplierId: supplier.id,
            supplierName: supplier.companyName,
            given: Math.max(0, given),
            paid: Math.max(0, paid),
            outstanding: Math.max(0, outstanding),
          });
        }
      }

      // Calculate totals
      const totals = results.reduce(
        (acc, row) => ({
          given: acc.given + row.given,
          paid: acc.paid + row.paid,
          outstanding: acc.outstanding + row.outstanding,
        }),
        { given: 0, paid: 0, outstanding: 0 }
      );

      data = {
        records: results.sort((a, b) => b.outstanding - a.outstanding),
        totals,
      };
    }

    // ============================================================
    // TRANSPORTERS: given (AggregateDelivery netTruckPayment), paid (TruckPayment Paid + AggregateSettlement Paid)
    // ============================================================
    else if (type === 'transporters') {
      const transporters = await prisma.transporter.findMany({
        select: { id: true, companyName: true, firstName: true, lastName: true },
      });

      const results = [];

      for (const transporter of transporters) {
        // Sum of aggregate delivery net truck payments (status != Dispatched)
        const deliveryData = await prisma.aggregateDelivery.aggregate({
          where: {
            transporterId: transporter.id,
            status: { not: 'Dispatched' },
          },
          _sum: { netTruckPayment: true },
        });

        const given = deliveryData._sum.netTruckPayment ?? 0;

        // Sum of truck payments (status = Paid)
        const truckPaymentData = await prisma.truckPayment.aggregate({
          where: {
            transporterId: transporter.id,
            status: 'Paid',
          },
          _sum: { finalPayable: true },
        });

        const truckPaymentPaid = truckPaymentData._sum.finalPayable ?? 0;

        // Sum of aggregate settlements (status = Paid)
        const settlementData = await prisma.aggregateSettlement.aggregate({
          where: {
            transporterId: transporter.id,
            status: 'Paid',
          },
          _sum: { finalPayable: true },
        });

        const settlementPaid = settlementData._sum.finalPayable ?? 0;

        const paid = truckPaymentPaid + settlementPaid;
        const outstanding = given - paid;

        // Only include if there's activity
        if (given > 0 || paid > 0) {
          results.push({
            transporterId: transporter.id,
            transporterName: transporter.companyName || `${transporter.firstName || ''} ${transporter.lastName || ''}`.trim(),
            given: Math.max(0, given),
            paid: Math.max(0, paid),
            outstanding: Math.max(0, outstanding),
          });
        }
      }

      // Calculate totals
      const totals = results.reduce(
        (acc, row) => ({
          given: acc.given + row.given,
          paid: acc.paid + row.paid,
          outstanding: acc.outstanding + row.outstanding,
        }),
        { given: 0, paid: 0, outstanding: 0 }
      );

      data = {
        records: results.sort((a, b) => b.outstanding - a.outstanding),
        totals,
      };
    } else {
      return NextResponse.json({ success: false, error: 'Invalid report type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error generating outstanding report:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
