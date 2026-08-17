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
    const supplier = searchParams.get('supplier') || '';
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { purchaseNo: { contains: search, mode: 'insensitive' } },
        { factory: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (supplier) {
      whereClause.factoryId = supplier;
    }
    if (status) {
      whereClause.status = status;
    }

    const paymentStatus = searchParams.get('paymentStatus') || '';
    if (paymentStatus) {
      // Support comma-separated values like "Unpaid,Partial"
      const statuses = paymentStatus.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        whereClause.paymentStatus = statuses[0];
      } else if (statuses.length > 1) {
        whereClause.paymentStatus = { in: statuses };
      }
    }
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      prisma.cementPurchase.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { factory: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.cementPurchase.count({ where: whereClause }),
    ]);

    // Ensure numeric fields are properly converted
    const formattedData = data.map((purchase: any) => ({
      ...purchase,
      quantityTons: Number(purchase.quantityTons),
      unitPrice: Number(purchase.unitPrice),
      totalAmount: Number(purchase.totalAmount),
      balanceRemaining: Number(purchase.balanceRemaining),
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching cement purchases:', error);
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
      factoryId,
      cementType,
      quantityTons,
      unitPrice,
      totalAmount,
      vatRate,
      vatAmount,
      paymentRef,
      paymentDate,
      createdBy,
      isCredit,  // true if user explicitly chose credit purchase
      bankAccountId: selectedBankAccountId,  // optional — user-selected bank account
    } = body;

    if (!factoryId || !cementType || !quantityTons || !unitPrice) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: factoryId, cementType, quantityTons, unitPrice' },
        { status: 400 }
      );
    }

    const purchaseTotal = totalAmount || quantityTons * unitPrice;

    // Generate purchase number
    const lastPurchase = await prisma.cementPurchase.findFirst({
      orderBy: { purchaseNo: 'desc' },
      select: { purchaseNo: true },
    });
    let nextPurchaseSeq = 1;
    if (lastPurchase?.purchaseNo) {
      const match = lastPurchase.purchaseNo.match(/(\d+)$/);
      if (match) nextPurchaseSeq = parseInt(match[1]) + 1;
    }
    const purchaseNo = `CPR-${String(nextPurchaseSeq).padStart(7, '0')}`;

    const purchase = await prisma.cementPurchase.create({
      data: {
        purchaseNo,
        factoryId,
        cementType,
        quantityTons,
        unitPrice,
        totalAmount: purchaseTotal,
        vatRate: vatRate || 0,
        vatAmount: vatAmount || 0,
        paymentRef: paymentRef || (isCredit ? 'CREDIT' : null),
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        balanceRemaining: quantityTons,  // Balance is in QT (tons), not money
        status: 'Pending',  // Always start as Pending — must go through approval + payment to become Active
        createdBy: createdBy || null,
      },
      include: { factory: true },
    });

    // Immediately create CementBalance record so factory balance is visible right away
    try {
      await prisma.cementBalance.create({
        data: {
          purchaseId: purchase.id,
          factoryId,
          initialQty: quantityTons,
          liftedQty: 0,
          remainingQty: quantityTons,
          lastUpdated: new Date(),
        },
      });
    } catch (balanceErr) {
      console.error('Failed to create initial cement balance:', balanceErr);
    }

    notify({
      module: 'CEMENT',
      event: isCredit ? 'cement_purchase_credit' : 'cement_purchase',
      details: {
        purchaseNo: purchase.purchaseNo,
        cementType: purchase.cementType,
        totalAmount: purchase.totalAmount,
        ...(isCredit ? { note: 'CREDIT PURCHASE — insufficient bank balance' } : {}),
      },
    });

    // Auto-create approval request so it appears in System > Approvals
    try {
      const creditNote = isCredit ? ' [CREDIT]' : '';
      await requestApproval({
        module: 'CementPurchase',
        recordId: purchase.id,
        recordRef: purchase.purchaseNo,
        amount: Number(purchase.totalAmount),
        description: `Cement Purchase ${purchase.purchaseNo} — ${purchase.factory?.name || 'Factory'} — ${purchase.cementType} — ${quantityTons} QT — ETB ${Number(purchase.totalAmount).toLocaleString('en-US')}${creditNote}`,
        requesterId: createdBy || 'system',
      });
    } catch (approvalErr) {
      console.error('Failed to create approval for cement purchase:', approvalErr);
    }

    return NextResponse.json(
      { success: true, data: purchase },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating cement purchase:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
