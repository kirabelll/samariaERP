import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deposit = await prisma.customerDeposit.findUnique({
      where: { id: params.id },
      include: {
        customer: { select: { companyName: true, code: true } },
        applications: true,
      },
    });

    if (!deposit) {
      return NextResponse.json(
        { success: false, error: 'Deposit not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deposit,
    });
  } catch (error: any) {
    console.error('Error fetching customer deposit:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deposit = await prisma.customerDeposit.findUnique({
      where: { id: params.id },
    });

    if (!deposit) {
      return NextResponse.json(
        { success: false, error: 'Deposit not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    // Strip id, createdAt, updatedAt, customer, applications
    const { id, createdAt, updatedAt, customer, applications, ...updateData } = body;

    // Handle automatic deposit application when status changes to "Verified"
    if (updateData.status === 'Verified' && deposit.status !== 'Verified') {
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
            depositId: params.id,
            invoiceId: invoice.id,
            amount: amountToApply,
            appliedBy: updateData.verifiedBy || 'system',
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
      let newDepositStatus = updateData.status;
      if (remainingAmount <= 0) {
        newDepositStatus = 'Applied';
      } else if (appliedTotal > 0) {
        newDepositStatus = 'Partially_Applied';
      }

      // Update deposit with applied amounts and new status
      updateData.appliedAmount = appliedTotal;
      updateData.unappliedAmount = remainingAmount;
      updateData.status = newDepositStatus;
      updateData.verifiedAt = new Date();
    }

    const updatedDeposit = await prisma.customerDeposit.update({
      where: { id: params.id },
      data: updateData,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deposit = await prisma.customerDeposit.findUnique({
      where: { id: params.id },
    });

    if (!deposit) {
      return NextResponse.json(
        { success: false, error: 'Deposit not found' },
        { status: 404 }
      );
    }

    // Soft delete - set status to Cancelled
    const deletedDeposit = await prisma.customerDeposit.update({
      where: { id: params.id },
      data: { status: 'Cancelled' },
      include: {
        customer: { select: { companyName: true, code: true } },
        applications: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: deletedDeposit,
    });
  } catch (error: any) {
    console.error('Error deleting customer deposit:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
