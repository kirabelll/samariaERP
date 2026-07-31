import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requestApproval } from '@/lib/approval-workflow';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const voucherType = searchParams.get('voucherType') || '';
    const status = searchParams.get('status') || '';
    const sourceModule = searchParams.get('sourceModule') || '';

    const skip = (page - 1) * limit;

    const payeeName = searchParams.get('payeeName') || '';

    const whereClause: any = {};
    if (voucherType) {
      whereClause.voucherType = voucherType;
    }
    if (status) {
      whereClause.status = status;
    }
    if (sourceModule) {
      whereClause.sourceModule = sourceModule;
    }
    if (payeeName) {
      whereClause.payeeName = { contains: payeeName, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.paymentVoucher.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          voucherNo: true,
          voucherType: true,
          sourceModule: true,
          sourceRef: true,
          payeeName: true,
          amount: true,
          paymentMethod: true,
          status: true,
          createdAt: true,
          voucherDate: true,
        },
      }),
      prisma.paymentVoucher.count({ where: whereClause }),
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
    console.error('Error fetching payment vouchers:', error);
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
      voucherType,
      sourceModule,
      sourceId,
      sourceRef,
      payeeType,
      payeeId,
      payeeName,
      amount,
      paymentMethod,
      bankAccountId,
      bankName,
      checkNo,
      refNo,
      description,
    } = body;

    // Validate required fields
    if (!voucherType || !sourceModule || !payeeType || !payeeName || !amount || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate voucherNo
    const prefix = voucherType === 'PAYMENT' ? 'PV' : voucherType === 'RECEIPT' ? 'RV' : 'RF';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const lastVoucher = await prisma.paymentVoucher.findFirst({
      where: { voucherNo: { startsWith: `${prefix}-` } },
      orderBy: { voucherNo: 'desc' },
      select: { voucherNo: true },
    });
    let nextVoucherSeq = 1;
    if (lastVoucher?.voucherNo) {
      const match = lastVoucher.voucherNo.match(/(\d+)$/);
      if (match) nextVoucherSeq = parseInt(match[1]) + 1;
    }
    const voucherNo = `${prefix}-${dateStr}-${String(nextVoucherSeq).padStart(4, '0')}`;

    const voucher = await prisma.paymentVoucher.create({
      data: {
        voucherNo,
        voucherType,
        sourceModule,
        sourceId,
        sourceRef,
        payeeType,
        payeeId,
        payeeName,
        amount,
        paymentMethod,
        bankAccountId,
        bankName,
        checkNo,
        refNo,
        description,
        status: 'Pending_Approval',
      },
    });

    // Auto-submit for approval
    try {
      await requestApproval({
        module: 'PaymentVoucher',
        recordId: voucher.id,
        recordRef: voucherNo,
        amount: Number(amount) || 0,
        description: `${voucherType} Voucher ${voucherNo} — ${Number(amount).toLocaleString('en-US')} ETB to ${payeeName}`,
        requesterId: body.createdBy || '',
      });
    } catch (e) {
      console.error('Approval request failed for voucher:', e);
    }

    return NextResponse.json({
      success: true,
      data: voucher,
    });
  } catch (error: any) {
    console.error('Error creating payment voucher:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
