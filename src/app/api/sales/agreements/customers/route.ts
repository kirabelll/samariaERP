import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sales/agreements/customers
 *
 * Returns ALL customer-agreement combinations for the specified filters.
 * Does NOT group by customer - returns all matching agreements.
 *
 * Query params:
 *   - division: filter by agreement division (e.g., CEMENT, CONSTRUCTION, AGGREGATE)
 *   - search: search by company name or agreement number
 *   - status: filter by specific agreement status (Active, Draft, etc.)
 *   - includeAll: if true, includes ALL agreements regardless of status (including Void, Cancelled)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const division = searchParams.get('division');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const includeAll = searchParams.get('includeAll') === 'true'; // Show all statuses including void

    // Build where clause
    const whereClause: any = {};

    // Handle status filtering
    if (includeAll) {
      // Show ALL agreements regardless of status when includeAll=true
      // No status filter applied
    } else if (status) {
      // Filter by specific status when provided
      whereClause.status = status;
    } else {
      // Default: exclude Void, Cancelled, and Deactivated
      whereClause.status = { notIn: ['Void', 'Cancelled', 'Deactivated'] };
    }

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

    // Collect all itemIds from all agreements to fetch item names in a single batch
    const allItemIds = new Set<string>();
    agreements.forEach(agr => {
      try {
        const parsed = typeof agr.items === 'string' ? JSON.parse(agr.items) : (agr.items || []);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            const targetId = item.itemId || item.id;
            if (targetId) allItemIds.add(targetId);
          });
        }
      } catch {}
    });

    const itemRecords = allItemIds.size > 0
      ? await prisma.item.findMany({
          where: { id: { in: Array.from(allItemIds) } },
          select: { id: true, name: true, code: true, unit: true, category: true },
        })
      : [];

    const dbItemMap = new Map(itemRecords.map(i => [i.id, i]));

    // Transform all agreements to customer format with enriched item names
    const customerData = agreements
      .filter(agr => agr.customerId && agr.customer)
      .map(agr => {
        // Parse items JSON safely
        let rawItems: any[] = [];
        try {
          rawItems = typeof agr.items === 'string' ? JSON.parse(agr.items) : (agr.items as any[] || []);
        } catch {
          rawItems = [];
        }

        const items = rawItems.map((ai: any) => {
          const targetId = ai.itemId || ai.id;
          const dbItem = dbItemMap.get(targetId);
          return {
            ...ai,
            itemId: targetId,
            itemName: dbItem?.name || ai.itemName || ai.name || ai.description || targetId,
            itemCode: dbItem?.code || ai.itemCode || '',
            unit: dbItem?.unit || ai.unit || 'm3',
          };
        });

        return {
          customerId: agr.customerId,
          companyName: agr.customer!.companyName,
          phone: agr.customer!.phone,
          tin: agr.customer!.tin,
          withholding: agr.customer!.withholding,
          withholdRate: agr.customer!.withholdRate,
          creditLimit: agr.customer!.creditLimit,
          creditTermDays: agr.customer!.creditTermDays,
          // Agreement info
          agreementId: agr.id,
          agreementNo: agr.agreementNo,
          agreementStatus: agr.status,
          division: agr.division,
          validFrom: agr.validFrom,
          validTo: agr.validTo,
          totalAmount: agr.totalAmount,
          items,
          terms: agr.terms,
        };
      });

    return NextResponse.json({
      success: true,
      data: customerData,
      total: customerData.length,
    });
  } catch (error: any) {
    console.error('Error fetching agreement customers:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
