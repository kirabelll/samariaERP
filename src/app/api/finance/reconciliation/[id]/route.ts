import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reconciliation = await prisma.bankReconciliation.findUnique({
      where: { id: params.id },
      include: {
        bankAccount: true,
        items: true,
      },
    });

    if (!reconciliation) {
      return NextResponse.json(
        { success: false, error: 'Reconciliation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: reconciliation,
    });
  } catch (error: any) {
    console.error('Error fetching reconciliation:', error);
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
    const reconciliation = await prisma.bankReconciliation.findUnique({
      where: { id: params.id },
    });

    if (!reconciliation) {
      return NextResponse.json(
        { success: false, error: 'Reconciliation not found' },
        { status: 404 }
      );
    }

    await prisma.bankReconciliation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Reconciliation deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting reconciliation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
