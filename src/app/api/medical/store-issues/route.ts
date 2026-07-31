import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const customerId = searchParams.get('customerId');
    const requestId = searchParams.get('requestId');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (customerId) {
      whereClause.customerId = customerId;
    }
    if (requestId) {
      whereClause.requestId = requestId;
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.medicalStoreIssue.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          customer: {
            select: {
              companyName: true,
              code: true,
              licenseNo: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.medicalStoreIssue.count({ where: whereClause }),
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
    console.error('Error fetching medical store issues:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, requestId, items: itemsStr, issuedBy, deliveryMethod, receiverName, receiverPhone, signedProof, notes } = body;

    // Validate required fields
    if (!customerId || !itemsStr) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Parse items if it's a string
    let items = itemsStr;
    if (typeof itemsStr === 'string') {
      try {
        items = JSON.parse(itemsStr);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid items JSON' },
          { status: 400 }
        );
      }
    }

    // Auto-generate issueNo: ISS-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.medicalStoreIssue.count();
    const sequence = String(count + 1).padStart(4, '0');
    const issueNo = `ISS-${dateStr}-${sequence}`;

    // Calculate totalAmount from items
    let totalAmount = 0;
    if (Array.isArray(items)) {
      totalAmount = items.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
    }

    // Validate batch availability using FEFO before creating store issue
    if (Array.isArray(items)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const item of items) {
        const { itemId, qty } = item;
        if (!itemId || !qty) continue;

        // Get valid batches (not expired, status = Available) ordered by expiryDate (FEFO)
        const validBatches = await prisma.medicalBatch.findMany({
          where: {
            itemId,
            status: 'Available',
            expiryDate: {
              gte: today, // Not expired
            },
          },
          orderBy: {
            expiryDate: 'asc',
          },
        });

        // Calculate total available quantity from valid batches
        const totalAvailable = validBatches.reduce((sum: number, batch: any) => sum + batch.quantity, 0);
        if (totalAvailable < qty) {
          return NextResponse.json(
            {
              success: false,
              error: `Insufficient quantity for item ${itemId}. Required: ${qty}, Available: ${totalAvailable}`,
            },
            { status: 400 }
          );
        }
      }
    }

    const storeIssue = await prisma.medicalStoreIssue.create({
      data: {
        issueNo,
        customerId,
        requestId: requestId || null,
        items: typeof items === 'string' ? items : JSON.stringify(items),
        totalAmount,
        issuedBy: issuedBy || null,
        deliveryMethod: deliveryMethod || null,
        receiverName: receiverName || null,
        receiverPhone: receiverPhone || null,
        signedProof: signedProof || null,
        notes: notes || null,
      },
    });

    // Update MedicalBatch quantities using FEFO (First Expiry First Out)
    // Skip expired batches and those with status != 'Available'
    if (Array.isArray(items)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const item of items) {
        const { itemId, qty } = item;
        if (!itemId || !qty) continue;

        // Get valid batches (not expired, status = Available) ordered by expiryDate (FEFO)
        const validBatches = await prisma.medicalBatch.findMany({
          where: {
            itemId,
            status: 'Available',
            expiryDate: {
              gte: today, // Not expired
            },
          },
          orderBy: {
            expiryDate: 'asc',
          },
        });

        let remainingQty = qty;
        for (const batch of validBatches) {
          if (remainingQty <= 0) break;

          const deductQty = Math.min(batch.quantity, remainingQty);
          const newQuantity = batch.quantity - deductQty;

          // Set status to 'Depleted' if quantity reaches 0, otherwise 'Reserved'
          const newStatus = newQuantity === 0 ? 'Depleted' : 'Reserved';

          await prisma.medicalBatch.update({
            where: { id: batch.id },
            data: {
              quantity: newQuantity,
              status: newStatus,
            },
          });

          remainingQty -= deductQty;
        }
      }
    }

    // Auto-generate SalesInvoice
    try {
      // Parse items from storeIssue
      const invoiceItems = typeof storeIssue.items === 'string' ? JSON.parse(storeIssue.items) : storeIssue.items;

      // Get customer details
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new Error(`Customer ${customerId} not found`);
      }

      // Generate invoiceNo: INV-YYYYMMDD-XXXX
      const invoiceDate = new Date();
      const invDateStr = invoiceDate.toISOString().slice(0, 10).replace(/-/g, '');
      const invCount = await prisma.salesInvoice.count();
      const invSequence = String(invCount + 1).padStart(4, '0');
      const invoiceNo = `INV-${invDateStr}-${invSequence}`;

      // Calculate VAT (15%)
      const subtotal = totalAmount;
      const vatAmount = subtotal * 0.15;
      const invoiceTotalAmount = subtotal + vatAmount;

      // Create SalesInvoice
      await prisma.salesInvoice.create({
        data: {
          invoiceNo,
          customerId,
          division: 'MEDICAL',
          items: typeof invoiceItems === 'string' ? invoiceItems : JSON.stringify(invoiceItems),
          subtotal,
          vatRate: 15,
          vatAmount,
          totalAmount: invoiceTotalAmount,
          status: 'Draft',
        },
      });
    } catch (invoiceError: any) {
      console.error('Error creating sales invoice:', invoiceError);
      // Log but don't fail the store issue creation
    }

    return NextResponse.json({
      success: true,
      data: storeIssue,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating medical store issue:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
