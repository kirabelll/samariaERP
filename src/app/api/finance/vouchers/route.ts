import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requestApproval } from '@/lib/approval-workflow';
import { updateVoucherLinkedDocument } from '@/lib/voucher-sync';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const voucherType = searchParams.get('voucherType') || '';
    const status = searchParams.get('status') || '';
    const sourceModule = searchParams.get('sourceModule') || '';
    const search = searchParams.get('search') || '';
    const payeeName = searchParams.get('payeeName') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const skip = (page - 1) * limit;

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
    if (search) {
      whereClause.OR = [
        { voucherNo: { contains: search, mode: 'insensitive' } },
        { payeeName: { contains: search, mode: 'insensitive' } },
        { sourceRef: { contains: search, mode: 'insensitive' } },
        { refNo: { contains: search, mode: 'insensitive' } },
        { checkNo: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (startDate || endDate) {
      whereClause.voucherDate = {};
      if (startDate) whereClause.voucherDate.gte = new Date(startDate);
      if (endDate) whereClause.voucherDate.lte = new Date(endDate);
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
          sourceId: true,
          sourceRef: true,
          payeeType: true,
          payeeId: true,
          payeeName: true,
          amount: true,
          paymentMethod: true,
          bankAccountId: true,
          bankName: true,
          checkNo: true,
          refNo: true,
          description: true,
          status: true,
          preparedBy: true,
          checkedBy: true,
          checkedAt: true,
          approvedBy: true,
          approvedAt: true,
          postedBy: true,
          postedAt: true,
          rejectionReason: true,
          createdAt: true,
          voucherDate: true,
          updatedAt: true,
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

    // Update selected bank account balance (increase for RECEIPT, deduction for PAYMENT/REFUND)
    if (bankAccountId && Number(amount) > 0) {
      try {
        const isDeduction = voucherType === 'PAYMENT' || voucherType === 'REFUND';
        const txnType = isDeduction ? 'withdrawal' : 'deposit';

        // Update BankAccount balance
        await prisma.bankAccount.update({
          where: { id: bankAccountId },
          data: {
            balance: isDeduction
              ? { decrement: Number(amount) }
              : { increment: Number(amount) },
          },
        });

        // Log BankTransaction for tracking & reconciliation
        await prisma.bankTransaction.create({
          data: {
            bankAccountId,
            type: txnType,
            amount: Number(amount),
            refNo: refNo || checkNo || voucherNo,
            description: description || `${voucherType} Voucher ${voucherNo} — ${payeeName}`,
            refModule: 'PAYMENT_VOUCHER',
            refId: voucher.id,
            createdBy: body.createdBy || null,
          },
        });
      } catch (bankErr: any) {
        console.error('Failed to update bank balance for voucher:', bankErr.message);
      }
    }

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

    // Synchronize linked document payment status (Paid / Partial)
    try {
      await updateVoucherLinkedDocument(voucher);
    } catch (syncErr) {
      console.error('Failed to sync linked document status:', syncErr);
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
