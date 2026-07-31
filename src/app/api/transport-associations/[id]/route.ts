import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const association = await prisma.transportAssociation.findUnique({
      where: { id: params.id },
      include: {
        transporters: {
          select: {
            id: true,
            code: true,
            companyName: true,
            phone: true,
            email: true,
            status: true,
          },
        },
      },
    });

    if (!association) {
      return NextResponse.json(
        { success: false, error: 'Transport association not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: association,
    });
  } catch (error: any) {
    console.error('Error fetching transport association:', error);
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
    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      status,
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const association = await prisma.transportAssociation.update({
      where: { id: params.id },
      data: {
        name,
        contactPerson: contactPerson || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        status: status || 'Active',
      },
    });

    return NextResponse.json({
      success: true,
      data: association,
    });
  } catch (error: any) {
    console.error('Error updating transport association:', error);
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
    // Check if association has transporters
    const association = await prisma.transportAssociation.findUnique({
      where: { id: params.id },
      include: { transporters: { select: { id: true } } },
    });

    if (!association) {
      return NextResponse.json(
        { success: false, error: 'Transport association not found' },
        { status: 404 }
      );
    }

    if (association.transporters.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete association with transporters' },
        { status: 400 }
      );
    }

    await prisma.transportAssociation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Transport association deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting transport association:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
