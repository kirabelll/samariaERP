import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';
import { journalCementLifting } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const customer = searchParams.get('customer') || '';
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { liftingNo: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (customer) {
      whereClause.customerId = customer;
    }
    if (status) {
      whereClause.status = status;
    }
    if (startDate || endDate) {
      whereClause.liftingDate = {};
      if (startDate) {
        whereClause.liftingDate.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.liftingDate.lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      prisma.cementLifting.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          purchase: { include: { factory: { select: { name: true } } } },
          factory: true,
          truck: true,
          customer: { select: { id: true, companyName: true, phone: true, tin: true, withholding: true, withholdRate: true } },
          invoices: { select: { id: true, invoiceNo: true, totalAmount: true, status: true } },
        },
        orderBy: { liftingDate: 'desc' },
      }),
      prisma.cementLifting.count({ where: whereClause }),
    ]);

    // Fetch linked coupons for liftings that have couponIds
    const couponIds = data.map((l: any) => l.couponId).filter(Boolean) as string[];
    let couponMap: Record<string, { id: string; couponNo: string; status: string; tonnage: number | null }> = {};
    if (couponIds.length > 0) {
      const coupons = await prisma.coupon.findMany({
        where: { id: { in: couponIds } },
        select: { id: true, couponNo: true, status: true, tonnage: true },
      });
      couponMap = Object.fromEntries(coupons.map((c: any) => [c.id, c]));
    }

    // Ensure numeric fields are properly converted
    const formattedData = data.map((lifting: any) => ({
      ...lifting,
      factoryWeight: Number(lifting.factoryWeight),
      buyerWeighbridgeQty: lifting.buyerWeighbridgeQty ? Number(lifting.buyerWeighbridgeQty) : null,
      shortageQty: lifting.shortageQty ? Number(lifting.shortageQty) : null,
      coupon: lifting.couponId ? couponMap[lifting.couponId] || null : null,
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
    console.error('Error fetching cement liftings:', error);
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
      purchaseId,
      factoryId,
      customerId,
      factoryWeighbridgeRef,
      factoryWeight,
      buyerWeighbridgeQty,
      couponId,
      deliveryNoteNo,
      liftingDate,
      registeredBy,
      overrideCreditLimit,
      // Self-transport fields
      selfTransport,
      selfPlateNo,
      selfDriverName,
    } = body;

    let { truckId } = body;

    if (!purchaseId || !factoryId || !customerId || !factoryWeighbridgeRef || !factoryWeight) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify purchase is Active (approved AND paid) before allowing lifting
    const purchaseCheck = await prisma.cementPurchase.findUnique({
      where: { id: purchaseId },
      select: { status: true, purchaseNo: true },
    });
    if (!purchaseCheck) {
      return NextResponse.json(
        { success: false, error: 'Cement purchase not found' },
        { status: 404 }
      );
    }
    if (purchaseCheck.status !== 'Active' && purchaseCheck.status !== 'Exhausted') {
      return NextResponse.json(
        { success: false, error: `Cannot create lifting: purchase ${purchaseCheck.purchaseNo} must be approved and paid first. Current status: ${purchaseCheck.status}` },
        { status: 400 }
      );
    }

    // Check that the customer has at least one Active sales agreement
    const activeAgreementCount = await prisma.salesAgreement.count({
      where: {
        customerId,
        status: 'Active',
      },
    });
    if (activeAgreementCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot create lifting: customer has no active sales agreement' },
        { status: 400 }
      );
    }

    // Credit limit enforcement
    const customerRecord = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { creditLimit: true, companyName: true },
    });
    if (customerRecord && customerRecord.creditLimit > 0 && !overrideCreditLimit) {
      // Sum unpaid invoice amounts
      const unpaidInvoices = await prisma.salesInvoice.aggregate({
        where: {
          customerId,
          division: { in: ['CEMENT', 'CONSTRUCTION'] },
          status: { in: ['Unpaid', 'Partial'] },
        },
        _sum: { totalAmount: true },
      });
      const unpaidInvoiceTotal = unpaidInvoices._sum.totalAmount || 0;

      // Sum verified payments against those invoices
      const verifiedPayments = await prisma.customerPayment.aggregate({
        where: {
          customerId,
          status: 'Verified',
        },
        _sum: { amount: true },
      });
      const paidTotal = verifiedPayments._sum.amount || 0;

      // Sum of all invoiced amounts (to compute unpaid balance correctly)
      const allInvoices = await prisma.salesInvoice.aggregate({
        where: {
          customerId,
          division: { in: ['CEMENT', 'CONSTRUCTION'] },
          status: { not: 'Cancelled' },
        },
        _sum: { totalAmount: true },
      });
      const allInvoicedTotal = allInvoices._sum.totalAmount || 0;
      const invoiceOutstanding = allInvoicedTotal - paidTotal;

      // Sum delivered/verified liftings that have no invoice
      const invoicedLiftingIds = await prisma.salesInvoice.findMany({
        where: {
          customerId,
          division: { in: ['CEMENT', 'CONSTRUCTION'] },
          status: { not: 'Cancelled' },
          liftingId: { not: null },
        },
        select: { liftingId: true },
      });
      const invoicedIds = invoicedLiftingIds.map((i) => i.liftingId).filter(Boolean) as string[];

      const uninvoicedLiftings = await prisma.cementLifting.findMany({
        where: {
          customerId,
          status: { in: ['Delivered', 'Verified'] },
          ...(invoicedIds.length > 0 ? { id: { notIn: invoicedIds } } : {}),
        },
        select: { factoryWeight: true, purchase: { select: { unitPrice: true } } },
      });
      const deliveredNotInvoiced = uninvoicedLiftings.reduce(
        (sum, l) => sum + Number(l.factoryWeight) * Number(l.purchase.unitPrice),
        0
      );

      // Value of this new lifting
      const thisPurchase = await prisma.cementPurchase.findUnique({
        where: { id: purchaseId },
        select: { unitPrice: true },
      });
      const newLiftingValue = factoryWeight * Number(thisPurchase?.unitPrice || 0);

      const currentOutstanding = invoiceOutstanding + deliveredNotInvoiced;
      const projectedOutstanding = currentOutstanding + newLiftingValue;

      if (projectedOutstanding > customerRecord.creditLimit) {
        return NextResponse.json(
          {
            success: false,
            error: `Credit limit exceeded for ${customerRecord.companyName}. Credit limit: ${customerRecord.creditLimit.toLocaleString('en-US')}, current outstanding: ${currentOutstanding.toLocaleString('en-US')}, this lifting value: ${newLiftingValue.toLocaleString('en-US')}, projected total: ${projectedOutstanding.toLocaleString('en-US')}. Use manager override to proceed.`,
            creditLimitExceeded: true,
            details: {
              creditLimit: customerRecord.creditLimit,
              currentOutstanding,
              newLiftingValue,
              projectedOutstanding,
            },
          },
          { status: 400 }
        );
      }
    }

    // Handle self-transport: find or create a generic self-transport truck
    if (selfTransport) {
      try {
        // Find or create a "SELF-TRANSPORT" transporter
        let selfTransporter = await prisma.transporter.findFirst({
          where: { companyName: 'SELF-TRANSPORT' },
        });
        if (!selfTransporter) {
          const lastTrans = await prisma.transporter.findFirst({ orderBy: { code: 'desc' }, select: { code: true } });
          let nextSeq = 1;
          if (lastTrans?.code) { const m = lastTrans.code.match(/(\d+)$/); if (m) nextSeq = parseInt(m[1]) + 1; }
          selfTransporter = await prisma.transporter.create({
            data: {
              code: `TRA-${String(nextSeq).padStart(5, '0')}`,
              companyName: 'SELF-TRANSPORT',
              phone: '0000000000',
              status: 'Active',
            },
          });
        }

        // Find or create a generic SELF-TRANSPORT truck
        const plateNo = selfPlateNo ? selfPlateNo.toUpperCase() : 'SELF-TRANSPORT';
        let truck = await prisma.truck.findFirst({ where: { plateNo, transporterId: selfTransporter.id } });
        if (!truck) {
          truck = await prisma.truck.create({
            data: {
              plateNo,
              transporterId: selfTransporter.id,
              driverName: selfDriverName || 'Customer Self',
              ownerName: 'Customer Self Transport',
              truckType: 'Self',
              status: 'Active',
            },
          });
        }
        truckId = truck.id;
      } catch (selfErr: any) {
        console.error('Failed to handle self-transport truck:', selfErr);
        return NextResponse.json(
          { success: false, error: `Self-transport error: ${selfErr.message}` },
          { status: 400 }
        );
      }
    }

    if (!truckId) {
      return NextResponse.json(
        { success: false, error: 'Truck is required. Select a truck or enable self-transport.' },
        { status: 400 }
      );
    }

    // STRICT COUPON CHECK: if this purchase has available coupons, one MUST be used
    if (!couponId) {
      const availableCoupons = await prisma.coupon.count({
        where: {
          purchaseId,
          status: { in: ['COLLECTED', 'IN_CUSTODY', 'HANDED_OVER'] },
        },
      });
      if (availableCoupons > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `This purchase has ${availableCoupons} available coupon(s). A coupon MUST be selected to record a lifting. No lifting without coupon is allowed.`,
          },
          { status: 400 }
        );
      }
    }

    // Generate lifting number
    const lastLifting = await prisma.cementLifting.findFirst({
      orderBy: { liftingNo: 'desc' },
      select: { liftingNo: true },
    });
    let nextLiftingSeq = 1;
    if (lastLifting?.liftingNo) {
      const match = lastLifting.liftingNo.match(/(\d+)$/);
      if (match) nextLiftingSeq = parseInt(match[1]) + 1;
    }
    const liftingNo = `LIFT-${String(nextLiftingSeq).padStart(7, '0')}`;

    // Calculate shortage if buyer weighbridge exists
    const shortageQty = buyerWeighbridgeQty ? factoryWeight - buyerWeighbridgeQty : null;

    const lifting = await prisma.cementLifting.create({
      data: {
        liftingNo,
        purchaseId,
        factoryId,
        truckId,
        customerId,
        factoryWeighbridgeRef,
        factoryWeight,
        buyerWeighbridgeQty: buyerWeighbridgeQty || null,
        shortageQty: shortageQty || null,
        couponId: couponId || null,
        deliveryNoteNo: deliveryNoteNo || null,
        liftingDate: liftingDate ? new Date(liftingDate) : new Date(),
        status: 'Lifted',
        registeredBy: registeredBy || null,
      },
      include: { purchase: true, factory: true, truck: true, customer: { select: { id: true, companyName: true } } },
    });

    // Mark coupon as USED if one was linked
    if (couponId) {
      try {
        await prisma.coupon.update({
          where: { id: couponId },
          data: { status: 'USED', usedDate: new Date() },
        });
      } catch (couponErr) {
        console.error('Failed to update coupon status:', couponErr);
      }
    }

    // Update factory balance immediately at lifting (cement left the factory)
    try {
      const existingBalance = await prisma.cementBalance.findUnique({
        where: {
          purchaseId_factoryId: { purchaseId, factoryId },
        },
      });

      if (existingBalance) {
        const newLiftedQty = existingBalance.liftedQty + factoryWeight;
        await prisma.cementBalance.update({
          where: { purchaseId_factoryId: { purchaseId, factoryId } },
          data: {
            liftedQty: newLiftedQty,
            remainingQty: Math.max(0, existingBalance.initialQty - newLiftedQty),
            lastUpdated: new Date(),
          },
        });
      } else {
        // No balance record yet — create one from the purchase
        const purchase = await prisma.cementPurchase.findUnique({ where: { id: purchaseId } });
        const initialQty = purchase?.quantityTons || 0;
        await prisma.cementBalance.create({
          data: {
            purchaseId,
            factoryId,
            initialQty,
            liftedQty: factoryWeight,
            remainingQty: Math.max(0, initialQty - factoryWeight),
            lastUpdated: new Date(),
          },
        });
      }

      // Also update balanceRemaining on the CementPurchase
      const totalLifted = await prisma.cementLifting.aggregate({
        where: {
          purchaseId,
          status: { in: ['Lifted', 'Delivered', 'Verified'] },
        },
        _sum: { factoryWeight: true },
      });
      const purchaseRec = lifting.purchase;
      const purchaseQty = purchaseRec?.quantityTons || 0;
      const totalLiftedWeight = totalLifted._sum.factoryWeight || 0;
      const newPurchaseBalance = Math.max(0, purchaseQty - totalLiftedWeight);

      await prisma.cementPurchase.update({
        where: { id: purchaseId },
        data: {
          balanceRemaining: newPurchaseBalance,
          status: newPurchaseBalance <= 0 ? 'Exhausted' : 'Active',
        },
      });
    } catch (balErr) {
      console.error('Failed to update factory balance on lifting:', balErr);
    }

    // Auto-create journal entry (Debit COGS, Credit Cement Inventory)
    let journalResult = null;
    try {
      journalResult = await journalCementLifting(lifting);
      if (journalResult.created) {
        notify({
          module: 'FINANCE',
          event: 'auto_journal_posted',
          details: {
            source: 'Cement Lifting',
            ref: lifting.liftingNo,
            journalNo: journalResult.voucherNo,
            amount: Number(lifting.factoryWeight) * Number(lifting.purchase?.unitPrice || 0),
          },
        });
      }
    } catch (e) {
      console.error('Auto-journal for lifting failed:', e);
    }

    notify({ module: 'CEMENT', event: 'cement_lifting', details: { liftingNo: lifting.liftingNo, factoryWeight: lifting.factoryWeight } });

    return NextResponse.json(
      { success: true, data: lifting, ...(journalResult ? { journal: journalResult } : {}) },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating cement lifting:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
