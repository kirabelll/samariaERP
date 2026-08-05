import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.supplierAgreement.findUnique({
      where: { id: params.id },
      include: {
        supplier: {
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

    return NextResponse.json({ success: true, data: record });
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

    // Strip non-updatable, relation, and computed fields
    const { id: _id, createdAt: _ca, updatedAt: _ua, supplier: _supplier, agreementNo: _an, supplierId: _si, ...updateData } = body;

    const record = await prisma.supplierAgreement.findUnique({
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
        const activatingRole = updateData.activatedByRole;
        const ALLOWED_ROLES = ['FINANCE', 'MANAGER', 'ADMIN'];
        if (activatingRole && !ALLOWED_ROLES.includes(activatingRole)) {
          return NextResponse.json(
            { success: false, error: 'Only Finance, Manager, or Admin can activate or reject agreements' },
            { status: 403 }
          );
        }
      }

      // Clean up metadata fields that aren't in the DB schema
      delete updateData.activatedByRole;
      delete updateData.activatedByName;
      delete updateData.activatedAt;
    }

    // Handle JSON stringification for items if it's an object
    if (updateData.items && typeof updateData.items === 'object') {
      updateData.items = JSON.stringify(updateData.items);
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

    const updatedRecord = await prisma.supplierAgreement.update({
      where: { id: params.id },
      data: updateData,
      include: { supplier: true },
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
    const record = await prisma.supplierAgreement.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // Soft delete - set status to Cancelled
    const deletedRecord = await prisma.supplierAgreement.update({
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
