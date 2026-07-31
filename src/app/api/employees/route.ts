import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (department) {
      whereClause.department = department;
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.employee.count({ where: whereClause }),
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
    console.error('Error fetching employees:', error);
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
      firstName,
      lastName,
      middleName,
      firstNameAm,
      lastNameAm,
      gender,
      dateOfBirth,
      email,
      phone,
      address,
      department,
      position,
      hireDate,
      employmentType,
      baseSalary,
      bankAccount,
      bankName,
      tin,
      pensionNo,
      emergencyContact,
      emergencyPhone,
      status,
    } = body;

    if (!firstName || !lastName || !hireDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: firstName, lastName, hireDate' },
        { status: 400 }
      );
    }

    // Generate employee number
    const count = await prisma.employee.count();
    const employeeNo = `EMP-${String(count + 1).padStart(5, '0')}`;

    const employee = await prisma.employee.create({
      data: {
        employeeNo,
        firstName,
        lastName,
        middleName: middleName || null,
        firstNameAm: firstNameAm || null,
        lastNameAm: lastNameAm || null,
        gender: gender || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        department: department || null,
        position: position || null,
        hireDate: new Date(hireDate),
        employmentType: employmentType || 'Permanent',
        baseSalary: baseSalary || 0,
        bankAccount: bankAccount || null,
        bankName: bankName || null,
        tin: tin || null,
        pensionNo: pensionNo || null,
        emergencyContact: emergencyContact || null,
        emergencyPhone: emergencyPhone || null,
        status: status || 'Active',
      },
    });

    return NextResponse.json(
      { success: true, data: employee },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
