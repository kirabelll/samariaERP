import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const transportAssociationId = searchParams.get('transportAssociationId') || '';

    // Fetch all delivered/verified aggregate deliveries, grouped by transporter
    const deliveries = await prisma.aggregateDelivery.findMany({
      where: {
        status: { in: ['Delivered', 'Verified'] },
      },
      include: { transporter: true },
      orderBy: { deliveryDate: 'desc' },
    });

    // Group by transporter and calculate totals
    const groupedByTransporter: Record<string, any> = {};

    deliveries.forEach((delivery) => {
      const transporterId = delivery.transporterId;
      if (!groupedByTransporter[transporterId]) {
        groupedByTransporter[transporterId] = {
          transporterId,
          transporterName: delivery.transporter?.companyName || 'Unknown',
          plates: delivery.transporter?.vehiclePlates || [],
          totalLoads: 0,
          totalVolume: 0,
          grossAmount: 0,
          deliveries: [],
        };
      }

      groupedByTransporter[transporterId].totalLoads += 1;
      groupedByTransporter[transporterId].totalVolume += delivery.deliveredVolume || 0;
      groupedByTransporter[transporterId].grossAmount += delivery.grossTruckFee || 0;
      groupedByTransporter[transporterId].deliveries.push({
        id: delivery.id,
        dispatchNo: delivery.dispatchNo,
        loadedVolume: delivery.loadedVolume,
        deliveredVolume: delivery.deliveredVolume,
        grossTruckFee: delivery.grossTruckFee,
      });
    });

    const groupedData = Object.values(groupedByTransporter);

    return NextResponse.json({
      success: true,
      data: groupedData,
    });
  } catch (error: any) {
    console.error('Error fetching transporter loads:', error);
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
      transporterId,
      totalGrossFee,
      totalShortage,
      commissionRate,
      createdBy,
    } = body;

    if (!transporterId || totalGrossFee === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: transporterId, totalGrossFee' },
        { status: 400 }
      );
    }

    const shortageAmount = totalShortage || 0;
    const commissionAmount = (totalGrossFee * (commissionRate || 0)) / 100;
    const totalNetPayment = totalGrossFee - shortageAmount;
    const finalPayable = totalNetPayment - commissionAmount;

    // Generate payment sheet number
    const count = await prisma.truckPayment.count();
    const paymentSheetNo = `TPS-${String(count + 1).padStart(6, '0')}`;

    // Set period to current month
    const now = new Date();
    const periodFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const payment = await prisma.truckPayment.create({
      data: {
        paymentSheetNo,
        transporterId,
        periodFrom,
        periodTo,
        totalGrossFee,
        totalShortage: shortageAmount,
        totalNetPayment,
        commissionRate: commissionRate || 0,
        commissionAmt: commissionAmount,
        finalPayable,
        status: 'Draft',
        createdBy: createdBy || null,
      },
      include: { transporter: true },
    });

    notify({
      module: 'PURCHASING',
      event: 'truck_payment_created',
      details: { paymentSheetNo: payment.paymentSheetNo, finalPayable: payment.finalPayable },
    });

    return NextResponse.json(
      { success: true, data: payment },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating truck payment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
