import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const division = searchParams.get('division') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { orderNo: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      whereClause.status = status;
    }
    if (division) {
      whereClause.division = division;
    }

    const [data, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { customer: true, proforma: true },
        orderBy: { orderDate: 'desc' },
      }),
      prisma.salesOrder.count({ where: whereClause }),
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
    console.error('Error fetching sales orders:', error);
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
      proformaId,
      division,
      items,
      totalAmount,
      status,
      createdBy,
    } = body;

    if (!customerId || !items || !totalAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: customerId, items, totalAmount' },
        { status: 400 }
      );
    }

    // Validate division against Prisma enum
    const validDivisions = ['CONSTRUCTION', 'MEDICAL', 'CEMENT', 'AGGREGATE', 'GENERAL', 'BOTH'];
    const safeDivision = validDivisions.includes(division) ? division : 'CONSTRUCTION';

    // Generate order number
    const count = await prisma.salesOrder.count();
    const orderNo = `ORD-${String(count + 1).padStart(7, '0')}`;

    const order = await prisma.salesOrder.create({
      data: {
        orderNo,
        customerId,
        proformaId: proformaId || null,
        division: safeDivision,
        items: JSON.stringify(items),
        totalAmount,
        status: status || 'Pending',
        createdBy: createdBy || null,
      },
      include: { customer: true, proforma: true },
    });

    // Deduct stock balance for ordered items
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    if (Array.isArray(parsedItems)) {
      const warehouse = safeDivision === 'MEDICAL' ? 'medical_store' : 'main';
      for (const item of parsedItems) {
        const orderedQty = Number(item.qty || item.quantity || 0);
        if (orderedQty <= 0) continue;

        let itemId = item.itemId || item.id;
        if (!itemId || typeof itemId !== 'string' || itemId.startsWith('temp-')) {
          const searchName = item.item || item.name || item.itemName;
          const searchCode = item.code || item.itemCode;
          if (searchName || searchCode) {
            const match = await prisma.item.findFirst({
              where: {
                OR: [
                  ...(searchCode ? [{ code: { equals: searchCode, mode: 'insensitive' as const } }] : []),
                  ...(searchName ? [{ name: { equals: searchName, mode: 'insensitive' as const } }] : []),
                ],
              },
            });
            if (match) itemId = match.id;
          }
        }

        if (itemId) {
          try {
            // Deduct from StockBalance
            const existingStock = await prisma.stockBalance.findUnique({
              where: {
                itemId_warehouse: {
                  itemId,
                  warehouse,
                },
              },
            });

            if (existingStock) {
              const newQty = Math.max(0, existingStock.quantity - orderedQty);
              await prisma.stockBalance.update({
                where: { id: existingStock.id },
                data: {
                  quantity: newQty,
                  lastUpdated: new Date(),
                },
              });
            } else {
              await prisma.stockBalance.create({
                data: {
                  itemId,
                  warehouse,
                  quantity: 0,
                  lastUpdated: new Date(),
                },
              });
            }

            // Deduct from MedicalBatch (specific batch if provided, otherwise FEFO)
            if (item.batchNo) {
              const existingBatch = await prisma.medicalBatch.findFirst({
                where: {
                  itemId,
                  batchNo: item.batchNo,
                },
              });

              if (existingBatch) {
                const newBatchQty = Math.max(0, existingBatch.quantity - orderedQty);
                await prisma.medicalBatch.update({
                  where: { id: existingBatch.id },
                  data: {
                    quantity: newBatchQty,
                    status: newBatchQty <= 0 ? 'Exhausted' : existingBatch.status,
                  },
                });
              }
            } else {
              // FEFO deduction: First Expiry First Out across active available batches
              const availableBatches = await prisma.medicalBatch.findMany({
                where: {
                  itemId,
                  quantity: { gt: 0 },
                  status: { notIn: ['Expired', 'Damaged', 'Quarantine', 'Inactive'] },
                },
                orderBy: { expiryDate: 'asc' },
              });

              let remainingToDeduct = orderedQty;
              for (const b of availableBatches) {
                if (remainingToDeduct <= 0) break;
                const deductAmount = Math.min(b.quantity, remainingToDeduct);
                const newBQty = b.quantity - deductAmount;
                await prisma.medicalBatch.update({
                  where: { id: b.id },
                  data: {
                    quantity: newBQty,
                    status: newBQty <= 0 ? 'Exhausted' : b.status,
                  },
                });
                remainingToDeduct -= deductAmount;
              }
            }
          } catch (stockErr) {
            console.error(`Error deducting stock balance for sales order item ${itemId}:`, stockErr);
          }
        }
      }
    }

    notify({ module: 'SALES', event: 'order_created', details: { orderNo: order.orderNo, customer: order.customer?.companyName, totalAmount: order.totalAmount, division: order.division } });

    return NextResponse.json(
      { success: true, data: order },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating sales order:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
