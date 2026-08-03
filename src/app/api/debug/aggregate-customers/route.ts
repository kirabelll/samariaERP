import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get all customers
    const allCustomers = await prisma.customer.findMany({
      select: {
        id: true,
        companyName: true,
      },
      orderBy: { companyName: 'asc' },
    });

    // Get all sales agreements for AGGREGATE division
    const aggregateAgreements = await prisma.salesAgreement.findMany({
      where: {
        division: 'AGGREGATE',
      },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get unique customers from AGGREGATE agreements (for comparison)
    const aggregateCustomerMap = new Map();
    aggregateAgreements.forEach(agr => {
      if (agr.customer && !aggregateCustomerMap.has(agr.customerId)) {
        aggregateCustomerMap.set(agr.customerId, {
          customerId: agr.customerId,
          companyName: agr.customer.companyName,
          agreementNo: agr.agreementNo,
          status: agr.status,
          totalAmount: agr.totalAmount,
        });
      }
    });

    const uniqueAggregateCustomers = Array.from(aggregateCustomerMap.values());
    
    // Get ALL customer-agreement combinations (what the API now returns)
    const allAggregateCustomers = aggregateAgreements
      .filter(agr => agr.customer)
      .map(agr => ({
        customerId: agr.customerId,
        companyName: agr.customer!.companyName,
        agreementNo: agr.agreementNo,
        status: agr.status,
        totalAmount: agr.totalAmount,
      }));

    return NextResponse.json({
      success: true,
      debug: {
        totalCustomers: allCustomers.length,
        totalAggregateAgreements: aggregateAgreements.length,
        uniqueAggregateCustomers: uniqueAggregateCustomers.length,
        allAggregateCustomersEntries: allAggregateCustomers.length, // NEW: All customer-agreement combinations
        allCustomers: allCustomers.slice(0, 10), // First 10
        aggregateAgreements: aggregateAgreements.map(a => ({
          id: a.id,
          agreementNo: a.agreementNo,
          status: a.status,
          division: a.division,
          customerId: a.customerId,
          customerName: a.customer?.companyName,
        })),
        uniqueAggregateCustomers: uniqueAggregateCustomers,
        allAggregateCustomers: allAggregateCustomers, // NEW: All combinations
      },
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}