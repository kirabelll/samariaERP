import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';
import { requestApproval } from '@/lib/approval-workflow';
import { calculatePayrollRow } from '@/lib/ethiopian-tax';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || '0');

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.periodName = { contains: search, mode: 'insensitive' };
    }
    if (status) {
      whereClause.status = status;
    }
    if (month > 0) {
      whereClause.month = month;
    }
    if (year > 0) {
      whereClause.year = year;
    }

    const [data, total] = await Promise.all([
      prisma.payrollPeriod.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { items: { include: { employee: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payrollPeriod.count({ where: whereClause }),
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
    console.error('Error fetching payroll periods:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, year, status, items } = body;

    const parsedMonth = parseInt(String(month));
    const parsedYear = parseInt(String(year));

    if (!parsedMonth || !parsedYear || isNaN(parsedMonth) || isNaN(parsedYear)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: valid month (1-12) and year' },
        { status: 400 }
      );
    }

    const periodName = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}`;

    const existing = await prisma.payrollPeriod.findUnique({
      where: { periodName },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Payroll period ${periodName} already exists` },
        { status: 400 }
      );
    }

    // Determine payroll items to create
    let itemsToCreate: any[] = [];

    if (Array.isArray(items) && items.length > 0) {
      itemsToCreate = items.map((item: any) => ({
        employeeId: item.employeeId,
        baseSalary: Number(item.baseSalary || 0),
        workingDays: Number(item.workingDays || 30),
        absentDays: Number(item.absentDays || 0),
        overtimeHours: Number(item.overtimeHours || 0),
        overtimePay: Number(item.overtimePay || 0),
        allowances: Number(item.allowances || 0),
        grossSalary: Number(item.grossSalary || (item.baseSalary || 0) + (item.allowances || 0)),
        pensionEmployee: Number(item.pensionEmployee || 0),
        pensionEmployer: Number(item.pensionEmployer || 0),
        incomeTax: Number(item.incomeTax || 0),
        otherDeductions: Number(item.otherDeductions || 0),
        advanceDeduction: Number(item.advanceDeduction || 0),
        totalDeductions: Number(item.totalDeductions || 0),
        netSalary: Number(item.netSalary || 0),
      }));
    } else {
      // Auto-fetch active employees and calculate
      const employees = await prisma.employee.findMany({
        where: { status: 'Active' },
      });

      itemsToCreate = employees.map((emp) => {
        const calc = calculatePayrollRow({
          employeeId: emp.id,
          employeeNo: emp.employeeNo,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department || '',
          position: emp.position || '',
          baseSalary: emp.baseSalary || 0,
        });

        return {
          employeeId: emp.id,
          baseSalary: calc.baseSalary,
          workingDays: 30,
          absentDays: 0,
          overtimeHours: 0,
          overtimePay: 0,
          allowances: calc.allowances,
          grossSalary: calc.grossSalary,
          pensionEmployee: calc.pensionEmployee,
          pensionEmployer: calc.pensionEmployer,
          incomeTax: calc.incomeTax,
          otherDeductions: calc.otherDeductions,
          advanceDeduction: calc.advanceDeduction,
          totalDeductions: calc.totalDeductions,
          netSalary: calc.netSalary,
        };
      });
    }

    const payrollPeriod = await prisma.payrollPeriod.create({
      data: {
        periodName,
        month: parsedMonth,
        year: parsedYear,
        status: status || 'Draft',
        items: itemsToCreate.length > 0 ? {
          create: itemsToCreate,
        } : undefined,
      },
      include: {
        items: {
          include: {
            employee: true,
          },
        },
      },
    });

    const totalNet = payrollPeriod.items.reduce((sum, item) => sum + (item.netSalary || 0), 0);

    notify({
      module: 'HR',
      event: 'payroll_processed',
      details: {
        periodName: payrollPeriod.periodName,
        employeeCount: payrollPeriod.items.length,
        totalNet,
      },
    });

    // Auto-submit for approval
    try {
      await requestApproval({
        module: 'PayrollPeriod',
        recordId: payrollPeriod.id,
        recordRef: payrollPeriod.periodName,
        amount: totalNet,
        description: `Payroll Period ${payrollPeriod.periodName} (${payrollPeriod.items.length} employees, Total Net: ${totalNet.toLocaleString()} ETB) — Ready for approval`,
        requesterId: body.createdBy || '',
      });
    } catch (e) {
      console.error('Approval request failed for payroll:', e);
    }

    return NextResponse.json(
      { success: true, data: payrollPeriod },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating payroll period:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
