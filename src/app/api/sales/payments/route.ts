import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { receiptNo: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.customerPayment.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { customer: true, invoice: true },
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.customerPayment.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      invoiceId,       // backward compat: single invoice
      invoiceIds,      // new: array of invoice IDs
      invoiceAllocations, // new: array of { invoiceId, amount }
      amount,
      paymentMethod,
      bankName,
      refNo,
      depositSlip,
      createdBy,
      withholdingAmount, // withholding tax amount deducted by customer
      bankAccountId,
    } = body;

    if (!customerId || !amount || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: customerId, amount, paymentMethod' },
        { status: 400 }
      );
    }

    // Determine which path: multi-invoice or single-invoice (backward compat)
    const isMultiInvoice = Array.isArray(invoiceIds) && invoiceIds.length > 0;

    if (isMultiInvoice) {
      // ========== MULTI-INVOICE PAYMENT ==========
      return await handleMultiInvoicePayment({
        customerId,
        invoiceIds,
        invoiceAllocations,
        totalAmount: amount,
        paymentMethod,
        bankName,
        refNo,
        depositSlip,
        createdBy,
        withholdingAmount: withholdingAmount || 0,
        bankAccountId: bankAccountId || null,
      });
    } else {
      // ========== SINGLE-INVOICE PAYMENT (backward compat) ==========
      return await handleSingleInvoicePayment({
        customerId,
        invoiceId: invoiceId || null,
        amount,
        paymentMethod,
        bankName,
        refNo,
        depositSlip,
        createdBy,
        withholdingAmount: withholdingAmount || 0,
        bankAccountId: bankAccountId || null,
      });
    }
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------
// Multi-invoice payment: creates one payment record per invoice,
// all sharing the same receipt number prefix and reference.
// ----------------------------------------------------------------
async function handleMultiInvoicePayment(params: {
  customerId: string;
  invoiceIds: string[];
  invoiceAllocations?: { invoiceId: string; amount: number }[];
  totalAmount: number;
  paymentMethod: string;
  bankName?: string | null;
  refNo?: string | null;
  depositSlip?: string | null;
  createdBy?: string | null;
  withholdingAmount?: number;
  bankAccountId?: string | null;
}) {
  const {
    customerId,
    invoiceIds,
    invoiceAllocations,
    totalAmount,
    paymentMethod,
    bankName,
    refNo,
    depositSlip,
    createdBy,
    withholdingAmount = 0,
    bankAccountId,
  } = params;

  // Validate all invoices exist and are not fully paid
  const invoices = await prisma.salesInvoice.findMany({
    where: { id: { in: invoiceIds } },
  });

  if (invoices.length !== invoiceIds.length) {
    const foundIds = new Set(invoices.map((inv) => inv.id));
    const missingIds = invoiceIds.filter((id) => !foundIds.has(id));
    return NextResponse.json(
      { success: false, error: `Invoices not found: ${missingIds.join(', ')}` },
      { status: 404 }
    );
  }

  const alreadyPaid = invoices.filter((inv) => inv.status === 'Paid');
  if (alreadyPaid.length > 0) {
    const paidNos = alreadyPaid.map((inv) => inv.invoiceNo).join(', ');
    return NextResponse.json(
      { success: false, error: `The following invoices are already fully paid: ${paidNos}` },
      { status: 400 }
    );
  }

  // Build allocation map: invoiceId -> amount
  const allocationMap = new Map<string, number>();
  if (invoiceAllocations && invoiceAllocations.length > 0) {
    for (const alloc of invoiceAllocations) {
      allocationMap.set(alloc.invoiceId, alloc.amount);
    }
  } else {
    // Proportional split based on invoice totals
    const invoiceTotal = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    for (const inv of invoices) {
      const proportion = Number(inv.totalAmount) / invoiceTotal;
      allocationMap.set(inv.id, Math.round(totalAmount * proportion * 100) / 100);
    }
  }

  // Calculate per-invoice withholding (proportional to invoice total)
  const invoiceTotalSum = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  const withholdingMap = new Map<string, number>();
  for (const inv of invoices) {
    const proportion = invoiceTotalSum > 0 ? Number(inv.totalAmount) / invoiceTotalSum : 0;
    withholdingMap.set(inv.id, Math.round(withholdingAmount * proportion * 100) / 100);
  }

  // Validate per-invoice amounts: no overpayment
  for (const inv of invoices) {
    const allocatedAmount = allocationMap.get(inv.id) || 0;
    const invoiceWithholding = withholdingMap.get(inv.id) || 0;

    const existingPayments = await prisma.customerPayment.aggregate({
      where: {
        invoiceId: inv.id,
        status: { notIn: ['Rejected', 'Inactive'] },
      },
      _sum: { amount: true, withholdingAmount: true },
    });
    const alreadyPaidAmount = Number(existingPayments._sum.amount || 0);
    const alreadyWithheld = Number(existingPayments._sum.withholdingAmount || 0);
    const invoiceTotal = Math.round(Number(inv.totalAmount) * 100) / 100;
    const totalSettled = alreadyPaidAmount + alreadyWithheld;
    const remaining = Math.round((invoiceTotal - totalSettled) * 100) / 100;

    // Auto-mark as paid if rounding artifact
    if (remaining < 1 && remaining >= 0) {
      await prisma.salesInvoice.update({
        where: { id: inv.id },
        data: { status: 'Paid' },
      });
      return NextResponse.json(
        {
          success: false,
          error: `Invoice ${inv.invoiceNo} has only ETB ${remaining.toFixed(2)} remaining (rounding difference). It has been automatically marked as Paid. Please deselect it and try again.`,
        },
        { status: 400 }
      );
    }

    // Allow 1 ETB tolerance for overpayment (payment + withholding vs remaining)
    if (allocatedAmount + invoiceWithholding > remaining + 1) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount (ETB ${Number(allocatedAmount).toLocaleString('en-US')}) plus withholding (ETB ${invoiceWithholding.toLocaleString('en-US')}) exceeds remaining balance for invoice ${inv.invoiceNo}. Invoice total: ETB ${invoiceTotal.toLocaleString('en-US')}, Already settled: ETB ${totalSettled.toLocaleString('en-US')}, Remaining: ETB ${remaining.toLocaleString('en-US')}.`,
        },
        { status: 400 }
      );
    }
  }

  // Generate ONE receipt number for the entire batch
  const lastPayment = await prisma.customerPayment.findFirst({
    orderBy: { receiptNo: 'desc' },
    select: { receiptNo: true },
  });
  let nextPaymentSeq = 1;
  if (lastPayment?.receiptNo) {
    const match = lastPayment.receiptNo.match(/(\d+)/);
    if (match) nextPaymentSeq = parseInt(match[1]) + 1;
  }
  const receiptNo = `RCP-${String(nextPaymentSeq).padStart(7, '0')}`;

  // Create one payment per invoice in a transaction, all sharing the same receipt number
  const payments = await prisma.$transaction(async (tx) => {
    const created = [];
    for (let i = 0; i < invoices.length; i++) {
      const inv = invoices[i];
      const allocatedAmount = allocationMap.get(inv.id) || 0;
      const invoiceWithholding = withholdingMap.get(inv.id) || 0;

      const payment = await tx.customerPayment.create({
        data: {
          receiptNo,
          customerId,
          invoiceId: inv.id,
          amount: allocatedAmount,
          withholdingAmount: invoiceWithholding,
          paymentMethod,
          bankName: bankName || null,
          refNo: refNo || null,
          depositSlip: depositSlip || null,
          status: 'Pending',
          createdBy: createdBy || null,
          bankAccountId: bankAccountId || null,
        },
        include: { customer: true, invoice: true },
      });
      created.push(payment);
    }
    return created;
  });

  notify({
    module: 'FINANCE',
    event: 'payment_received',
    details: {
      receiptNo,
      amount: totalAmount,
      withholdingAmount: withholdingAmount > 0 ? withholdingAmount : undefined,
      paymentMethod,
      invoiceCount: payments.length,
    },
  });

  return NextResponse.json(
    { success: true, data: payments },
    { status: 201 }
  );
}

// ----------------------------------------------------------------
// Single-invoice payment (original logic, preserved for backward compat)
// ----------------------------------------------------------------
async function handleSingleInvoicePayment(params: {
  customerId: string;
  invoiceId: string | null;
  amount: number;
  paymentMethod: string;
  bankName?: string | null;
  refNo?: string | null;
  depositSlip?: string | null;
  createdBy?: string | null;
  withholdingAmount?: number;
  bankAccountId?: string | null;
}) {
  const {
    customerId,
    invoiceId,
    amount,
    paymentMethod,
    bankName,
    refNo,
    depositSlip,
    createdBy,
    withholdingAmount = 0,
    bankAccountId,
  } = params;

  // Validate: prevent overpayment on the same invoice
  if (invoiceId) {
    const invoice = await prisma.salesInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }
    if (invoice.status === 'Paid') {
      return NextResponse.json(
        { success: false, error: `Invoice ${invoice.invoiceNo} is already fully paid.` },
        { status: 400 }
      );
    }
    // Sum existing non-rejected payments for this invoice
    const existingPayments = await prisma.customerPayment.aggregate({
      where: {
        invoiceId,
        status: { notIn: ['Rejected', 'Inactive'] },
      },
      _sum: { amount: true, withholdingAmount: true },
    });
    const alreadyPaid = Number(existingPayments._sum.amount || 0);
    const alreadyWithheld = Number(existingPayments._sum.withholdingAmount || 0);
    const invoiceTotal = Math.round(Number(invoice.totalAmount) * 100) / 100;
    const totalSettled = alreadyPaid + alreadyWithheld;
    const remaining = Math.round((invoiceTotal - totalSettled) * 100) / 100;

    // If remaining is less than 1 ETB (rounding artifact), auto-mark as Paid and skip payment
    if (remaining < 1 && remaining >= 0) {
      await prisma.salesInvoice.update({
        where: { id: invoiceId },
        data: { status: 'Paid' },
      });
      return NextResponse.json(
        {
          success: false,
          error: `Invoice ${invoice.invoiceNo} has only ETB ${remaining.toFixed(2)} remaining (rounding difference). It has been automatically marked as Paid. No additional payment needed.`,
        },
        { status: 400 }
      );
    }

    // Allow 1 ETB tolerance for overpayment (payment + withholding vs remaining)
    if (amount + withholdingAmount > remaining + 1) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount (ETB ${Number(amount).toLocaleString('en-US')}) plus withholding (ETB ${withholdingAmount.toLocaleString('en-US')}) exceeds remaining balance. Invoice total: ETB ${invoiceTotal.toLocaleString('en-US')}, Already settled: ETB ${totalSettled.toLocaleString('en-US')}, Remaining: ETB ${remaining.toLocaleString('en-US')}.`,
        },
        { status: 400 }
      );
    }
  }

  // Generate receipt number
  const lastPayment = await prisma.customerPayment.findFirst({
    orderBy: { receiptNo: 'desc' },
    select: { receiptNo: true },
  });
  let nextPaymentSeq = 1;
  if (lastPayment?.receiptNo) {
    const match = lastPayment.receiptNo.match(/(\d+)$/);
    if (match) nextPaymentSeq = parseInt(match[1]) + 1;
  }
  const receiptNo = `RCP-${String(nextPaymentSeq).padStart(7, '0')}`;

  const payment = await prisma.customerPayment.create({
    data: {
      receiptNo,
      customerId,
      invoiceId: invoiceId || null,
      amount,
      withholdingAmount,
      paymentMethod,
      bankName: bankName || null,
      refNo: refNo || null,
      depositSlip: depositSlip || null,
      status: 'Pending',
      createdBy: createdBy || null,
      bankAccountId: bankAccountId || null,
    },
    include: { customer: true, invoice: true },
  });

  notify({
    module: 'FINANCE',
    event: 'payment_received',
    details: {
      receiptNo: payment.receiptNo,
      amount: payment.amount,
      withholdingAmount: withholdingAmount > 0 ? withholdingAmount : undefined,
      paymentMethod: payment.paymentMethod,
    },
  });

  return NextResponse.json(
    { success: true, data: payment },
    { status: 201 }
  );
}
