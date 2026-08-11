import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.salesAgreement.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: {
            companyName: true,
            code: true,
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

    // Resolve item names from CUIDs in the items JSON
    let enrichedRecord: any = { ...record };
    try {
      const parsedItems = typeof record.items === 'string' ? JSON.parse(record.items) : record.items;
      if (Array.isArray(parsedItems) && parsedItems.length > 0) {
        const itemIds = parsedItems.map((i: any) => i.itemId).filter(Boolean);
        const items = itemIds.length > 0
          ? await prisma.item.findMany({ where: { id: { in: itemIds } }, select: { id: true, name: true, code: true } })
          : [];
        const itemMap = Object.fromEntries(items.map((i: any) => [i.id, { name: i.name, code: i.code }]));
        enrichedRecord.items = JSON.stringify(parsedItems.map((i: any) => ({
          ...i,
          itemName: itemMap[i.itemId]?.name || i.itemId,
          itemCode: itemMap[i.itemId]?.code || '',
        })));
      }
    } catch { /* keep original items if parsing fails */ }

    return NextResponse.json({ success: true, data: enrichedRecord });
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

    // Strip non-updatable, computed, and relation fields before passing to Prisma
    const {
      id: _id,
      createdAt: _ca,
      updatedAt: _ua,
      customer: _customer,
      agreementNo: _agreementNo,
      activatedByRole,
      activatedByName: _activatedByName,
      ...updateData
    } = body;

    // Ensure totalAmount is a number if present (it may arrive as a string)
    if (updateData.totalAmount !== undefined) {
      updateData.totalAmount = parseFloat(updateData.totalAmount);
    }

    // Convert date strings to DateTime objects for Prisma
    if (updateData.validFrom && typeof updateData.validFrom === 'string') {
      // If it's a date-only string (YYYY-MM-DD), convert to ISO datetime
      if (updateData.validFrom.match(/^\d{4}-\d{2}-\d{2}$/)) {
        updateData.validFrom = new Date(updateData.validFrom + 'T00:00:00.000Z');
      } else {
        updateData.validFrom = new Date(updateData.validFrom);
      }
    }

    if (updateData.validTo && typeof updateData.validTo === 'string') {
      // If it's a date-only string (YYYY-MM-DD), convert to ISO datetime
      if (updateData.validTo.match(/^\d{4}-\d{2}-\d{2}$/)) {
        updateData.validTo = new Date(updateData.validTo + 'T23:59:59.999Z');
      } else {
        updateData.validTo = new Date(updateData.validTo);
      }
    }

    const record = await prisma.salesAgreement.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // Status transition validation for the approval workflow
    if (updateData.status && updateData.status !== record.status) {
      const allowedTransitions: Record<string, string[]> = {
        Draft: ['Active', 'Rejected', 'Cancelled'],
        Active: ['Expired', 'Cancelled', 'Void'],
        Rejected: ['Draft'],
        Expired: ['Active'],
        Cancelled: ['Active'],
      };

      const allowed = allowedTransitions[record.status] || [];
      if (!allowed.includes(updateData.status)) {
        return NextResponse.json(
          { success: false, error: `Cannot transition from "${record.status}" to "${updateData.status}". Allowed: ${allowed.join(', ') || 'none'}` },
          { status: 400 }
        );
      }

      // Only FINANCE, MANAGER, ADMIN can activate or reject a Draft agreement
      if (record.status === 'Draft' && ['Active', 'Rejected'].includes(updateData.status)) {
        const ALLOWED_ROLES = ['FINANCE', 'MANAGER', 'ADMIN'];
        if (activatedByRole && !ALLOWED_ROLES.includes(activatedByRole)) {
          return NextResponse.json(
            { success: false, error: 'Only Finance, Manager, or Admin can activate or reject agreements' },
            { status: 403 }
          );
        }
      }
    }

    const updatedRecord = await prisma.salesAgreement.update({
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

    const record = await prisma.salesAgreement.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    if (isPermanent) {
      await prisma.salesAgreement.delete({
        where: { id: params.id },
      });
      return NextResponse.json({ success: true, message: 'Sales agreement permanently deleted' });
    }

    // Soft delete - set status to Cancelled
    const deletedRecord = await prisma.salesAgreement.update({
      where: { id: params.id },
      data: { status: 'Cancelled' },
    });

    return NextResponse.json({ success: true, message: 'Record cancelled successfully', data: deletedRecord });
  } catch (error: any) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
