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
        firstName: body.firstName ? body.firstName.trim() : employee.firstName,
        middleName: body.middleName !== undefined ? (body.middleName ? body.middleName.trim() : null) : employee.middleName,
        lastName: body.lastName ? body.lastName.trim() : employee.lastName,
        firstNameAm: body.firstNameAm !== undefined ? (body.firstNameAm ? body.firstNameAm.trim() : null) : employee.firstNameAm,
        lastNameAm: body.lastNameAm !== undefined ? (body.lastNameAm ? body.lastNameAm.trim() : null) : employee.lastNameAm,
        gender: body.gender !== undefined ? (body.gender ? body.gender.trim() : null) : employee.gender,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : (body.dateOfBirth === null || body.dateOfBirth === '' ? null : employee.dateOfBirth),
        phone: body.phone !== undefined ? (body.phone ? body.phone.trim() : null) : employee.phone,
        email: body.email !== undefined ? (body.email ? body.email.trim() : null) : employee.email,
        address: body.address !== undefined ? (body.address ? body.address.trim() : null) : employee.address,
        department: body.department !== undefined ? (body.department ? body.department.trim() : null) : employee.department,
        position: body.position !== undefined ? (body.position ? body.position.trim() : null) : employee.position,
        employmentType: body.employmentType !== undefined ? body.employmentType : employee.employmentType,
        hireDate: body.hireDate ? new Date(body.hireDate) : employee.hireDate,
        baseSalary: body.baseSalary !== undefined ? Number(body.baseSalary) : (body.salary !== undefined ? Number(body.salary) : employee.baseSalary),
        fieldAllowance: body.fieldAllowance !== undefined ? Number(body.fieldAllowance) : ((employee as any).fieldAllowance ?? 0),
        isFieldAllowanceTaxable: body.isFieldAllowanceTaxable !== undefined ? Boolean(body.isFieldAllowanceTaxable) : ((employee as any).isFieldAllowanceTaxable ?? false),
        taxableAllowance: body.taxableAllowance !== undefined ? Number(body.taxableAllowance) : ((employee as any).taxableAllowance ?? 0),
        nonTaxableAllowance: body.nonTaxableAllowance !== undefined ? Number(body.nonTaxableAllowance) : ((employee as any).nonTaxableAllowance ?? 0),
        allowances: body.allowances !== undefined ? Number(body.allowances) : ((employee as any).allowances ?? 0),
        bankAccount: body.bankAccount !== undefined ? (body.bankAccount ? body.bankAccount.trim() : null) : employee.bankAccount,
        bankName: body.bankName !== undefined ? (body.bankName ? body.bankName.trim() : null) : employee.bankName,
        tin: body.tin !== undefined ? (body.tin ? body.tin.trim() : null) : employee.tin,
        pensionNo: body.pensionNo !== undefined ? (body.pensionNo ? body.pensionNo.trim() : null) : employee.pensionNo,
        emergencyContact: body.emergencyContact !== undefined ? (body.emergencyContact ? body.emergencyContact.trim() : null) : employee.emergencyContact,
        emergencyPhone: body.emergencyPhone !== undefined ? (body.emergencyPhone ? body.emergencyPhone.trim() : null) : employee.emergencyPhone,
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

    // Clean up associated records in transaction then delete employee
    try {
      await prisma.$transaction([
        prisma.attendance.deleteMany({ where: { employeeId: params.id } }),
        prisma.leaveRequest.deleteMany({ where: { employeeId: params.id } }),
        prisma.employeeAdvance.deleteMany({ where: { employeeId: params.id } }),
        prisma.employee.delete({ where: { id: params.id } }),
      ]);
      return NextResponse.json({ success: true, message: 'Employee deleted successfully' });
    } catch (fkError: any) {
      // If linked payroll records or foreign keys prevent hard delete, mark inactive
      const softDeleted = await prisma.employee.update({
        where: { id: params.id },
        data: { status: 'Inactive' },
      });
      return NextResponse.json({
        success: true,
        message: 'Employee has historical payroll records and was set to Inactive',
        data: softDeleted,
      });
    }
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
