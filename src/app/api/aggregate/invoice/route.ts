import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createJournalEntries, ACCOUNTS } from '@/lib/accounting';
import { notify } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

/**
 * POST /api/aggregate/invoice
 * Generate a sales invoice from uninvoiced aggregate deliveries for a customer.
 *
 * Body: { customerId, deliveryIds?, startDate?, endDate?, includeVat?, createdBy? }
 *  - deliveryIds: specific delivery IDs to include (optional — if omitted, all uninvoiced deliveries for the customer)
 *  - startDate/endDate: filter by dispatch date range (optional)
 *  - includeVat: whether to add 15% VAT (default false)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, deliveryIds, startDate, endDate, includeVat, createdBy } = body;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'customerId is required' },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyName: true, code: true },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Build where clause for deliveries
    const deliveryWhere: any = {
      customerId,
      status: { in: ['Delivered', 'Verified', 'Settled'] },
    };

    if (deliveryIds && Array.isArray(deliveryIds) && deliveryIds.length > 0) {
      deliveryWhere.id = { in: deliveryIds };
    }

    if (startDate) {
      deliveryWhere.dispatchDate = { ...(deliveryWhere.dispatchDate || {}), gte: new Date(startDate) };
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      deliveryWhere.dispatchDate = { ...(deliveryWhere.dispatchDate || {}), lte: end };
    }

    // Find already-invoiced delivery IDs by scanning existing AGGREGATE invoices for this customer
    const existingInvoices = await prisma.salesInvoice.findMany({
      where: {
        customerId,
        division: 'AGGREGATE',
        status: { not: 'Cancelled' },
      },
      select: { items: true },
    });
    const alreadyInvoicedIds = new Set<string>();
    for (const inv of existingInvoices) {
      try {
        const parsed = typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items;
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item.deliveryId) alreadyInvoicedIds.add(item.deliveryId);
          });
        }
      } catch { /* ignore parse errors */ }
    }

    // Fetch matching deliveries, excluding already-invoiced ones
    const allDeliveries = await prisma.aggregateDelivery.findMany({
      where: deliveryWhere,
      orderBy: { dispatchDate: 'asc' },
    });

    const deliveries = allDeliveries.filter((d) => !alreadyInvoicedIds.has(d.id));

    if (deliveries.length === 0) {
      const alreadyCount = allDeliveries.length - deliveries.length;
      return NextResponse.json(
        { success: false, error: alreadyCount > 0
            ? `All ${alreadyCount} matching deliveries have already been invoiced`
            : 'No deliveries found matching the criteria for this customer' },
        { status: 400 }
      );
    }

    // Build invoice items from deliveries
    const items = deliveries.map((d) => ({
      deliveryId: d.id,
      dispatchNo: d.dispatchNo,
      itemId: d.itemId,
      name: `Aggregate Delivery ${d.dispatchNo}`,
      description: `Dispatched: ${new Date(d.dispatchDate).toLocaleDateString('en-GB')} | Loaded: ${d.loadedVolume} m³ | Delivered: ${d.deliveredVolume ?? d.loadedVolume} m³`,
      quantity: d.deliveredVolume ?? d.loadedVolume,
      unit: 'm³',
      unitPrice: d.aggregateValue || 0,
      total: (d.deliveredVolume ?? d.loadedVolume) * (d.aggregateValue || 0),
    }));

    const subtotal = Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
    const vatRate = includeVat ? 15 : 0;
    const vatAmount = includeVat ? Math.round(subtotal * 0.15 * 100) / 100 : 0;
    const totalAmount = subtotal + vatAmount;

    // Generate invoice number
    const lastInvoice = await prisma.salesInvoice.findFirst({
      orderBy: { invoiceNo: 'desc' },
      select: { invoiceNo: true },
    });
    let nextSeq = 1;
    if (lastInvoice?.invoiceNo) {
      const match = lastInvoice.invoiceNo.match(/INV-(\d+)/);
      if (match) nextSeq = parseInt(match[1], 10) + 1;
    }
    const invoiceNo = `INV-${String(nextSeq).padStart(7, '0')}`;

    // Create the invoice
    const invoice = await prisma.salesInvoice.create({
      data: {
        invoiceNo,
        customerId,
        division: 'AGGREGATE',
        items: JSON.stringify(items),
        subtotal,
        vatRate,
        vatAmount,
        totalAmount,
        status: 'Unpaid',
        invoiceDate: new Date(),
        createdBy: createdBy || null,
      },
      include: { customer: true },
    });

    // Create journal entries: Debit AR, Credit Revenue
    try {
      await createJournalEntries({
        lines: [
          {
            accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE,
            accountFallbackName: 'Accounts Receivable',
            debit: totalAmount,
            credit: 0,
            description: `Aggregate invoice ${invoiceNo} — ${customer.companyName}`,
          },
          {
            accountCode: '4010',
            accountFallbackName: 'Sales Revenue — Aggregate',
            debit: 0,
            credit: totalAmount,
            description: `Aggregate invoice ${invoiceNo} — ${customer.companyName}`,
          },
        ],
        refModule: 'SALES_INVOICE',
        refId: invoice.id,
        postedBy: createdBy || 'system',
      });
    } catch (journalErr) {
      console.error('Auto-journal for aggregate invoice failed:', journalErr);
    }

    // Send Telegram notification for invoice generation
    notify({
      module: 'AGGREGATE',
      event: 'invoice_created',
      details: {
        invoiceNo,
        customer: customer.companyName,
        deliveries: `${deliveries.length} delivery(s)`,
        totalVolume: `${items.reduce((s, i) => s + i.quantity, 0).toFixed(2)} m³`,
        subtotal: `ETB ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        ...(vatAmount > 0 ? { vat: `ETB ${vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` } : {}),
        totalAmount: `ETB ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: invoice,
      summary: {
        invoiceNo,
        customer: customer.companyName,
        deliveryCount: deliveries.length,
        totalVolume: items.reduce((s, i) => s + i.quantity, 0),
        subtotal,
        vatAmount,
        totalAmount,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error generating aggregate invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
