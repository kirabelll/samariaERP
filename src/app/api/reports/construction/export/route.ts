import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toCSV, csvResponse } from '@/lib/csv-export';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportId = searchParams.get('reportId') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (dateFrom) { startDate = new Date(dateFrom); startDate.setHours(0, 0, 0, 0); }
    if (dateTo) { endDate = new Date(dateTo); endDate.setHours(23, 59, 59, 999); }

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
        const deliveries = await prisma.aggregateDelivery.findMany({
          where: { ...dateFilter('dispatchDate') },
          include: { transporter: { select: { name: true } } },
          orderBy: { dispatchDate: 'desc' },
          take: 5000,
        });
        rows = deliveries.map((d) => ({
          'Dispatch No': d.dispatchNo,
          'Date': new Date(d.dispatchDate).toLocaleDateString(),
          'Transporter': d.transporter?.name || '-',
          'Loaded (m³)': (d.loadedVolume || 0).toFixed(2),
          'Delivered (m³)': (d.deliveredVolume || 0).toFixed(2),
          'Shortage (m³)': (d.shortageVolume || 0).toFixed(2),
          'Gross Fee': (d.grossTruckFee || 0).toFixed(2),
          'Net Payment': (d.netTruckPayment || 0).toFixed(2),
          'Status': d.status,
        }));
        break;
      }
      case 'shortage': {
        columns = ['Dispatch No', 'Date', 'Transporter', 'Loaded (m³)', 'Delivered (m³)', 'Shortage (m³)', 'Shortage Value', 'Status'];
        const shortages = await prisma.aggregateDelivery.findMany({
          where: { shortageVolume: { gt: 0 }, ...dateFilter('dispatchDate') },
          include: { transporter: { select: { name: true } } },
          orderBy: { dispatchDate: 'desc' },
          take: 5000,
        });
        rows = shortages.map((d) => ({
          'Dispatch No': d.dispatchNo,
          'Date': new Date(d.dispatchDate).toLocaleDateString(),
          'Transporter': d.transporter?.name || '-',
          'Loaded (m³)': (d.loadedVolume || 0).toFixed(2),
          'Delivered (m³)': (d.deliveredVolume || 0).toFixed(2),
          'Shortage (m³)': (d.shortageVolume || 0).toFixed(2),
          'Shortage Value': (d.shortageDeduction || 0).toFixed(2),
          'Status': d.status,
        }));
        break;
      }
      case 'transport': {
        columns = ['Transporter', 'Total Dispatches', 'Total Loaded (m³)', 'Total Delivered (m³)', 'Total Gross Fee', 'Total Net Payment'];
        const deliveries = await prisma.aggregateDelivery.findMany({
          where: { ...dateFilter('dispatchDate') },
          include: { transporter: { select: { id: true, name: true } } },
        });
        const transporterMap = new Map<string, any>();
        for (const d of deliveries) {
          const key = d.transporterId;
          if (!transporterMap.has(key)) {
            transporterMap.set(key, { name: d.transporter?.name || 'Unknown', dispatches: 0, loaded: 0, delivered: 0, gross: 0, net: 0 });
          }
          const t = transporterMap.get(key)!;
          t.dispatches += 1; t.loaded += d.loadedVolume || 0; t.delivered += d.deliveredVolume || 0;
          t.gross += d.grossTruckFee || 0; t.net += d.netTruckPayment || 0;
        }
        rows = Array.from(transporterMap.values()).map((t) => ({
          'Transporter': t.name, 'Total Dispatches': t.dispatches,
          'Total Loaded (m³)': t.loaded.toFixed(2), 'Total Delivered (m³)': t.delivered.toFixed(2),
          'Total Gross Fee': t.gross.toFixed(2), 'Total Net Payment': t.net.toFixed(2),
        }));
        break;
      }
      case 'commission': {
        columns = ['Settlement No', 'Transporter', 'Period', 'Gross Fee', 'Association Rate', 'Association Amount', 'Final Payable', 'Status'];
        const settlements = await prisma.aggregateSettlement.findMany({
          where: { ...dateFilter('createdAt') },
          include: { transporter: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        });
        rows = settlements.map((s) => ({
          'Settlement No': s.settlementNo, 'Transporter': s.transporter?.name || '-',
          'Period': `${new Date(s.periodFrom).toLocaleDateString()} - ${new Date(s.periodTo).toLocaleDateString()}`,
          'Gross Fee': (s.grossFee || 0).toFixed(2), 'Association Rate': `${s.associationRate || 0}%`,
          'Association Amount': (s.associationAmount || 0).toFixed(2), 'Final Payable': (s.finalPayable || 0).toFixed(2),
          'Status': s.status,
        }));
        break;
      }
      case 'cement': {
        columns = ['Lifting No', 'Purchase No', 'Factory', 'Factory Weight', 'Buyer Weight', 'Shortage', 'Date', 'Status'];
        const liftings = await prisma.cementLifting.findMany({
          where: { ...dateFilter('liftingDate') },
          include: { purchase: { select: { purchaseNo: true } }, factory: { select: { name: true } } },
          orderBy: { liftingDate: 'desc' },
          take: 5000,
        });
        rows = liftings.map((l) => ({
          'Lifting No': l.liftingNo, 'Purchase No': l.purchase?.purchaseNo || '-',
          'Factory': l.factory?.name || '-', 'Factory Weight': (l.factoryWeight || 0).toFixed(2),
          'Buyer Weight': l.buyerWeighbridgeQty ? l.buyerWeighbridgeQty.toFixed(2) : '-',
          'Shortage': l.shortageQty ? l.shortageQty.toFixed(2) : '0',
          'Date': new Date(l.liftingDate).toLocaleDateString(), 'Status': l.status,
        }));
        break;
      }
      case 'penalty': {
        columns = ['Penalty No', 'Type', 'Truck Plate', 'Shortage Qty (T)', 'Penalty Amount', 'Recovery Status', 'Date'];
        const penalties = await prisma.cementPenalty.findMany({
          where: { ...dateFilter('createdAt') },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        });
        rows = penalties.map((p) => ({
          'Penalty No': p.penaltyNo, 'Type': p.penaltyType, 'Truck Plate': p.truckPlateNo || '-',
          'Shortage Qty (T)': (p.shortageQty || 0).toFixed(2),
          'Penalty Amount': (p.penaltyAmount || 0).toFixed(2),
          'Recovery Status': p.recoveryStatus,
          'Date': new Date(p.penaltyDate).toLocaleDateString(),
        }));
        break;
      }
      default:
        return new Response('Unknown report', { status: 400 });
    }

    const csv = toCSV(columns, rows);
    return csvResponse(csv, `${reportId}-report.csv`);
  } catch (error: any) {
    console.error('Error exporting construction report:', error);
    return new Response(error.message, { status: 500 });
  }
}
