import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: supplier });
  } catch (error: any) {
    console.error('Error fetching supplier:', error);
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

    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        companyName: body.companyName || supplier.companyName,
        supplierType: body.supplierType || supplier.supplierType,
        firstName: body.firstName !== undefined ? body.firstName : supplier.firstName,
        lastName: body.lastName !== undefined ? body.lastName : supplier.lastName,
        tin: body.tin !== undefined ? body.tin : supplier.tin,
        phone: body.phone !== undefined ? body.phone : supplier.phone,
        email: body.email !== undefined ? body.email : supplier.email,
        contactPerson: body.contactPerson !== undefined ? body.contactPerson : supplier.contactPerson,
        location: body.location !== undefined ? body.location : supplier.location,
        status: body.status || supplier.status,
        withholding: body.withholding !== undefined ? body.withholding : supplier.withholding,
        withholdRate: body.withholdRate !== undefined ? body.withholdRate : supplier.withholdRate,
      },
    });

    return NextResponse.json({ success: true, data: updatedSupplier });
  } catch (error: any) {
    console.error('Error updating supplier:', error);
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

    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            goodsReceives: true,
            supplierPayments: true,
            agreements: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // If already Inactive or explicitly requested permanent delete -> hard delete
    if (supplier.status === 'Inactive' || isPermanent) {
      const counts = supplier._count;
      const linked: string[] = [];
      if (counts.purchaseOrders > 0) linked.push(`${counts.purchaseOrders} purchase order(s)`);
      if (counts.goodsReceives > 0) linked.push(`${counts.goodsReceives} goods receive(s)`);
      if (counts.supplierPayments > 0) linked.push(`${counts.supplierPayments} payment(s)`);
      if (counts.agreements > 0) linked.push(`${counts.agreements} agreement(s)`);

      if (linked.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot permanently delete supplier because it is referenced in: ${linked.join(', ')}. Please remove or reassign these records first.`,
          },
          { status: 400 }
        );
      }

      // Delete linked bank accounts first
      await prisma.supplierBank.deleteMany({
        where: { supplierId: params.id },
      });

      // Hard delete from database
      await prisma.supplier.delete({
        where: { id: params.id },
      });

      return NextResponse.json({
        success: true,
        message: 'Supplier permanently deleted from database',
      });
    }

    // Soft delete - set status to Inactive
    const deletedSupplier = await prisma.supplier.update({
      where: { id: params.id },
      data: { status: 'Inactive' },
    });

    return NextResponse.json({
      success: true,
      message: 'Supplier deactivated successfully (status set to Inactive)',
      data: deletedSupplier,
    });
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
