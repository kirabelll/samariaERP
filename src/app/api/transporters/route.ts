import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.transporter.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { trucks: { take: 50 } },
      }),
      prisma.transporter.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching transporters:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyName,
      transporterType,
      firstName,
      lastName,
      tin,
      phone,
      email,
      contactPerson,
      driverName,
      location,
      associationId,
      status,
      withholding,
      withholdRate,
      trucks,
    } = body;

    if (!companyName || !phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: companyName, phone' },
        { status: 400 }
      );
    }

    if (!trucks || !Array.isArray(trucks) || trucks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one truck is required' },
        { status: 400 }
      );
    }

    // Check duplicate plate numbers within submission
    const plateNumbers = trucks
      .map((t: any) => (t.plateNo ? String(t.plateNo).trim() : ''))
      .filter(Boolean);

    const dupInInput = plateNumbers.filter(
      (item, index) => plateNumbers.indexOf(item) !== index
    );
    if (dupInInput.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Duplicate plate numbers in submission: ${Array.from(new Set(dupInInput)).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Check if plate numbers already exist in database
    const existingTrucks = await prisma.truck.findMany({
      where: { plateNo: { in: plateNumbers, mode: 'insensitive' } },
      select: { plateNo: true },
    });

    if (existingTrucks.length > 0) {
      const existingPlates = existingTrucks.map((t) => t.plateNo).join(', ');
      return NextResponse.json(
        {
          success: false,
          error: `Truck(s) with plate number(s) [${existingPlates}] already exist in the database.`,
        },
        { status: 400 }
      );
    }

    // Create transporter and trucks in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.transporter.count();
      let nextSeq = count + 1;
      let code = generateCode('TRA', nextSeq);

      // Guarantee code uniqueness
      while (await tx.transporter.findUnique({ where: { code } })) {
        nextSeq++;
        code = generateCode('TRA', nextSeq);
      }

      const transporter = await tx.transporter.create({
        data: {
          code,
          companyName,
          transporterType: transporterType || 'company',
          firstName: firstName || null,
          lastName: lastName || null,
          tin: tin || null,
          phone,
          email: email || null,
          contactPerson: contactPerson || null,
          driverName: driverName || null,
          location: location || null,
          associationId: associationId || null,
          status: status || 'Active',
          withholding: withholding || false,
          withholdRate: withholdRate || 2,
        },
      });

      // Create truck records linked to the transporter
      const createdTrucks = await Promise.all(
        trucks.map((truck: any) =>
          tx.truck.create({
            data: {
              plateNo: String(truck.plateNo).trim(),
              transporterId: transporter.id,
              truckType: truck.truckType || null,
              capacity:
                truck.capacity !== null && truck.capacity !== undefined && !isNaN(Number(truck.capacity))
                  ? Number(truck.capacity)
                  : null,
              capacityUnit: truck.capacityUnit || null,
              driverName: truck.driverName || null,
              ownerName: truck.ownerName || null,
              ownerPhone: truck.ownerPhone || null,
              ownerTin: truck.ownerTin || null,
              status: 'Active',
            },
          })
        )
      );

      return { transporter, trucks: createdTrucks };
    });

    return NextResponse.json(
      { success: true, data: result },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating transporter:', error);
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      const targetField = Array.isArray(target) ? target.join(', ') : target || 'field';
      return NextResponse.json(
        { success: false, error: `A record with this ${targetField} already exists.` },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create transporter' },
      { status: 500 }
    );
  }
}
