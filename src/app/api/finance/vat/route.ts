import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Auto-create monthly VAT periods from the earliest invoice date through today.
 * Only creates periods that don't already exist.
 */
async function ensureVatPeriodsExist() {
  const existingPeriods = await prisma.vatPeriod.findMany({
    orderBy: { startDate: 'asc' },
  });

  // Find the earliest invoice date to know where to start creating periods
  const earliestInvoice = await prisma.salesInvoice.findFirst({
    where: { status: { not: 'Cancelled' } },
    orderBy: { invoiceDate: 'asc' },
    select: { invoiceDate: true },
  });

  const earliestVoucher = await prisma.paymentVoucher.findFirst({
    where: { sourceModule: 'PURCHASE', status: { not: 'Cancelled' } },
    orderBy: { voucherDate: 'asc' },
    select: { voucherDate: true },
  });

  const earliestCementPurchase = await prisma.cementPurchase.findFirst({
    where: { vatAmount: { gt: 0 } },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });

  // Determine the earliest date we need to cover
  let startFrom: Date | null = null;
  if (earliestInvoice) {
    startFrom = earliestInvoice.invoiceDate;
  }
  if (earliestVoucher && (!startFrom || earliestVoucher.voucherDate < startFrom)) {
    startFrom = earliestVoucher.voucherDate;
  }
  if (earliestCementPurchase && (!startFrom || earliestCementPurchase.createdAt < startFrom)) {
    startFrom = earliestCementPurchase.createdAt;
  }

  if (!startFrom) {
    // No invoices or purchase vouchers exist at all; create current month period only
    startFrom = new Date();
  }

  const now = new Date();
  const existingPeriodNames = new Set(existingPeriods.map((p) => p.periodName));
  const periodsToCreate: { periodName: string; startDate: Date; endDate: Date }[] = [];

  // Walk from startFrom month through the current month
  let year = startFrom.getFullYear();
  let month = startFrom.getMonth(); // 0-indexed

  while (year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth())) {
    const periodName = `${year}-${String(month + 1).padStart(2, '0')}`;

    if (!existingPeriodNames.has(periodName)) {
      const periodStart = new Date(year, month, 1);
      const periodEnd = new Date(year, month + 1, 0, 23, 59, 59, 999); // last day of month
      periodsToCreate.push({
        periodName,
        startDate: periodStart,
        endDate: periodEnd,
      });
    }

    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  if (periodsToCreate.length > 0) {
    await prisma.vatPeriod.createMany({
      data: periodsToCreate.map((p) => ({
        periodName: p.periodName,
        startDate: p.startDate,
        endDate: p.endDate,
        outputVat: 0,
        inputVat: 0,
        netVat: 0,
        status: 'Open',
      })),
    });
  }

  // Return all periods (re-fetch to include newly created)
  if (periodsToCreate.length > 0) {
    return prisma.vatPeriod.findMany({ orderBy: { startDate: 'desc' } });
  }

  return existingPeriods.sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const periodId = searchParams.get('periodId');
    const startDateParam = searchParams.get('startDate') || searchParams.get('from');
    const endDateParam = searchParams.get('endDate') || searchParams.get('to');

    // Auto-create VAT periods if needed
    const periods = await ensureVatPeriodsExist();

    // Prepare date filter for sales invoices and cement purchases
    let invoiceDateWhere: any = {};
    let purchaseDateWhere: any = {};

    let startDateObj: Date | null = null;
    let endDateObj: Date | null = null;

    if (startDateParam) {
      startDateObj = new Date(startDateParam);
      startDateObj.setHours(0, 0, 0, 0);
    }

    if (endDateParam) {
      endDateObj = new Date(endDateParam);
      endDateObj.setHours(23, 59, 59, 999);
    }

    if (startDateObj && endDateObj) {
      invoiceDateWhere = {
        invoiceDate: {
          gte: startDateObj,
          lte: endDateObj,
        },
      };
      purchaseDateWhere = {
        createdAt: {
          gte: startDateObj,
          lte: endDateObj,
        },
      };
    } else if (startDateObj) {
      invoiceDateWhere = {
        invoiceDate: {
          gte: startDateObj,
        },
      };
      purchaseDateWhere = {
        createdAt: {
          gte: startDateObj,
        },
      };
    } else if (endDateObj) {
      invoiceDateWhere = {
        invoiceDate: {
          lte: endDateObj,
        },
      };
      purchaseDateWhere = {
        createdAt: {
          lte: endDateObj,
        },
      };
    }

    // Query sales invoices matching date filter
    const allSalesInvoices = await prisma.salesInvoice.findMany({
      where: {
        status: { not: 'Cancelled' },
        ...invoiceDateWhere,
      },
      include: {
        customer: { select: { companyName: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    // Query cement purchases with VAT matching date filter
    const allCementPurchasesWithVat = await prisma.cementPurchase.findMany({
      where: {
        vatAmount: { gt: 0 },
        ...purchaseDateWhere,
      },
      include: {
        factory: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals - use Number() to safely handle potential null/undefined
    const totalOutputVat = allSalesInvoices.reduce(
      (sum, inv) => sum + (Number(inv.vatAmount) || 0),
      0
    );
    const totalInputVat = allCementPurchasesWithVat.reduce(
      (sum, purchase) => sum + (Number(purchase.vatAmount) || 0),
      0
    );
    const netVatPayable = totalOutputVat - totalInputVat;

    // Detailed transactions
    let salesInvoices: any[] = [];
    let cementPurchases: any[] = [];
    let periodSummary = { outputVat: 0, inputVat: 0, netVat: 0 };

    if (periodId) {
      const period = periods.find((p) => p.id === periodId);
      if (period) {
        // Get sales invoices for the period
        const periodSalesInvoices = await prisma.salesInvoice.findMany({
          where: {
            invoiceDate: {
              gte: period.startDate,
              lte: period.endDate,
            },
            status: { not: 'Cancelled' },
          },
          include: {
            customer: { select: { companyName: true } },
          },
          orderBy: { invoiceDate: 'desc' },
          take: 100,
        });

        // Map customer companyName to name for frontend compatibility
        salesInvoices = periodSalesInvoices.map((inv: any) => ({
          ...inv,
          customer: inv.customer ? { name: inv.customer.companyName } : null,
        }));

        // Get cement purchases with VAT for input VAT in this period
        cementPurchases = await prisma.cementPurchase.findMany({
          where: {
            createdAt: {
              gte: period.startDate,
              lte: period.endDate,
            },
            vatAmount: { gt: 0 },
          },
          include: {
            factory: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });

        // Calculate VAT for this specific period
        const periodOutputVat = salesInvoices.reduce(
          (sum: number, inv: any) => sum + (Number(inv.vatAmount) || 0),
          0
        );
        const periodInputVat = cementPurchases.reduce(
          (sum: number, purchase: any) => sum + (Number(purchase.vatAmount) || 0),
          0
        );
        periodSummary = {
          outputVat: periodOutputVat,
          inputVat: periodInputVat,
          netVat: periodOutputVat - periodInputVat,
        };
      }
    } else {
      // Return the invoices and purchases matching the date filter
      salesInvoices = allSalesInvoices.slice(0, 100).map((inv: any) => ({
        ...inv,
        customer: inv.customer ? { name: inv.customer.companyName } : null,
      }));
      cementPurchases = allCementPurchasesWithVat.slice(0, 100);
    }

    // Enhance periods with calculated VAT amounts
    // Query full dataset for period calculations if date filtering narrowed allSalesInvoices
    let periodSalesData = allSalesInvoices;
    let periodPurchasesData = allCementPurchasesWithVat;

    if (startDateParam || endDateParam) {
      // Fetch full data for period summaries so periods table remains accurate
      periodSalesData = await prisma.salesInvoice.findMany({
        where: { status: { not: 'Cancelled' } },
        select: { invoiceDate: true, vatAmount: true },
      }) as any;

      periodPurchasesData = await prisma.cementPurchase.findMany({
        where: { vatAmount: { gt: 0 } },
        select: { createdAt: true, vatAmount: true },
      }) as any;
    }

    const enhancedPeriods = periods.map((period) => {
      const periodSales = periodSalesData.filter(
        (inv) => new Date(inv.invoiceDate) >= new Date(period.startDate) && new Date(inv.invoiceDate) <= new Date(period.endDate)
      );
      const periodPurchases = periodPurchasesData.filter(
        (purchase) =>
          new Date(purchase.createdAt) >= new Date(period.startDate) && new Date(purchase.createdAt) <= new Date(period.endDate)
      );

      const outputVat = periodSales.reduce(
        (sum, inv) => sum + (Number(inv.vatAmount) || 0),
        0
      );
      const inputVat = periodPurchases.reduce(
        (sum, purchase) => sum + (Number(purchase.vatAmount) || 0),
        0
      );
      const netVat = outputVat - inputVat;

      return {
        ...period,
        outputVat,
        inputVat,
        netVat,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalOutputVat,
          totalInputVat,
          netVatPayable,
          salesInvoicesCount: allSalesInvoices.length,
          cementPurchasesCount: allCementPurchasesWithVat.length,
          startDate: startDateParam || null,
          endDate: endDateParam || null,
        },
        periods: enhancedPeriods,
        salesInvoices,
        cementPurchases,
        periodSummary: periodId ? periodSummary : null,
      },
    });
  } catch (error: any) {
    console.error('Error fetching VAT data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { periodName, startDate, endDate } = body;

    if (!periodName || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'periodName, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    // Check if period already exists
    const existing = await prisma.vatPeriod.findFirst({
      where: { periodName },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Period ${periodName} already exists` },
        { status: 409 }
      );
    }

    const period = await prisma.vatPeriod.create({
      data: {
        periodName,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        outputVat: 0,
        inputVat: 0,
        netVat: 0,
        status: 'Open',
      },
    });

    return NextResponse.json({ success: true, data: period }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating VAT period:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { periodId, action } = body;

    if (!periodId || !action) {
      return NextResponse.json(
        { success: false, error: 'periodId and action are required' },
        { status: 400 }
      );
    }

    const period = await prisma.vatPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      return NextResponse.json(
        { success: false, error: 'Period not found' },
        { status: 404 }
      );
    }

    let updateData: any = {};

    if (action === 'file') {
      if (period.status !== 'Open') {
        return NextResponse.json(
          { success: false, error: 'Only Open periods can be filed' },
          { status: 400 }
        );
      }
      updateData = { status: 'Filed', filedDate: new Date() };
    } else if (action === 'lock') {
      if (period.status !== 'Filed') {
        return NextResponse.json(
          { success: false, error: 'Only Filed periods can be locked' },
          { status: 400 }
        );
      }
      updateData = { status: 'Locked' };
    }

    const updated = await prisma.vatPeriod.update({
      where: { id: periodId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating VAT period:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
