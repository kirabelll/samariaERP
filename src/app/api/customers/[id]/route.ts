import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: customer });
  } catch (error: any) {
    console.error('Error fetching customer:', error);
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

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        companyName: body.companyName || customer.companyName,
        customerType: body.customerType || customer.customerType,
        tin: body.tin !== undefined ? body.tin : customer.tin,
        phone: body.phone !== undefined ? body.phone : customer.phone,
        email: body.email !== undefined ? body.email : customer.email,
        contactPerson: body.contactPerson || customer.contactPerson,
        location: body.location !== undefined ? body.location : customer.location,
        division: body.division || customer.division,
        status: body.status || customer.status,
        creditLimit: body.creditLimit !== undefined ? body.creditLimit : customer.creditLimit,
        creditTermDays: body.creditTermDays !== undefined ? body.creditTermDays : customer.creditTermDays,
        withholding: body.withholding !== undefined ? body.withholding : customer.withholding,
        withholdRate: body.withholdRate !== undefined ? body.withholdRate : customer.withholdRate,
      },
    });

    return NextResponse.json({ success: true, data: updatedCustomer });
  } catch (error: any) {
    console.error('Error updating customer:', error);
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

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            salesOrders: true,
            invoices: true,
            payments: true,
            agreements: true,
            proformas: true,
            deliveries: true,
            cementLiftings: true,
            medicalRequests: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // If already Inactive or requested permanent delete
    if (customer.status === 'Inactive' || isPermanent) {
      const counts = customer._count;
      const linked: string[] = [];
      if (counts.salesOrders > 0) linked.push(`${counts.salesOrders} sales order(s)`);
      if (counts.invoices > 0) linked.push(`${counts.invoices} invoice(s)`);
      if (counts.payments > 0) linked.push(`${counts.payments} payment(s)`);
      if (counts.agreements > 0) linked.push(`${counts.agreements} agreement(s)`);
      if (counts.proformas > 0) linked.push(`${counts.proformas} proforma(s)`);
      if (counts.deliveries > 0) linked.push(`${counts.deliveries} delivery(ies)`);
      if (counts.cementLiftings > 0) linked.push(`${counts.cementLiftings} cement lifting(s)`);
      if (counts.medicalRequests > 0) linked.push(`${counts.medicalRequests} medical request(s)`);

      if (linked.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot permanently delete customer because it is referenced in: ${linked.join(', ')}. Please remove or reassign these records first.`,
          },
          { status: 400 }
        );
      }

      // Hard delete
      await prisma.customer.delete({
        where: { id: params.id },
      });

      return NextResponse.json({
        success: true,
        message: 'Customer permanently deleted from database',
      });
    }

    // Soft delete - set status to Inactive
    const deletedCustomer = await prisma.customer.update({
      where: { id: params.id },
      data: { status: 'Inactive' },
    });

    return NextResponse.json({
      success: true,
      message: 'Customer deactivated successfully (status set to Inactive)',
      data: deletedCustomer,
    });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
