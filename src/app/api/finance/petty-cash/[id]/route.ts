import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.pettyCash.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Petty cash record not found' },
        { status: 404 }
      );
    }

    let bankAccount = null;
    if (record.bankAccountId) {
      try {
        bankAccount = await prisma.bankAccount.findUnique({
          where: { id: record.bankAccountId },
          select: {
            id: true,
            bankName: true,
            accountNo: true,
            accountName: true,
            branch: true,
            balance: true,
          },
        });
      } catch (bankErr) {
        console.error('Error fetching linked bank account:', bankErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...record,
        bankAccount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching petty cash record:', error);
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
    const record = await prisma.pettyCash.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Petty cash record not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { id, createdAt, updatedAt, bankAccount, ...updateData } = body;

    // Handle amount as number if provided
    if (updateData.amount !== undefined) {
      updateData.amount = Number(updateData.amount);
    }

    // Handle transactionDate as Date if provided
    if (updateData.transactionDate) {
      updateData.transactionDate = new Date(updateData.transactionDate);
    }

    const updatedRecord = await prisma.pettyCash.update({
      where: { id: params.id },
      data: updateData,
    });

    let updatedBankAccount = null;
    if (updatedRecord.bankAccountId) {
      try {
        updatedBankAccount = await prisma.bankAccount.findUnique({
          where: { id: updatedRecord.bankAccountId },
          select: {
            id: true,
            bankName: true,
            accountNo: true,
            accountName: true,
            branch: true,
            balance: true,
          },
        });
      } catch (bankErr) {
        console.error('Error fetching linked bank account:', bankErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedRecord,
        bankAccount: updatedBankAccount,
      },
    });
  } catch (error: any) {
    console.error('Error updating petty cash record:', error);
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
    const record = await prisma.pettyCash.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Petty cash record not found' },
        { status: 404 }
      );
    }

    if (record.status === 'Posted') {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel a posted record' },
        { status: 400 }
      );
    }

    // Soft delete - set status to Cancelled
    const cancelledRecord = await prisma.pettyCash.update({
      where: { id: params.id },
      data: { status: 'Cancelled' },
    });

    return NextResponse.json({
      success: true,
      data: cancelledRecord,
    });
  } catch (error: any) {
    console.error('Error cancelling petty cash record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
