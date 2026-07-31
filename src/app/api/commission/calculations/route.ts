import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const salespersonId = searchParams.get('salespersonId');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (salespersonId) {
      whereClause.salespersonId = salespersonId;
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.commissionCalculation.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.commissionCalculation.count({ where: whereClause }),
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
    console.error('Error fetching commission calculations:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salespersonId, periodFrom, periodTo, basis = 'invoiced', adjustments = 0, createdBy } = body;

    // Validate required fields
    if (!salespersonId || !periodFrom || !periodTo) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Auto-generate calculationNo: COM-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.commissionCalculation.count();
    const sequence = String(count + 1).padStart(4, '0');
    const calculationNo = `COM-${dateStr}-${sequence}`;

    // Query SalesInvoice for the given period
    const invoices = await prisma.salesInvoice.findMany({
      where: {
        createdBy: salespersonId,
        invoiceDate: {
          gte: new Date(periodFrom),
          lte: new Date(periodTo),
        },
      },
    });

    // Look up SalesCommission rules for the salesperson
    const commissionRule = await prisma.salesCommission.findFirst({
      where: {
        salespersonId,
        effectiveFrom: {
          lte: new Date(periodFrom),
        },
        OR: [
          {
            effectiveTo: null,
          },
          {
            effectiveTo: {
              gte: new Date(periodTo),
            },
          },
        ],
      },
    });

    const commissionRate = commissionRule?.ratePercent || 0;

    // Calculate totalSales from invoices
    let totalSales = 0;
    invoices.forEach((inv) => {
      totalSales += inv.totalAmount;
    });

    // Calculate commission
    const grossCommission = (totalSales * commissionRate) / 100;
    const netCommission = grossCommission - adjustments;

    // Create commission calculation
    const calculation = await prisma.commissionCalculation.create({
      data: {
        calculationNo,
        salespersonId,
        periodFrom: new Date(periodFrom),
        periodTo: new Date(periodTo),
        basis,
        totalSales,
        commissionRate,
        grossCommission,
        adjustments,
        netCommission,
        createdBy: createdBy || null,
      },
    });

    // Create commission items from invoices
    const items = await Promise.all(
      invoices.map((invoice) => {
        const invoiceCommission = (invoice.totalAmount * commissionRate) / 100;
        return prisma.commissionItem.create({
          data: {
            calculationId: calculation.id,
            invoiceId: invoice.id,
            invoiceNo: invoice.invoiceNo,
            customerId: invoice.customerId,
            invoiceAmount: invoice.totalAmount,
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        ...calculation,
        items,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating commission calculation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
