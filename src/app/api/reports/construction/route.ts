import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportId = searchParams.get('reportId') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (dateFrom) {
      startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0);
    }
    if (dateTo) {
      endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
    }

    const dateFilter = (field: string) => {
      if (!startDate && !endDate) return {};
      const filter: any = {};
      filter[field] = {};
      if (startDate) filter[field].gte = startDate;
      if (endDate) filter[field].lte = endDate;
      return filter;
    };

    let columns: string[] = [];
    let rows: any[] = [];

    switch (reportId) {
      case 'dispatch': {
        columns = ['Dispatch No', 'Date', 'Transporter', 'Loaded (m³)', 'Delivered (m³)', 'Shortage (m³)', 'Gross Fee', 'Net Payment', 'Status'];

        const formatTransporter = (t: any) =>
          t?.companyName || (t?.firstName ? `${t.firstName} ${t.lastName || ''}`.trim() : '') || '-';

        const deliveries = await prisma.aggregateDelivery.findMany({
          where: { ...dateFilter('dispatchDate') },
          include: { transporter: { select: { companyName: true, firstName: true, lastName: true } } },
          orderBy: { dispatchDate: 'desc' },
          take: 500,
        });

        rows = deliveries.map((d) => ({
          'Dispatch No': d.dispatchNo,
          'Date': new Date(d.dispatchDate).toLocaleDateString(),
          'Transporter': formatTransporter(d.transporter),
          'Loaded (m³)': (d.loadedVolume || 0).toFixed(2),
          'Delivered (m³)': (d.deliveredVolume || 0).toFixed(2),
          'Shortage (m³)': (d.shortageVolume || 0).toFixed(2),
          'Gross Fee': `ETB ${(d.grossTruckFee || 0).toLocaleString('en-US')}`,
          'Net Payment': `ETB ${(d.netTruckPayment || 0).toLocaleString('en-US')}`,
          'Status': d.status,
        }));
        break;
      }

      case 'shortage': {
        const formatTransporter = (t: any) =>
          t?.companyName || (t?.firstName ? `${t.firstName} ${t.lastName || ''}`.trim() : '') || '-';

        columns = ['Dispatch No', 'Date', 'Transporter', 'Loaded (m³)', 'Delivered (m³)', 'Shortage (m³)', 'Shortage Value', 'Status'];

        const shortages = await prisma.aggregateDelivery.findMany({
          where: {
            shortageVolume: { gt: 0 },
            ...dateFilter('dispatchDate'),
          },
          include: { transporter: { select: { companyName: true, firstName: true, lastName: true } } },
          orderBy: { dispatchDate: 'desc' },
          take: 500,
        });

        rows = shortages.map((d) => ({
          'Dispatch No': d.dispatchNo,
          'Date': new Date(d.dispatchDate).toLocaleDateString(),
          'Transporter': formatTransporter(d.transporter),
          'Loaded (m³)': (d.loadedVolume || 0).toFixed(2),
          'Delivered (m³)': (d.deliveredVolume || 0).toFixed(2),
          'Shortage (m³)': (d.shortageVolume || 0).toFixed(2),
          'Shortage Value': `ETB ${(d.shortageDeduction || 0).toLocaleString('en-US')}`,
          'Status': d.status,
        }));
        break;
      }

      case 'transport': {
        const formatTransporter = (t: any) =>
          t?.companyName || (t?.firstName ? `${t.firstName} ${t.lastName || ''}`.trim() : '') || '-';

        columns = ['Transporter', 'Total Dispatches', 'Total Loaded (m³)', 'Total Delivered (m³)', 'Total Gross Fee', 'Total Net Payment'];

        const deliveries = await prisma.aggregateDelivery.findMany({
          where: { ...dateFilter('dispatchDate') },
          include: { transporter: { select: { id: true, companyName: true, firstName: true, lastName: true } } },
        });

        const transporterMap = new Map<string, any>();
        for (const d of deliveries) {
          const key = d.transporterId;
          if (!transporterMap.has(key)) {
            transporterMap.set(key, {
              name: formatTransporter(d.transporter),
              dispatches: 0, loaded: 0, delivered: 0, gross: 0, net: 0,
            });
          }
          const t = transporterMap.get(key)!;
          t.dispatches += 1;
          t.loaded += d.loadedVolume || 0;
          t.delivered += d.deliveredVolume || 0;
          t.gross += d.grossTruckFee || 0;
          t.net += d.netTruckPayment || 0;
        }

        rows = Array.from(transporterMap.values()).map((t) => ({
          'Transporter': t.name,
          'Total Dispatches': t.dispatches,
          'Total Loaded (m³)': t.loaded.toFixed(2),
          'Total Delivered (m³)': t.delivered.toFixed(2),
          'Total Gross Fee': `ETB ${t.gross.toLocaleString('en-US')}`,
          'Total Net Payment': `ETB ${t.net.toLocaleString('en-US')}`,
        }));
        break;
      }

      case 'commission': {
        const formatTransporter = (t: any) =>
          t?.companyName || (t?.firstName ? `${t.firstName} ${t.lastName || ''}`.trim() : '') || '-';

        columns = ['Settlement No', 'Transporter', 'Period', 'Gross Fee', 'Association Rate', 'Association Amount', 'Final Payable', 'Status'];

        const settlements = await prisma.aggregateSettlement.findMany({
          where: { ...dateFilter('createdAt') },
          include: { transporter: { select: { companyName: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 200,
        });

        rows = settlements.map((s: any) => ({
          'Settlement No': s.settlementNo,
          'Transporter': formatTransporter(s.transporter),
          'Period': `${new Date(s.periodFrom).toLocaleDateString()} - ${new Date(s.periodTo).toLocaleDateString()}`,
          'Gross Fee': `ETB ${(s.totalGrossFee || s.grossFee || 0).toLocaleString('en-US')}`,
          'Association Rate': `${s.associationRate || 0}%`,
          'Association Amount': `ETB ${(s.associationAmount || 0).toLocaleString('en-US')}`,
          'Final Payable': `ETB ${(s.finalPayable || 0).toLocaleString('en-US')}`,
          'Status': s.status,
        }));
        break;
      }

      case 'cement': {
        columns = ['Lifting No', 'Purchase No', 'Factory', 'Factory Weight', 'Buyer Weight', 'Shortage', 'Date', 'Status'];

        const liftings = await prisma.cementLifting.findMany({
          where: { ...dateFilter('liftingDate') },
          include: {
            purchase: { select: { purchaseNo: true } },
            factory: { select: { name: true } },
          },
          orderBy: { liftingDate: 'desc' },
          take: 500,
        });

        rows = liftings.map((l) => ({
          'Lifting No': l.liftingNo,
          'Purchase No': l.purchase?.purchaseNo || '-',
          'Factory': l.factory?.name || '-',
          'Factory Weight': `${(l.factoryWeight || 0).toFixed(2)} T`,
          'Buyer Weight': l.buyerWeighbridgeQty ? `${l.buyerWeighbridgeQty.toFixed(2)} T` : '-',
          'Shortage': l.shortageQty ? `${l.shortageQty.toFixed(2)} T` : '0',
          'Date': new Date(l.liftingDate).toLocaleDateString(),
          'Status': l.status,
        }));
        break;
      }

      case 'penalty': {
        columns = ['Penalty No', 'Type', 'Truck Plate', 'Shortage Qty (T)', 'Penalty Amount', 'Recovery Status', 'Date'];

        const penalties = await prisma.cementPenalty.findMany({
          where: { ...dateFilter('createdAt') },
          orderBy: { createdAt: 'desc' },
          take: 200,
        });

        rows = penalties.map((p) => ({
          'Penalty No': p.penaltyNo,
          'Type': p.penaltyType,
          'Truck Plate': p.truckPlateNo || '-',
          'Shortage Qty (T)': `${(p.shortageQty || 0).toFixed(2)}`,
          'Penalty Amount': `ETB ${(p.penaltyAmount || 0).toLocaleString('en-US')}`,
          'Recovery Status': p.recoveryStatus,
          'Date': new Date(p.penaltyDate).toLocaleDateString(),
        }));
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown report: ${reportId}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data: { columns, rows } });
  } catch (error: any) {
    console.error('Error generating construction report:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
