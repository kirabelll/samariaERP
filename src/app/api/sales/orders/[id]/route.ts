import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requestApproval } from '@/lib/approval-workflow';
import { deductInventory, restoreInventory, reconcileInventory } from '@/lib/inventory';

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

    // Handle status transition to Cancelled -> restore inventory
    if (updateData.status === 'Cancelled' && record.status !== 'Cancelled') {
      try {
        await restoreInventory(record.items, record.division, { orderNo: record.orderNo });
      } catch (invErr) {
        console.error('Error restoring inventory on order cancellation:', invErr);
      }
    } else if (record.status === 'Cancelled' && updateData.status && updateData.status !== 'Cancelled') {
      // Re-activating a cancelled order -> deduct inventory
      try {
        await deductInventory(updateData.items || record.items, updateData.division || record.division, { orderNo: record.orderNo });
      } catch (invErr) {
        console.error('Error deducting inventory on order reactivation:', invErr);
      }
    } else if (updateData.items && record.status !== 'Cancelled' && updateData.status !== 'Cancelled') {
      // Items were modified -> reconcile difference
      try {
        const targetDivision = updateData.division || record.division;
        const serializedNewItems = typeof updateData.items === 'string' ? updateData.items : JSON.stringify(updateData.items);
        await reconcileInventory(record.items, serializedNewItems, targetDivision, { orderNo: record.orderNo });
        updateData.items = serializedNewItems;
      } catch (invErr) {
        console.error('Error reconciling inventory on order update:', invErr);
      }
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
    const searchParams = request.nextUrl.searchParams;
    const isPermanent = searchParams.get('permanent') === 'true' || searchParams.get('hard') === 'true';

    const record = await prisma.salesOrder.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            deliveries: true,
            invoices: true,
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Sales Order not found' },
        { status: 404 }
      );
    }

    // Restore inventory when cancelling or deleting an active sales order
    if (record.status !== 'Cancelled') {
      try {
        await restoreInventory(record.items, record.division, { orderNo: record.orderNo });
      } catch (stockErr) {
        console.error('Error restoring sales order stock on delete:', stockErr);
      }
    }

    if (record.status === 'Cancelled' || isPermanent) {
      const counts = record._count;
      const linked: string[] = [];
      if (counts.deliveries > 0) linked.push(`${counts.deliveries} delivery(ies)`);
      if (counts.invoices > 0) linked.push(`${counts.invoices} invoice(s)`);

      if (linked.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot permanently delete sales order because it is linked to: ${linked.join(', ')}.`,
          },
          { status: 400 }
        );
      }

      // Delete approvals for this sales order if any
      await prisma.approval.deleteMany({
        where: { module: 'SalesOrder', recordId: params.id },
      });

      // Hard delete
      await prisma.salesOrder.delete({
        where: { id: params.id },
      });

      return NextResponse.json({
        success: true,
        message: 'Sales Order permanently deleted and inventory restored',
      });
    }

    // Soft delete / Cancel
    const deletedRecord = await prisma.salesOrder.update({
      where: { id: params.id },
      data: { status: 'Cancelled' },
    });

    return NextResponse.json({
      success: true,
      message: 'Sales Order cancelled successfully and inventory restored',
      data: deletedRecord,
    });
  } catch (error: any) {
    console.error('Error deleting sales order:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
