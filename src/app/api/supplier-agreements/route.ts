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
    const supplierId = searchParams.get('supplierId') || '';
    const division = searchParams.get('division') || '';
    const includeVoid = searchParams.get('includeVoid') === 'true';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { agreementNo: { contains: search, mode: 'insensitive' } },
        { supplier: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      whereClause.status = status;
    } else if (includeVoid === false || searchParams.get('includeVoid') === 'false') {
      // Explicitly exclude Void agreements
      whereClause.status = { not: 'Void' };
    }
    // If includeVoid is true or not specified, show all records including void
    if (supplierId) {
      whereClause.supplierId = supplierId;
    }
    if (division) {
      whereClause.division = division;
    }

    const [data, total] = await Promise.all([
      prisma.supplierAgreement.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { supplier: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplierAgreement.count({ where: whereClause }),
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
    console.error('Error fetching supplier agreements:', error);
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
      division,
      items,
      totalAmount,
      validFrom,
      validTo,
      terms,
      status,
      createdBy,
      loadingSite,
      offloadingSite,
    } = body;

    if (!supplierId || !items || totalAmount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: supplierId, items, totalAmount' },
        { status: 400 }
      );
    }

    // Auto-void all existing Active agreements for this supplier
    // (Draft agreements awaiting approval are kept — they'll be superseded once this one is activated)
    await prisma.supplierAgreement.updateMany({
      where: {
        supplierId,
        status: { notIn: ['Void', 'Cancelled', 'Expired', 'Draft', 'Rejected'] },
      },
      data: { status: 'Void' },
    });

    // Generate agreement number
    const count = await prisma.supplierAgreement.count();
    const agreementNo = `SAG-${String(count + 1).padStart(7, '0')}`;

    const agreement = await prisma.supplierAgreement.create({
      data: {
        agreementNo,
        supplierId,
        division: division || 'CONSTRUCTION',
        items: typeof items === 'string' ? items : JSON.stringify(items),
        totalAmount: parseFloat(totalAmount),
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        terms: terms || null,
        status: 'Draft',
        loadingSite: loadingSite || null,
        offloadingSite: offloadingSite || null,
        createdBy: createdBy || null,
      },
      include: { supplier: true },
    });

    // Auto-request approval for the new agreement
    try {
      const supplierName = agreement.supplier?.companyName || 'Unknown';
      await requestApproval({
        module: 'SupplierAgreement',
        recordId: agreement.id,
        recordRef: agreementNo,
        amount: parseFloat(totalAmount) || 0,
        description: `Supplier Agreement ${agreementNo} — ${parseFloat(totalAmount).toLocaleString('en-US')} ETB for ${supplierName}`,
        requesterId: createdBy || '',
      });
    } catch (e) {
      console.error('Approval request failed for Supplier Agreement:', e);
    }

    return NextResponse.json(
      { success: true, data: agreement },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating supplier agreement:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
