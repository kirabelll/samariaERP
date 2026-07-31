import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';
import { journalSupplierPayment } from '@/lib/accounting';
import { requestApproval } from '@/lib/approval-workflow';

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
        { paymentNo: { contains: search, mode: 'insensitive' } },
        { supplier: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.supplierPayment.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { supplier: true, purchaseOrder: true },
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.supplierPayment.count({ where: whereClause }),
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
    console.error('Error fetching supplier payments:', error);
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
      supplierId,
      purchaseOrderId,
      amount,
      paymentMethod,
      bankName,
      refNo,
      description,
      createdBy,
    } = body;

    if (!supplierId || !amount || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: supplierId, amount, paymentMethod' },
        { status: 400 }
      );
    }

    // Generate payment number
    const count = await prisma.supplierPayment.count();
    const paymentNo = `SP-${String(count + 1).padStart(6, '0')}`;

    const payment = await prisma.supplierPayment.create({
      data: {
        paymentNo,
        supplierId,
        purchaseOrderId: purchaseOrderId || null,
        amount,
        paymentMethod,
        bankName: bankName || null,
        refNo: refNo || null,
        description: description || null,
        status: 'Pending',
        createdBy: createdBy || null,
      },
      include: { supplier: true, purchaseOrder: true },
    });

    notify({ module: 'PURCHASING', event: 'supplier_payment_recorded', details: { paymentNo: payment.paymentNo, amount: payment.amount, paymentMethod: payment.paymentMethod } });

    // Auto-submit for approval
    try {
      const supplierName = payment.supplier?.companyName || 'Unknown Supplier';
      await requestApproval({
        module: 'SupplierPayment',
        recordId: payment.id,
        recordRef: payment.paymentNo,
        amount: Number(payment.amount) || 0,
        description: `Supplier Payment ${payment.paymentNo} — ${Number(payment.amount).toLocaleString('en-US')} ETB to ${supplierName}`,
        requesterId: createdBy || '',
      });
    } catch (e) {
      console.error('Approval request failed for supplier payment:', e);
    }

    // Auto-create journal entry (Debit AP, Credit Cash/Bank)
    let journalResult = null;
    try {
      journalResult = await journalSupplierPayment(payment);
      if (journalResult.created) {
        notify({
          module: 'FINANCE',
          event: 'auto_journal_posted',
          details: {
            source: 'Supplier Payment',
            ref: payment.paymentNo,
            journalNo: journalResult.voucherNo,
            amount: payment.amount,
          },
        });
      }
    } catch (e) {
      console.error('Auto-journal for supplier payment failed:', e);
    }

    return NextResponse.json(
      { success: true, data: payment, ...(journalResult ? { journal: journalResult } : {}) },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating supplier payment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
