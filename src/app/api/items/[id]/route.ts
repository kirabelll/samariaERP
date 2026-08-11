import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await prisma.item.findUnique({
      where: { id: params.id },
      include: {
        stockBalances: true,
        medicalBatches: item => ({ orderBy: { expiryDate: 'asc' } }),
      },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Error fetching item:', error);
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

    const item = await prisma.item.findUnique({
      where: { id: params.id },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    const updatedItem = await prisma.item.update({
      where: { id: params.id },
      data: {
        name: body.name || item.name,
        nameAmharic: body.nameAmharic !== undefined ? body.nameAmharic : item.nameAmharic,
        category: body.category || item.category,
        unit: body.unit || item.unit,
        itemType: body.itemType || item.itemType,
        division: body.division || item.division,
        batchTracked: body.batchTracked !== undefined ? body.batchTracked : item.batchTracked,
        expiryTracked: body.expiryTracked !== undefined ? body.expiryTracked : item.expiryTracked,
        manufacturer: body.manufacturer !== undefined ? body.manufacturer : item.manufacturer,
        genericName: body.genericName !== undefined ? body.genericName : item.genericName,
        strength: body.strength !== undefined ? body.strength : item.strength,
        dosageForm: body.dosageForm !== undefined ? body.dosageForm : item.dosageForm,
        status: body.status || item.status,
      },
    });

    return NextResponse.json({ success: true, data: updatedItem });
  } catch (error: any) {
    console.error('Error updating item:', error);
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

    const item = await prisma.item.findUnique({
      where: { id: params.id },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    if (isPermanent) {
      await prisma.item.delete({
        where: { id: params.id },
      });
      return NextResponse.json({ success: true, message: 'Item permanently deleted' });
    }

    // Soft delete - set status to Inactive
    const deletedItem = await prisma.item.update({
      where: { id: params.id },
      data: { status: 'Inactive' },
    });

    return NextResponse.json({ success: true, message: 'Item deleted successfully', data: deletedItem });
  } catch (error: any) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
