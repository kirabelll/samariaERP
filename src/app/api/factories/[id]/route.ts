import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const factory = await prisma.factory.findUnique({
      where: { id: params.id },
    });

    if (!factory) {
      return NextResponse.json(
        { success: false, error: 'Factory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: factory });
  } catch (error: any) {
    console.error('Error fetching factory:', error);
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

    const factory = await prisma.factory.findUnique({
      where: { id: params.id },
    });

    if (!factory) {
      return NextResponse.json(
        { success: false, error: 'Factory not found' },
        { status: 404 }
      );
    }

    const updatedFactory = await prisma.factory.update({
      where: { id: params.id },
      data: {
        name: body.name || factory.name,
        factoryType: body.factoryType || factory.factoryType,
        suppliedMaterial: body.suppliedMaterial !== undefined ? body.suppliedMaterial : factory.suppliedMaterial,
        location: body.location !== undefined ? body.location : factory.location,
        phone: body.phone !== undefined ? body.phone : factory.phone,
        contactPerson: body.contactPerson !== undefined ? body.contactPerson : factory.contactPerson,
        useCoupons: body.useCoupons !== undefined ? body.useCoupons : factory.useCoupons,
        weighbridgeReq: body.weighbridgeReq !== undefined ? body.weighbridgeReq : factory.weighbridgeReq,
        terms: body.terms !== undefined ? body.terms : factory.terms,
        status: body.status || factory.status,
      },
    });

    return NextResponse.json({ success: true, data: updatedFactory });
  } catch (error: any) {
    console.error('Error updating factory:', error);
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
    const factory = await prisma.factory.findUnique({
      where: { id: params.id },
    });

    if (!factory) {
      return NextResponse.json(
        { success: false, error: 'Factory not found' },
        { status: 404 }
      );
    }

    // Soft delete - set status to Inactive
    const deletedFactory = await prisma.factory.update({
      where: { id: params.id },
      data: { status: 'Inactive' },
    });

    return NextResponse.json({ success: true, message: 'Factory deleted successfully', data: deletedFactory });
  } catch (error: any) {
    console.error('Error deleting factory:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
