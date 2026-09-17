import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.payrollPeriod.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error('Error fetching record:', error);
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

    // Strip non-updatable and relation fields
    const { id: _id, createdAt: _ca, items: _items, ...updateData } = body;

    const record = await prisma.payrollPeriod.findUnique({
      where: { id: params.id },
      include: { items: true },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    const updatedRecord = await prisma.payrollPeriod.update({
      where: { id: params.id },
      data: updateData,
    });

    // Auto-create journal entries if status changed to "Approved"
    if (updateData.status === 'Approved' && record.status !== 'Approved') {
      try {
        // Find accounts
        const salaryExpenseAccount = await prisma.chartOfAccount.findFirst({
          where: {
            OR: [
              { accountName: { contains: 'Salary', mode: 'insensitive' } },
              { accountCode: '5010' },
            ],
          },
        });

        const cashBankAccount = await prisma.chartOfAccount.findFirst({
          where: {
            accountName: { contains: 'Cash', mode: 'insensitive' },
          },
        });

        const taxPayableAccount = await prisma.chartOfAccount.findFirst({
          where: {
            accountName: { contains: 'Tax Payable', mode: 'insensitive' },
          },
        });

        const pensionPayableAccount = await prisma.chartOfAccount.findFirst({
          where: {
            accountName: { contains: 'Pension Payable', mode: 'insensitive' },
          },
        });

        if (!salaryExpenseAccount || !cashBankAccount || !taxPayableAccount || !pensionPayableAccount) {
          console.warn('Missing required chart of accounts for payroll journal posting');
        } else {
          // Calculate totals from payroll items
          let totalGrossSalary = 0;
          let totalNetSalary = 0;
          let totalIncomeTax = 0;
          let totalPension = 0;

          for (const item of record.items) {
            totalGrossSalary += item.grossSalary;
            totalNetSalary += item.netSalary;
            totalIncomeTax += item.incomeTax;
            totalPension += item.pensionEmployee + item.pensionEmployer;
          }

          const voucherNo = `PAYROLL-${record.periodName}-${Date.now()}`;

          // 1. Debit Salary Expense
          await prisma.journalEntry.create({
            data: {
              voucherNo,
              accountId: salaryExpenseAccount.id,
              debit: totalGrossSalary,
              credit: 0,
              description: `Salary expense for period ${record.periodName}`,
              refModule: 'PAYROLL',
              refId: record.id,
              entryDate: new Date(),
            },
          });

          // 2. Credit Cash/Bank for net salary
          await prisma.journalEntry.create({
            data: {
              voucherNo,
              accountId: cashBankAccount.id,
              debit: 0,
              credit: totalNetSalary,
              description: `Net salary payment for period ${record.periodName}`,
              refModule: 'PAYROLL',
              refId: record.id,
              entryDate: new Date(),
            },
          });

          // 3. Credit Tax Payable
          await prisma.journalEntry.create({
            data: {
              voucherNo,
              accountId: taxPayableAccount.id,
              debit: 0,
              credit: totalIncomeTax,
              description: `Income tax payable for period ${record.periodName}`,
              refModule: 'PAYROLL',
              refId: record.id,
              entryDate: new Date(),
            },
          });

          // 4. Credit Pension Payable
          await prisma.journalEntry.create({
            data: {
              voucherNo,
              accountId: pensionPayableAccount.id,
              debit: 0,
              credit: totalPension,
              description: `Pension contribution payable for period ${record.periodName}`,
              refModule: 'PAYROLL',
              refId: record.id,
              entryDate: new Date(),
            },
          });
        }
      } catch (journalError: any) {
        console.error('Error creating payroll journal entries:', journalError);
        // Don't fail the payroll approval if journal posting fails, just log it
      }
    }

    return NextResponse.json({ success: true, data: updatedRecord });
  } catch (error: any) {
    console.error('Error updating record:', error);
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
    const record = await prisma.payrollPeriod.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // Soft delete - set status to Inactive/Cancelled
    const deletedRecord = await prisma.payrollPeriod.update({
      where: { id: params.id },
      data: { status: 'Inactive' },
    });

    return NextResponse.json({ success: true, message: 'Record deleted successfully', data: deletedRecord });
  } catch (error: any) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
