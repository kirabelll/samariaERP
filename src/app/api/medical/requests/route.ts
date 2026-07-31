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
    const { customerId, items, priority, notes, createdBy } = body;

    if (!customerId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: customerId, items (array)' },
        { status: 400 }
      );
    }

    // Generate request number
    const count = await prisma.medicalRequest.count();
    const requestNo = `MREQ-${String(count + 1).padStart(7, '0')}`;

    const medicalRequest = await prisma.medicalRequest.create({
      data: {
        requestNo,
        customerId,
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
      const customerName = medicalRequest.customer?.companyName || medicalRequest.customer?.firstName || 'Unknown';
      await requestApproval({
        module: 'MedicalRequest',
        recordId: medicalRequest.id,
        recordRef: medicalRequest.requestNo,
        amount: 0,
        description: `Medical Request ${medicalRequest.requestNo} — ${priority || 'Normal'} priority for ${customerName}`,
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
