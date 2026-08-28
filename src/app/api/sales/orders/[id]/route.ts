import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requestApproval } from '@/lib/approval-workflow';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.salesOrder.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            companyName: true,
            firstName: true,
            lastName: true,
            phone: true,
            tin: true,
            licenseNo: true,
            licenseExpiry: true,
            licenseType: true,
            medicalApproved: true,
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

    // Parse items and enrich with database Item details if itemIds exist
    let enrichedItems: any[] = [];
    try {
      const parsedItems = typeof record.items === 'string' ? JSON.parse(record.items) : (record.items || []);
      if (Array.isArray(parsedItems)) {
        const itemIds = parsedItems.map((i: any) => i.itemId || i.id).filter(Boolean);
        const dbItems = itemIds.length > 0
          ? await prisma.item.findMany({
              where: { id: { in: itemIds } },
              select: { id: true, name: true, code: true, unit: true },
            })
          : [];
        const dbItemMap = new Map(dbItems.map((di) => [di.id, di]));

        enrichedItems = parsedItems.map((item: any) => {
          const targetId = item.itemId || item.id;
          const dbItem = targetId ? dbItemMap.get(targetId) : null;
          const name = item.name || item.itemName || item.item || item.description || dbItem?.name || 'Unnamed Item';
          const code = item.code || item.itemCode || dbItem?.code || '';
          const unit = item.unit || (typeof dbItem?.unit === 'string' ? dbItem.unit : (dbItem?.unit as any)?.name) || 'pcs';

          return {
            ...item,
            name,
            item: name,
            itemName: name,
            code,
            itemCode: code,
            unit,
            qty: item.qty || item.quantity || 1,
            quantity: item.qty || item.quantity || 1,
            unitPrice: Number(item.unitPrice || item.price || 0),
            total: Number(item.total || ((item.qty || item.quantity || 1) * (item.unitPrice || item.price || 0))),
          };
        });
      }
    } catch (e) {
      console.warn('Could not parse/enrich order items:', e);
    }

    // Also fetch approval status
    let approvals: any[] = [];
    try {
      approvals = await prisma.approval.findMany({
        where: { module: 'SalesOrder', recordId: params.id },
        orderBy: { requestedAt: 'asc' },
        include: {
          approver: { select: { firstName: true, lastName: true } },
        },
      });
    } catch (e) {
      console.warn('Could not fetch approvals:', e);
    }

    const orderData = {
      ...record,
      items: enrichedItems.length > 0 ? enrichedItems : record.items,
    };

    return NextResponse.json({ success: true, data: orderData, approvals });
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
      customer: _customer,
      proforma: _proforma,
      deliveries: _deliveries,
      invoices: _invoices,
      submittedBy,
      ...updateData
    } = body;

    const record = await prisma.salesOrder.findUnique({
      where: { id: params.id },
      include: { customer: { select: { companyName: true, firstName: true, lastName: true } } },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // Handle "Submit for Approval" action
    if (updateData.status === 'Pending_Approval' && record.status === 'Pending') {
      const updatedRecord = await prisma.salesOrder.update({
        where: { id: params.id },
        data: { status: 'Pending_Approval' },
      });

      // Create approval request
      try {
        const customerName = record.customer?.companyName || `${record.customer?.firstName || ''} ${record.customer?.lastName || ''}`.trim() || 'Unknown';
        await requestApproval({
          module: 'SalesOrder',
          recordId: record.id,
          recordRef: record.orderNo,
          amount: Number(record.totalAmount) || 0,
          description: `Sales Order ${record.orderNo} — ${Number(record.totalAmount).toLocaleString('en-US')} ETB for ${customerName}`,
          requesterId: submittedBy || record.createdBy || '',
        });
      } catch (e) {
        console.error('Approval request failed for SO:', e);
      }

      return NextResponse.json({ success: true, data: updatedRecord });
    }

    const updatedRecord = await prisma.salesOrder.update({
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
    const record = await prisma.salesOrder.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // Soft delete
    const deletedRecord = await prisma.salesOrder.update({
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
