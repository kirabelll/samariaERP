import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const recovery = await prisma.transporterRecovery.findUnique({
      where: { id },
      include: {
        transporter: true,
      },
    });

    if (!recovery) {
      return NextResponse.json(
        { success: false, error: 'Recovery not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: recovery,
    });
  } catch (error: any) {
    console.error('Error fetching transporter recovery:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const recovery = await prisma.transporterRecovery.update({
      where: { id },
      data: body,
      include: {
        transporter: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: recovery,
    });
  } catch (error: any) {
    console.error('Error updating transporter recovery:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.transporterRecovery.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error: any) {
    console.error('Error deleting transporter recovery:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
