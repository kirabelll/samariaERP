import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { symbol: { contains: search, mode: 'insensitive' } },
      ];
    }

    const units = await prisma.unit.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: units,
    });
  } catch (error: any) {
    console.error('Error fetching units:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, symbol } = body;

    if (!name || !symbol) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, symbol' },
        { status: 400 }
      );
    }

    const existing = await prisma.unit.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Unit name already exists' },
        { status: 400 }
      );
    }

    const unit = await prisma.unit.create({
      data: {
        name,
        symbol,
      },
    });

    return NextResponse.json(
      { success: true, data: unit },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating unit:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
