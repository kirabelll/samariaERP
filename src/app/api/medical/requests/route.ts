import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';
import { requestApproval } from '@/lib/approval-workflow';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const customerId = searchParams.get('customerId') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.requestNo = { contains: search, mode: 'insensitive' };
    }
    if (status) {
      whereClause.status = status;
    }
    if (customerId) {
      whereClause.customerId = customerId;
    }

    const [data, total] = await Promise.all([
      prisma.medicalRequest.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { customer: true },
        orderBy: { requestDate: 'desc' },
      }),
      prisma.medicalRequest.count({ where: whereClause }),
    ]);

    const partnerIds = data.map((d) => d.customerId).filter(Boolean);
    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: partnerIds } },
    });
    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

    const enrichedData = data.map((d) => {
      const supp = supplierMap.get(d.customerId);
      return {
        ...d,
        supplier: supp || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedData,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching medical requests:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, supplierId, items, priority, notes, createdBy } = body;
    const targetId = supplierId || customerId;

    if (!targetId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: supplier/customer, items (array)' },
        { status: 400 }
      );
    }

    // Check if targetId is an existing customer or supplier
    let effectiveCustomerId = targetId;
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: targetId },
    });

    if (!existingCustomer) {
      // Check if it's a supplier and create/upsert a medical partner customer entry for FK constraint
      const existingSupplier = await prisma.supplier.findUnique({
        where: { id: targetId },
      });

      if (existingSupplier) {
        const createdCustomer = await prisma.customer.upsert({
          where: { id: existingSupplier.id },
          create: {
            id: existingSupplier.id,
            code: existingSupplier.code,
            companyName: existingSupplier.companyName || `${existingSupplier.firstName || ''} ${existingSupplier.lastName || ''}`.trim() || 'Medical Supplier',
            phone: existingSupplier.phone || '0000000000',
            customerType: 'COMPANY',
            division: 'MEDICAL',
            status: existingSupplier.status || 'Active',
          },
          update: {
            companyName: existingSupplier.companyName || undefined,
            phone: existingSupplier.phone || undefined,
          },
        });
        effectiveCustomerId = createdCustomer.id;
      }
    }

    // Generate request number
    const count = await prisma.medicalRequest.count();
    const requestNo = `MREQ-${String(count + 1).padStart(7, '0')}`;

    const medicalRequest = await prisma.medicalRequest.create({
      data: {
        requestNo,
        customerId: effectiveCustomerId,
        items: JSON.stringify(items),
        priority: priority || 'Normal',
        status: 'Submitted',
        notes: notes || null,
        createdBy: createdBy || null,
        requestDate: new Date(),
      },
      include: { customer: true },
    });

    notify({ module: 'MEDICAL', event: 'medical_request', details: { requestNo: medicalRequest.requestNo, priority: medicalRequest.priority } });

    // Auto-submit for approval (medical requests need pharmacist/manager approval)
    try {
      const partyName = medicalRequest.customer?.companyName || medicalRequest.customer?.firstName || 'Unknown';
      await requestApproval({
        module: 'MedicalRequest',
        recordId: medicalRequest.id,
        recordRef: medicalRequest.requestNo,
        amount: 0,
        description: `Medical Request ${medicalRequest.requestNo} — ${priority || 'Normal'} priority for ${partyName}`,
        requesterId: createdBy || '',
      });
    } catch (e) {
      console.error('Approval request failed for medical request:', e);
    }

    return NextResponse.json(
      { success: true, data: medicalRequest },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating medical request:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
