import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('supplierId') || '';

    const whereClause: any = {
      status: 'Approved',
    };

    if (supplierId) {
      whereClause.supplierId = supplierId;
    }

    // Fetch approved purchase orders
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: whereClause,
      include: { supplier: true, supplierPayments: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: purchaseOrders,
    });
  } catch (error: any) {
    console.error('Error fetching cash purchase orders:', error);
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
        description: 'Cash payment',
        status: 'Pending',
        createdBy: createdBy || null,
      },
      include: { supplier: true, purchaseOrder: true },
    });

    notify({
      module: 'PURCHASING',
      event: 'cash_payment_recorded',
      details: { paymentNo: payment.paymentNo, amount: payment.amount, supplier: payment.supplier?.companyName },
    });

    return NextResponse.json(
      { success: true, data: payment },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating cash payment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
