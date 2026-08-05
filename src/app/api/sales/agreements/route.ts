import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requestApproval } from '@/lib/approval-workflow';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const division = searchParams.get('division') || '';
    const customerId = searchParams.get('customerId') || '';
    const includeVoid = searchParams.get('includeVoid') === 'true';
    const getAll = searchParams.get('all') === 'true';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { agreementNo: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      whereClause.status = status;
    } else if (includeVoid === false || searchParams.get('includeVoid') === 'false') {
      // Explicitly exclude Void agreements
      whereClause.status = { not: 'Void' };
    }
    // If includeVoid is true or not specified, show all records including void
    if (division) {
      whereClause.division = division;
    }
    if (customerId) {
      whereClause.customerId = customerId;
    }

    const [data, total] = await Promise.all([
      prisma.salesAgreement.findMany({
        where: whereClause,
        ...(getAll ? {} : { skip, take: limit }),
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.salesAgreement.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: getAll ? { 
        total, 
        returnedAll: true,
        message: 'All records returned without pagination' 
      } : {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales agreements:', error);
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
      customerId,
      division,
      items,
      totalAmount,
      validFrom,
      validTo,
      terms,
      offloadingSite,
      status,
      createdBy,
    } = body;

    if (!customerId || !division || !items || !totalAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: customerId, division, items, totalAmount' },
        { status: 400 }
      );
    }

    // Generate unique agreement number with alphabetic suffix for uniqueness
    const agreement = await prisma.$transaction(async (tx) => {
      // Get the highest existing agreement number
      const lastAgreement = await tx.salesAgreement.findFirst({
        where: {
          agreementNo: {
            startsWith: 'AGR-'
          }
        },
        orderBy: {
          agreementNo: 'desc'
        }
      });
      
      let nextNumber = 1;
      if (lastAgreement?.agreementNo) {
        // Extract number from AGR-0000123 or AGR-0000123A format
        const match = lastAgreement.agreementNo.match(/AGR-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      
      // Generate base agreement number
      let agreementNo = `AGR-${String(nextNumber).padStart(7, '0')}`;
      
      // Check if base number exists, if so add alphabetic suffix
      let suffix = '';
      let attempt = 0;
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      
      while (true) {
        const testAgreementNo = agreementNo + suffix;
        
        // Check if this number exists
        const existing = await tx.salesAgreement.findFirst({
          where: { agreementNo: testAgreementNo }
        });
        
        if (!existing) {
          agreementNo = testAgreementNo;
          break;
        }
        
        // Generate next suffix: A, B, C, ..., Z, AA, AB, etc.
        if (attempt < 26) {
          suffix = letters[attempt];
        } else {
          const firstLetter = Math.floor(attempt / 26) - 1;
          const secondLetter = attempt % 26;
          suffix = letters[firstLetter] + letters[secondLetter];
        }
        
        attempt++;
        
        // Safety limit
        if (attempt > 100) {
          throw new Error('Unable to generate unique agreement number');
        }
      }
      
      // Create the agreement within the transaction
      return await tx.salesAgreement.create({
        data: {
          agreementNo,
          customerId,
          division,
          items: typeof items === 'string' ? items : JSON.stringify(items),
          totalAmount,
          validFrom: typeof validFrom === 'string' && validFrom.match(/^\d{4}-\d{2}-\d{2}$/) 
            ? new Date(validFrom + 'T00:00:00.000Z') 
            : new Date(validFrom),
          validTo: typeof validTo === 'string' && validTo.match(/^\d{4}-\d{2}-\d{2}$/) 
            ? new Date(validTo + 'T23:59:59.999Z') 
            : new Date(validTo),
          terms: terms || null,
          offloadingSite: offloadingSite || null,
          status: 'Draft',
          createdBy: createdBy || null,
        },
        include: { customer: true },
      });
    });

    // Auto-request approval for the new agreement
    try {
      const customerName = agreement.customer?.companyName || 'Unknown';
      await requestApproval({
        module: 'SalesAgreement',
        recordId: agreement.id,
        recordRef: agreementNo,
        amount: Number(totalAmount) || 0,
        description: `Sales Agreement ${agreementNo} — ${Number(totalAmount).toLocaleString('en-US')} ETB for ${customerName}`,
        requesterId: createdBy || '',
      });
    } catch (e) {
      console.error('Approval request failed for Sales Agreement:', e);
    }

    return NextResponse.json(
      { success: true, data: agreement },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating sales agreement:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
