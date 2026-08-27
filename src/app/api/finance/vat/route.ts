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

    let effectiveStartDate: Date | null = null;
    let effectiveEndDate: Date | null = null;

    if (periodId) {
      const period = periods.find((p) => p.id === periodId);
      if (period) {
        effectiveStartDate = new Date(period.startDate);
        effectiveEndDate = new Date(period.endDate);
      }
    } else if (startDateParam || endDateParam) {
      if (startDateParam) {
        const start = new Date(startDateParam);
        start.setHours(0, 0, 0, 0);
        effectiveStartDate = start;
      }
      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        effectiveEndDate = end;
      }
    }

    // Calculate summary totals across ALL periods from invoices and cement purchases
    const allSalesInvoices = await prisma.salesInvoice.findMany({
      where: {
        status: { not: 'Cancelled' },
      },
    });

    // Input VAT: from CementPurchase records that have VAT
    const allCementPurchasesWithVat = await prisma.cementPurchase.findMany({
      where: {
        vatAmount: { gt: 0 },
      },
      include: {
        factory: { select: { name: true } },
      },
    });

    // Filtered lists for summary calculation
    let filteredSalesInvoices = allSalesInvoices;
    let filteredCementPurchases = allCementPurchasesWithVat;

    if (effectiveStartDate || effectiveEndDate) {
      filteredSalesInvoices = allSalesInvoices.filter((inv) => {
        const d = new Date(inv.invoiceDate);
        if (effectiveStartDate && d < effectiveStartDate) return false;
        if (effectiveEndDate && d > effectiveEndDate) return false;
        return true;
      });

      filteredCementPurchases = allCementPurchasesWithVat.filter((purchase) => {
        const d = new Date(purchase.createdAt);
        if (effectiveStartDate && d < effectiveStartDate) return false;
        if (effectiveEndDate && d > effectiveEndDate) return false;
        return true;
      });
    }

    // Calculate totals - use Number() to safely handle potential null/undefined
    const totalOutputVat = filteredSalesInvoices.reduce(
      (sum, inv) => sum + (Number(inv.vatAmount) || 0),
      0
    );
    const totalInputVat = filteredCementPurchases.reduce(
      (sum, purchase) => sum + (Number(purchase.vatAmount) || 0),
      0
    );
    const netVatPayable = totalOutputVat - totalInputVat;

    // Detailed invoices & purchases for the active period or date range
    let salesInvoices: any[] = [];
    let cementPurchases: any[] = [];
    let periodSummary = { outputVat: totalOutputVat, inputVat: totalInputVat, netVat: netVatPayable };

    if (effectiveStartDate || effectiveEndDate) {
      // Get sales invoices for the date range
      salesInvoices = await prisma.salesInvoice.findMany({
        where: {
          status: { not: 'Cancelled' },
          ...(effectiveStartDate || effectiveEndDate
            ? {
                invoiceDate: {
                  ...(effectiveStartDate ? { gte: effectiveStartDate } : {}),
                  ...(effectiveEndDate ? { lte: effectiveEndDate } : {}),
                },
              }
            : {}),
        },
        include: {
          customer: { select: { companyName: true } },
        },
        orderBy: { invoiceDate: 'desc' },
        take: 100,
      });

      // Map customer companyName to name for frontend compatibility
      salesInvoices = salesInvoices.map((inv: any) => ({
        ...inv,
        customer: inv.customer ? { name: inv.customer.companyName } : null,
      }));

      // Get cement purchases with VAT for input VAT in this period / range
      cementPurchases = await prisma.cementPurchase.findMany({
        where: {
          vatAmount: { gt: 0 },
          ...(effectiveStartDate || effectiveEndDate
            ? {
                createdAt: {
                  ...(effectiveStartDate ? { gte: effectiveStartDate } : {}),
                  ...(effectiveEndDate ? { lte: effectiveEndDate } : {}),
                },
              }
            : {}),
        },
        include: {
          factory: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    }

    // Enhance periods with calculated VAT amounts from actual transaction data
    const enhancedPeriods = periods.map((period) => {
      const periodSalesInvoices = allSalesInvoices.filter(
        (inv) => inv.invoiceDate >= period.startDate && inv.invoiceDate <= period.endDate
      );
      const periodCementPurchases = allCementPurchasesWithVat.filter(
        (purchase) =>
          purchase.createdAt >= period.startDate && purchase.createdAt <= period.endDate
      );

      const outputVat = periodSalesInvoices.reduce(
        (sum, inv) => sum + (Number(inv.vatAmount) || 0),
        0
      );
      const inputVat = periodCementPurchases.reduce(
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
          salesInvoicesCount: filteredSalesInvoices.length,
          cementPurchasesCount: filteredCementPurchases.length,
        },
        periods: enhancedPeriods,
        salesInvoices,
        cementPurchases,
        periodSummary: (periodId || startDateParam || endDateParam) ? periodSummary : null,
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
