import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requestApproval } from '@/lib/approval-workflow';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        supplier: {
          select: {
            companyName: true,
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // Also fetch approval status for this PO
    let approvals: any[] = [];
    try {
      approvals = await prisma.approval.findMany({
        where: { module: 'PurchaseOrder', recordId: params.id },
        orderBy: { requestedAt: 'asc' },
        include: {
          approver: { select: { firstName: true, lastName: true } },
        },
      });
    } catch (e) {
      // Approval table may not have new columns yet
      console.warn('Could not fetch approvals:', e);
    }

    return NextResponse.json({ success: true, data: record, approvals });
  } catch (error: any) {
    console.error('Error fetching record:', error);
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
    const body = await request.json();

    // Strip non-updatable, relation, and non-schema fields
    const {
      id: _id,
      createdAt: _ca,
      supplier: _supplier,
      goodsReceives: _goodsReceives,
      supplierPayments: _sp,
      coupons: _coupons,
      submittedBy,
      ...updateData
    } = body;

    const record = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: { supplier: { select: { companyName: true } } },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // Handle "Submit for Approval" action
    if (updateData.status === 'Pending_Approval' && record.status === 'Draft') {
      const updatedRecord = await prisma.purchaseOrder.update({
        where: { id: params.id },
        data: { status: 'Pending_Approval' },
      });

      // Create approval request
      try {
        const supplierName = record.supplier?.companyName || 'Unknown Supplier';
        await requestApproval({
          module: 'PurchaseOrder',
          recordId: record.id,
          recordRef: record.poNo,
          amount: Number(record.totalAmount) || 0,
          description: `Purchase Order ${record.poNo} — ${Number(record.totalAmount).toLocaleString('en-US')} ETB from ${supplierName}`,
          requesterId: submittedBy || record.createdBy || '',
        });
      } catch (e) {
        console.error('Approval request failed for PO:', e);
      }

      return NextResponse.json({ success: true, data: updatedRecord });
    }

    const updatedRecord = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updatedRecord });
  } catch (error: any) {
    console.error('Error updating record:', error);
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
    const record = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // Soft delete - set status to Cancelled
    const deletedRecord = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: { status: 'Cancelled' },
    });

    return NextResponse.json({ success: true, message: 'Record deleted successfully', data: deletedRecord });
  } catch (error: any) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
