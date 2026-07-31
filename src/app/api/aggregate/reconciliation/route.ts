import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');

    // Default to today if no date provided
    let targetDate: Date;
    if (dateParam) {
      targetDate = new Date(dateParam);
    } else {
      targetDate = new Date();
    }

    // Set to start of day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    // Set to end of day
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Query all deliveries for the date
    const deliveries = await prisma.aggregateDelivery.findMany({
      where: {
        dispatchDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        transporter: {
          select: {
            id: true,
            code: true,
            companyName: true,
          },
        },
      },
    });

    // Group by transporter and calculate totals
    const groupedByTransporter: Record<
      string,
      {
        transporterId: string;
        transporterCode: string;
        transporterName: string;
        totalDispatches: number;
        totalLoadedVolume: number;
        totalDeliveredVolume: number;
        totalShortage: number;
        totalGrossFee: number;
        totalShortageDeduction: number;
        totalNetPayment: number;
      }
    > = {};

    deliveries.forEach((delivery) => {
      const transporterId = delivery.transporterId;

      if (!groupedByTransporter[transporterId]) {
        groupedByTransporter[transporterId] = {
          transporterId,
          transporterCode: delivery.transporter?.code || '',
          transporterName: delivery.transporter?.companyName || '',
          totalDispatches: 0,
          totalLoadedVolume: 0,
          totalDeliveredVolume: 0,
          totalShortage: 0,
          totalGrossFee: 0,
          totalShortageDeduction: 0,
          totalNetPayment: 0,
        };
      }

      const group = groupedByTransporter[transporterId];
      group.totalDispatches += 1;
      group.totalLoadedVolume += delivery.loadedVolume;
      group.totalDeliveredVolume += delivery.deliveredVolume || 0;
      group.totalShortage += delivery.shortageVolume || 0;
      group.totalGrossFee += delivery.grossTruckFee || 0;
      group.totalShortageDeduction += delivery.shortageDeduction || 0;
      group.totalNetPayment += delivery.netTruckPayment || 0;
    });

    // Calculate grand totals
    const summaryByTransporter = Object.values(groupedByTransporter);
    const grandTotals = {
      totalTransporters: summaryByTransporter.length,
      totalDispatches: summaryByTransporter.reduce((sum, g) => sum + g.totalDispatches, 0),
      totalLoadedVolume: summaryByTransporter.reduce((sum, g) => sum + g.totalLoadedVolume, 0),
      totalDeliveredVolume: summaryByTransporter.reduce((sum, g) => sum + g.totalDeliveredVolume, 0),
      totalShortage: summaryByTransporter.reduce((sum, g) => sum + g.totalShortage, 0),
      totalGrossFee: summaryByTransporter.reduce((sum, g) => sum + g.totalGrossFee, 0),
      totalShortageDeduction: summaryByTransporter.reduce((sum, g) => sum + g.totalShortageDeduction, 0),
      totalNetPayment: summaryByTransporter.reduce((sum, g) => sum + g.totalNetPayment, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        summary: summaryByTransporter,
        grandTotals,
        totalRecords: deliveries.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching reconciliation data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
