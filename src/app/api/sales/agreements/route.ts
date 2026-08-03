import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requestApproval } from '@/lib/approval-workflow';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const division = searchParams.get('division') || '';
    const customerId = searchParams.get('customerId') || '';
    const includeVoid = searchParams.get('includeVoid') === 'true';
    const getAll = searchParams.get('all') === 'true';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { agreementNo: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      whereClause.status = status;
    } else if (includeVoid === false || searchParams.get('includeVoid') === 'false') {
      // Explicitly exclude Void agreements
      whereClause.status = { not: 'Void' };
    }
    // If includeVoid is true or not specified, show all records including void
    if (division) {
      whereClause.division = division;
    }
    if (customerId) {
      whereClause.customerId = customerId;
    }

    const [data, total] = await Promise.all([
      prisma.salesAgreement.findMany({
        where: whereClause,
        ...(getAll ? {} : { skip, take: limit }),
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.salesAgreement.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: getAll ? { 
        total, 
        returnedAll: true,
        message: 'All records returned without pagination' 
      } : {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales agreements:', error);
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
      customerId,
      division,
      items,
      totalAmount,
      validFrom,
      validTo,
      terms,
      offloadingSite,
      status,
      createdBy,
    } = body;

    if (!customerId || !division || !items || !totalAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: customerId, division, items, totalAmount' },
        { status: 400 }
      );
    }

    // Auto-void all existing Active agreements for this customer
    // (Draft agreements awaiting approval are kept — they'll be superseded once this one is activated)
    await prisma.salesAgreement.updateMany({
      where: {
        customerId,
        status: { notIn: ['Void', 'Cancelled', 'Expired', 'Draft', 'Rejected'] },
      },
      data: { status: 'Void' },
    });

    // Generate agreement number
    const count = await prisma.salesAgreement.count();
    const agreementNo = `AGR-${String(count + 1).padStart(7, '0')}`;

    const agreement = await prisma.salesAgreement.create({
      data: {
        agreementNo,
        customerId,
        division,
        items: typeof items === 'string' ? items : JSON.stringify(items),
        totalAmount,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        terms: terms || null,
        offloadingSite: offloadingSite || null,
        status: 'Draft',
        createdBy: createdBy || null,
      },
      include: { customer: true },
    });

    // Auto-request approval for the new agreement
    try {
      const customerName = agreement.customer?.companyName || 'Unknown';
      await requestApproval({
        module: 'SalesAgreement',
        recordId: agreement.id,
        recordRef: agreementNo,
        amount: Number(totalAmount) || 0,
        description: `Sales Agreement ${agreementNo} — ${Number(totalAmount).toLocaleString('en-US')} ETB for ${customerName}`,
        requesterId: createdBy || '',
      });
    } catch (e) {
      console.error('Approval request failed for Sales Agreement:', e);
    }

    return NextResponse.json(
      { success: true, data: agreement },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating sales agreement:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
