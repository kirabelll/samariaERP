import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exceptionLog = await prisma.exceptionLog.findUnique({
      where: { id: params.id },
    });

    if (!exceptionLog) {
      return NextResponse.json(
        { success: false, error: 'Exception log not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: exceptionLog,
    });
  } catch (error: any) {
    console.error('Error fetching exception log:', error);
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
    const exceptionLog = await prisma.exceptionLog.findUnique({
      where: { id: params.id },
    });

    if (!exceptionLog) {
      return NextResponse.json(
        { success: false, error: 'Exception log not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    // Strip id, createdAt, updatedAt
    const { id, createdAt, updatedAt, ...updateData } = body;

    const updatedExceptionLog = await prisma.exceptionLog.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedExceptionLog,
    });
  } catch (error: any) {
    console.error('Error updating exception log:', error);
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
    const exceptionLog = await prisma.exceptionLog.findUnique({
      where: { id: params.id },
    });

    if (!exceptionLog) {
      return NextResponse.json(
        { success: false, error: 'Exception log not found' },
        { status: 404 }
      );
    }

    const deletedExceptionLog = await prisma.exceptionLog.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      data: deletedExceptionLog,
    });
  } catch (error: any) {
    console.error('Error deleting exception log:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
