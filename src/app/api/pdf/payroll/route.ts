import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePayrollPDF } from '@/lib/pdf-generator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Payroll Period ID required' }, { status: 400 });
    }

    const payrollPeriod = await prisma.payrollPeriod.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: {
          include: {
            employee: { select: { firstName: true, lastName: true, employeeNo: true } },
          },
        },
      },
    });

    if (!payrollPeriod) {
      return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 });
    }

    const pdfBuffer = await generatePayrollPDF(payrollPeriod, payrollPeriod.items);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Payroll-${payrollPeriod.periodName}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating payroll PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
