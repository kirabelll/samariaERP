import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sales/agreements/customers
 *
 * Returns customers that have an active (non-void, non-cancelled) sales agreement.
 * Groups by customer and returns only the most recent agreement per customer.
 *
 * Query params:
 *   - division: filter by agreement division (e.g., CEMENT, CONSTRUCTION)
 *   - search: search by company name or agreement number
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const division = searchParams.get('division');
    const search = searchParams.get('search');

    // Build where clause: only active, non-void, non-cancelled agreements
    const whereClause: any = {
      status: { notIn: ['Void', 'Cancelled'] },
    };

    if (division) {
      whereClause.division = division;
    }

    if (search) {
      whereClause.OR = [
        { agreementNo: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Fetch all matching agreements with customer data, ordered by most recent first
    const agreements = await prisma.salesAgreement.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            phone: true,
            tin: true,
            withholding: true,
            withholdRate: true,
            creditLimit: true,
            creditTermDays: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by customerId — keep only the most recent agreement per customer
    const customerMap = new Map<string, any>();

    for (const agr of agreements) {
      if (!agr.customerId || !agr.customer) continue;

      // Only keep the first (most recent) agreement per customer
      if (!customerMap.has(agr.customerId)) {
        // Parse items JSON safely
        let items: any[] = [];
        try {
          items = typeof agr.items === 'string' ? JSON.parse(agr.items) : (agr.items as any[] || []);
        } catch {
          items = [];
        }

        customerMap.set(agr.customerId, {
          customerId: agr.customerId,
          companyName: agr.customer.companyName,
          phone: agr.customer.phone,
          tin: agr.customer.tin,
          withholding: agr.customer.withholding,
          withholdRate: agr.customer.withholdRate,
          creditLimit: agr.customer.creditLimit,
          creditTermDays: agr.customer.creditTermDays,
          // Latest agreement info
          agreementId: agr.id,
          agreementNo: agr.agreementNo,
          agreementStatus: agr.status,
          division: agr.division,
          validFrom: agr.validFrom,
          validTo: agr.validTo,
          totalAmount: agr.totalAmount,
          items,
          terms: agr.terms,
        });
      }
    }

    const data = Array.from(customerMap.values());

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
    });
  } catch (error: any) {
    console.error('Error fetching agreement customers:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
