import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { notify } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

/**
 * Auto-create a sales invoice when a store issue is delivered.
 * Links the invoice back to the store issue via description.
 */
async function createAutoInvoice(storeIssue: any) {
  try {
    // Parse items from JSON
    const items = typeof storeIssue.items === 'string' ? JSON.parse(storeIssue.items) : storeIssue.items;
    const subtotal = storeIssue.totalAmount;
    const vatRate = 15;
    const vatAmount = subtotal * (vatRate / 100);
    const totalAmount = subtotal + vatAmount;

    // Generate invoice number
    const count = await prisma.salesInvoice.count();
    const invoiceNo = `INV-${String(count + 1).padStart(7, '0')}`;

    const invoice = await prisma.salesInvoice.create({
      data: {
        invoiceNo,
        customerId: storeIssue.customerId,
        division: 'MEDICAL',
        items: typeof items === 'string' ? items : JSON.stringify(items),
        subtotal,
        vatRate,
        vatAmount,
        totalAmount,
        status: 'Unpaid',
        createdBy: storeIssue.issuedBy || 'system',
      },
      include: { customer: true },
    });

    notify({
      module: 'SALES',
      event: 'invoice_created',
      details: {
        invoiceNo: invoice.invoiceNo,
        totalAmount: invoice.totalAmount,
        source: `Medical Store Issue ${storeIssue.issueNo}`,
      },
    });

    return { created: true, invoiceNo: invoice.invoiceNo, invoiceId: invoice.id, totalAmount: invoice.totalAmount };
  } catch (error: any) {
    console.error('Auto-invoice creation failed:', error);
    return { created: false, reason: error.message };
  }
}

/**
 * Auto-log an exception when thresholds are breached.
 */
async function logException(type: string, severity: string, module: string, recordId: string, recordRef: string, description: string) {
  try {
    await prisma.exceptionLog.create({
      data: { exceptionType: type, severity, module, recordId, recordRef, description, status: 'Open' },
    });
  } catch (e) {
    console.error('Exception logging failed:', e);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const storeIssue = await prisma.medicalStoreIssue.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            companyName: true,
            code: true,
            licenseNo: true,
          },
        },
      },
    });

    if (!storeIssue) {
      return NextResponse.json(
        { success: false, error: 'Store issue not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: storeIssue,
    });
  } catch (error: any) {
    console.error('Error fetching medical store issue:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Fetch current issue to detect status change
    const currentIssue = await prisma.medicalStoreIssue.findUnique({ where: { id } });
    if (!currentIssue) {
      return NextResponse.json({ success: false, error: 'Store issue not found' }, { status: 404 });
    }

    const isDelivering = body.status === 'Delivered' && currentIssue.status !== 'Delivered';

    const storeIssue = await prisma.medicalStoreIssue.update({
      where: { id },
      data: body,
      include: {
        customer: {
          select: {
            companyName: true,
            code: true,
            licenseNo: true,
          },
        },
      },
    });

    // Auto-create sales invoice when store issue is delivered
    let invoiceResult = null;
    if (isDelivering) {
      invoiceResult = await createAutoInvoice(storeIssue);

      // Auto-log exception if total exceeds threshold (e.g., high-value medical issue)
      if (storeIssue.totalAmount > 50000) {
        await logException(
          'PRICE_OVERRIDE', 'Medium', 'MEDICAL', id, storeIssue.issueNo,
          `High-value medical store issue: ETB ${storeIssue.totalAmount.toLocaleString('en-US')} for ${storeIssue.customer?.companyName}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: storeIssue,
      ...(invoiceResult ? { invoice: invoiceResult } : {}),
    });
  } catch (error: any) {
    console.error('Error updating medical store issue:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const storeIssue = await prisma.medicalStoreIssue.update({
      where: { id },
      data: {
        status: 'Cancelled',
      },
    });

    return NextResponse.json({
      success: true,
      data: storeIssue,
    });
  } catch (error: any) {
    console.error('Error deleting medical store issue:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
