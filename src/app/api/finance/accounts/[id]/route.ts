import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const account = await prisma.chartOfAccount.findUnique({
      where: { id: params.id },
    });
    if (!account) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: account });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const account = await prisma.chartOfAccount.update({
      where: { id: params.id },
      data: {
        accountCode: body.accountCode,
        accountName: body.accountName,
        accountType: body.accountType,
        parentId: body.parentId || null,
        isActive: body.isActive,
      },
    });
    return NextResponse.json({ success: true, data: account });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
