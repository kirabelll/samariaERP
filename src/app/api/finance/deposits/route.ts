import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const customerId = searchParams.get('customerId') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (customerId) {
      whereClause.customerId = customerId;
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.customerDeposit.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          customer: { select: { companyName: true, code: true } },
          applications: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customerDeposit.count({ where: whereClause }),
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
    console.error('Error fetching customer deposits:', error);
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
      amount,
      depositMethod,
      bankName,
      refNo,
      depositSlip,
      createdBy,
    } = body;

    // Validate required fields
    if (!customerId || !amount || !depositMethod) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate depositNo
    const count = await prisma.customerDeposit.count();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const depositNo = `DEP-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const deposit = await prisma.customerDeposit.create({
      data: {
        depositNo,
        customerId,
        amount,
        depositMethod,
        bankName,
        refNo,
        depositSlip,
        createdBy,
        status: 'Pending',
        unappliedAmount: amount,
        appliedAmount: 0,
      },
      include: {
        customer: { select: { companyName: true, code: true } },
        applications: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: deposit,
    });
  } catch (error: any) {
    console.error('Error creating customer deposit:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, verifiedBy } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Deposit ID is required' },
        { status: 400 }
      );
    }

    const deposit = await prisma.customerDeposit.findUnique({
      where: { id },
    });

    if (!deposit) {
      return NextResponse.json(
        { success: false, error: 'Deposit not found' },
        { status: 404 }
      );
    }

    // Handle automatic deposit application when status changes to "Verified"
    if (status === 'Verified' && deposit.status !== 'Verified') {
      // Find all unpaid invoices for this customer, ordered by invoiceDate ASC (oldest first)
      const unpaidInvoices = await prisma.salesInvoice.findMany({
        where: {
          customerId: deposit.customerId,
          status: {
            notIn: ['Paid', 'Cancelled'],
          },
        },
        orderBy: {
          invoiceDate: 'asc',
        },
      });

      let remainingAmount = deposit.unappliedAmount;
      let appliedTotal = deposit.appliedAmount;
      let invoicesToUpdate: Array<{ id: string; amountApplied: number }> = [];

      // Apply deposit to invoices one by one
      for (const invoice of unpaidInvoices) {
        if (remainingAmount <= 0) break;

        const amountToApply = Math.min(remainingAmount, invoice.totalAmount);

        // Create DepositApplication record
        await prisma.depositApplication.create({
          data: {
            depositId: id,
            invoiceId: invoice.id,
            amount: amountToApply,
            appliedBy: verifiedBy || 'system',
          },
        });

        invoicesToUpdate.push({
          id: invoice.id,
          amountApplied: amountToApply,
        });

        appliedTotal += amountToApply;
        remainingAmount -= amountToApply;
      }

      // Update all affected invoices
      for (const invoiceUpdate of invoicesToUpdate) {
        const invoice = unpaidInvoices.find(inv => inv.id === invoiceUpdate.id);
        if (invoice) {
          // Update invoice status to 'Paid' if fully covered, otherwise leave as is
          const newInvoiceStatus = invoiceUpdate.amountApplied >= invoice.totalAmount ? 'Paid' : invoice.status;

          await prisma.salesInvoice.update({
            where: { id: invoiceUpdate.id },
            data: {
              status: newInvoiceStatus,
            },
          });
        }
      }

      // Determine new deposit status based on remaining amount
      let newDepositStatus = status;
      if (remainingAmount <= 0) {
        newDepositStatus = 'Applied';
      } else if (appliedTotal > 0) {
        newDepositStatus = 'Partially_Applied';
      }

      // Update deposit with applied amounts and new status
      const updatedDeposit = await prisma.customerDeposit.update({
        where: { id },
        data: {
          status: newDepositStatus,
          appliedAmount: appliedTotal,
          unappliedAmount: remainingAmount,
          verifiedBy,
          verifiedAt: new Date(),
        },
        include: {
          customer: { select: { companyName: true, code: true } },
          applications: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedDeposit,
      });
    }

    // For non-verification status updates, just update the deposit
    const updatedDeposit = await prisma.customerDeposit.update({
      where: { id },
      data: {
        status: status || deposit.status,
        verifiedBy: verifiedBy || deposit.verifiedBy,
        verifiedAt: status === 'Verified' ? new Date() : deposit.verifiedAt,
      },
      include: {
        customer: { select: { companyName: true, code: true } },
        applications: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedDeposit,
    });
  } catch (error: any) {
    console.error('Error updating customer deposit:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
