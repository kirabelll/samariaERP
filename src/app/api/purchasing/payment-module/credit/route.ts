import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('supplierId') || '';

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: 'supplierId is required' },
        { status: 400 }
      );
    }

    // Fetch delivered/verified aggregate deliveries for this supplier
    const deliveries = await prisma.aggregateDelivery.findMany({
      where: {
        supplierId,
        status: { in: ['Delivered', 'Verified'] },
      },
      include: { customer: true, transporter: true },
      orderBy: { deliveryDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: deliveries,
    });
  } catch (error: any) {
    console.error('Error fetching credit deliveries:', error);
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
      aggregateDeliveryId,
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
        amount,
        paymentMethod,
        bankName: bankName || null,
        refNo: refNo || null,
        description: aggregateDeliveryId ? `Credit payment for delivery: ${aggregateDeliveryId}` : 'Credit payment',
        status: 'Pending',
        createdBy: createdBy || null,
      },
      include: { supplier: true },
    });

    notify({
      module: 'PURCHASING',
      event: 'credit_payment_recorded',
      details: { paymentNo: payment.paymentNo, amount: payment.amount, supplier: payment.supplier?.companyName },
    });

    return NextResponse.json(
      { success: true, data: payment },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating credit payment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
