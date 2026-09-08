import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const division = searchParams.get('division') || '';

    // Fetch all unpaid & partial invoices
    const whereInvoice: any = {
      status: { in: ['Unpaid', 'Partial', 'Overdue'] },
    };
    if (division) {
      whereInvoice.division = division;
    }

    const unpaidInvoices = await prisma.salesInvoice.findMany({
      where: whereInvoice,
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            companyName: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            location: true,
            division: true,
            creditLimit: true,
            creditTermDays: true,
            status: true,
          },
        },
        payments: {
          where: { status: { in: ['Verified', 'Approved', 'Completed'] } },
          select: { amount: true },
        },
      },
      orderBy: { invoiceDate: 'asc' },
    });

    // Group by customer
    const customerMap = new Map<string, any>();
    let grandTotalReceivables = 0;
    const agingSummary = {
      current: 0,   // 0-30 days
      days30: 0,    // 31-60 days
      days60: 0,    // 61-90 days
      days90Plus: 0 // 90+ days
    };

    const now = Date.now();

    for (const inv of unpaidInvoices) {
      const cust = inv.customer;
      if (!cust) continue;

      const totalPaid = (inv.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const remainingAmount = Math.max(0, (inv.totalAmount || 0) - totalPaid);
      if (remainingAmount <= 0) continue;

      grandTotalReceivables += remainingAmount;

      const invDate = new Date(inv.invoiceDate);
      const ageDays = Math.max(0, Math.floor((now - invDate.getTime()) / (1000 * 60 * 60 * 24)));
      let ageBracket = '0-30 days';
      if (ageDays > 90) {
        ageBracket = '90+ days';
        agingSummary.days90Plus += remainingAmount;
      } else if (ageDays > 60) {
        ageBracket = '61-90 days';
        agingSummary.days60 += remainingAmount;
      } else if (ageDays > 30) {
        ageBracket = '31-60 days';
        agingSummary.days30 += remainingAmount;
      } else {
        agingSummary.current += remainingAmount;
      }

      const cleanCode = (cust.code || cust.id.slice(-6)).toUpperCase();
      const accountCode = `1030-${cleanCode}`;
      const name = cust.companyName || `${cust.firstName || ''} ${cust.lastName || ''}`.trim() || cleanCode;
      const accountName = `AR - ${name}`;

      if (!customerMap.has(cust.id)) {
        customerMap.set(cust.id, {
          customerId: cust.id,
          customerCode: cust.code || 'N/A',
          companyName: name,
          accountCode,
          accountName,
          phone: cust.phone,
          email: cust.email,
          location: cust.location,
          division: cust.division,
          creditLimit: cust.creditLimit || 0,
          creditTermDays: cust.creditTermDays || 0,
          status: cust.status,
          totalOutstanding: 0,
          invoiceCount: 0,
          oldestAgeDays: 0,
          oldestInvoiceDate: inv.invoiceDate,
          invoices: [],
        });
      }

      const cData = customerMap.get(cust.id)!;
      cData.totalOutstanding += remainingAmount;
      cData.invoiceCount += 1;
      if (ageDays > cData.oldestAgeDays) {
        cData.oldestAgeDays = ageDays;
        cData.oldestInvoiceDate = inv.invoiceDate;
      }

      cData.invoices.push({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        division: inv.division,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        totalAmount: inv.totalAmount,
        paidAmount: totalPaid,
        balanceDue: remainingAmount,
        status: inv.status,
        ageDays,
        ageBracket,
      });
    }

    let customers = Array.from(customerMap.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    if (search) {
      const q = search.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.companyName.toLowerCase().includes(q) ||
          c.customerCode.toLowerCase().includes(q) ||
          c.accountCode.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          c.invoices.some((inv: any) => inv.invoiceNo.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        totalReceivables: grandTotalReceivables,
        customerCount: customerMap.size,
        totalInvoices: unpaidInvoices.length,
        agingSummary,
        customers,
      },
    });
  } catch (error: any) {
    console.error('Error fetching receivables breakdown:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
