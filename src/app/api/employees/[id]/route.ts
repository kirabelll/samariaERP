import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        attendances: { orderBy: { date: 'desc' }, take: 30 },
        leaves: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (error: any) {
    console.error('Error fetching employee:', error);
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

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: params.id },
      data: {
        firstName: body.firstName || employee.firstName,
        middleName: body.middleName !== undefined ? body.middleName : employee.middleName,
        lastName: body.lastName || employee.lastName,
        firstNameAm: body.firstNameAm !== undefined ? body.firstNameAm : employee.firstNameAm,
        lastNameAm: body.lastNameAm !== undefined ? body.lastNameAm : employee.lastNameAm,
        gender: body.gender !== undefined ? body.gender : employee.gender,
        phone: body.phone !== undefined ? body.phone : employee.phone,
        email: body.email !== undefined ? body.email : employee.email,
        address: body.address !== undefined ? body.address : employee.address,
        department: body.department !== undefined ? body.department : employee.department,
        position: body.position !== undefined ? body.position : employee.position,
        baseSalary: body.baseSalary !== undefined ? body.baseSalary : employee.baseSalary,
        bankAccount: body.bankAccount !== undefined ? body.bankAccount : employee.bankAccount,
        bankName: body.bankName !== undefined ? body.bankName : employee.bankName,
        tin: body.tin !== undefined ? body.tin : employee.tin,
        pensionNo: body.pensionNo !== undefined ? body.pensionNo : employee.pensionNo,
        status: body.status || employee.status,
      },
    });

    return NextResponse.json({ success: true, data: updatedEmployee });
  } catch (error: any) {
    console.error('Error updating employee:', error);
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
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Soft delete - set status to Inactive
    const deletedEmployee = await prisma.employee.update({
      where: { id: params.id },
      data: { status: 'Inactive' },
    });

    return NextResponse.json({ success: true, message: 'Employee deleted successfully', data: deletedEmployee });
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
