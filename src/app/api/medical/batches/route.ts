import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Synchronize available stock & batches directly from Received GRVs
async function syncStockFromReceivedGRVs() {
  try {
    const receivedGRVs = await prisma.goodsReceive.findMany({
      where: {
        status: { in: ['Received', 'received', 'Approved', 'approved'] },
      },
      orderBy: { receivedDate: 'asc' },
    });

    if (receivedGRVs.length === 0) return;

    for (const grv of receivedGRVs) {
      let parsedItems: any[] = [];
      try {
        parsedItems = typeof grv.items === 'string' ? JSON.parse(grv.items) : (grv.items || []);
      } catch {
        continue;
      }
      if (!Array.isArray(parsedItems)) continue;

      for (let i = 0; i < parsedItems.length; i++) {
        const it = parsedItems[i];
        const qty = Number(it.receivedQty !== undefined ? it.receivedQty : (it.quantity !== undefined ? it.quantity : (it.qty || 0)));
        if (qty <= 0) continue;

        let itemId = it.itemId || it.id;
        if (!itemId || typeof itemId !== 'string' || itemId.startsWith('temp-')) {
          const searchName = it.item || it.name || it.itemName;
          const searchCode = it.code || it.itemCode;
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

        if (!itemId) continue;

        const warehouse = it.warehouse || 'medical_store';
        const unitCost = Number(it.costPrice || it.unitPrice || it.unitCost || 0);
        const expiryDate = it.expiryDate
          ? new Date(it.expiryDate)
          : new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);

        const batchNo = it.batchNo ? String(it.batchNo).trim() : `BATCH-${itemId.slice(-6).toUpperCase()}`;

        const existingBatch = await prisma.medicalBatch.findUnique({
          where: {
            itemId_batchNo_warehouse: {
              itemId,
              batchNo,
              warehouse,
            },
          },
        });

        if (existingBatch) {
          if (existingBatch.quantity <= 0) {
            await prisma.medicalBatch.update({
              where: { id: existingBatch.id },
              data: {
                quantity: qty,
                costPrice: unitCost > 0 ? unitCost : existingBatch.costPrice,
                expiryDate,
                status: 'Available',
              },
            });
          }
        } else {
          // Check if any batch exists for this same item in warehouse
          const anyItemBatch = await prisma.medicalBatch.findFirst({
            where: { itemId, warehouse },
          });

          if (anyItemBatch && anyItemBatch.quantity <= 0) {
            await prisma.medicalBatch.update({
              where: { id: anyItemBatch.id },
              data: {
                quantity: qty,
                costPrice: unitCost > 0 ? unitCost : anyItemBatch.costPrice,
                expiryDate,
                status: 'Available',
              },
            });
          } else if (!anyItemBatch) {
            await prisma.medicalBatch.create({
              data: {
                itemId,
                batchNo,
                expiryDate,
                quantity: qty,
                costPrice: unitCost,
                warehouse,
                status: 'Available',
                supplierId: grv.supplierId || null,
              },
            });
          }
        }

        // Update StockBalance
        const stock = await prisma.stockBalance.findUnique({
          where: { itemId_warehouse: { itemId, warehouse } },
        });
        if (stock) {
          if (stock.quantity <= 0) {
            await prisma.stockBalance.update({
              where: { id: stock.id },
              data: { quantity: qty, avgCost: unitCost > 0 ? unitCost : stock.avgCost, lastUpdated: new Date() },
            });
          }
        } else {
          await prisma.stockBalance.create({
            data: { itemId, warehouse, quantity: qty, avgCost: unitCost, lastUpdated: new Date() },
          });
        }
      }
    }
  } catch (err) {
    console.error('Error syncing stock from GRVs:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Run sync to ensure latest received GRVs update available stock
    await syncStockFromReceivedGRVs();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const itemId = searchParams.get('itemId') || '';
    const warehouse = searchParams.get('warehouse') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.batchNo = { contains: search, mode: 'insensitive' };
    }
    if (status) {
      whereClause.status = status;
    }
    if (itemId) {
      whereClause.itemId = itemId;
    }
    if (warehouse) {
      whereClause.warehouse = warehouse;
    }

    const [data, total] = await Promise.all([
      prisma.medicalBatch.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { item: true },
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.medicalBatch.count({ where: whereClause }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('Error fetching medical batches:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if payload is an array of items or contains items array
    const rawItems = Array.isArray(body)
      ? body
      : Array.isArray(body.items)
      ? body.items
      : [body];

    if (!rawItems || rawItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items provided for batch intake' },
        { status: 400 }
      );
    }

    const defaultWarehouse = body.warehouse || 'medical_store';
    const defaultSupplierId = body.supplierId || null;
    const defaultStatus = body.status || 'Available';

    const createdBatches: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const itemId = item.itemId;
      const batchNo = item.batchNo?.trim();
      const expiryDate = item.expiryDate;
      const quantity = Number(item.quantity || 0);
      const costPrice = Number(item.costPrice || 0);
      const warehouse = item.warehouse || defaultWarehouse;
      const status = item.status || defaultStatus;
      const supplierId = item.supplierId || defaultSupplierId;

      if (!itemId || !batchNo || !expiryDate || quantity <= 0) {
        errors.push(`Row ${i + 1}: Missing required fields (Item, Batch No, Expiry Date, Quantity > 0)`);
        continue;
      }

      // Check if batch already exists
      const existing = await prisma.medicalBatch.findUnique({
        where: {
          itemId_batchNo_warehouse: {
            itemId,
            batchNo,
            warehouse,
          },
        },
      });

      if (existing) {
        // Update quantity and cost price if already exists
        const updated = await prisma.medicalBatch.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + quantity,
            costPrice: costPrice > 0 ? costPrice : existing.costPrice,
            expiryDate: new Date(expiryDate),
            supplierId: supplierId || existing.supplierId,
            status,
          },
          include: { item: true },
        });
        createdBatches.push(updated);
      } else {
        const batch = await prisma.medicalBatch.create({
          data: {
            itemId,
            batchNo,
            expiryDate: new Date(expiryDate),
            quantity,
            costPrice,
            warehouse,
            status,
            supplierId,
          },
          include: { item: true },
        });
        createdBatches.push(batch);
      }
    }

    if (createdBatches.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join('. ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: createdBatches.length === 1 ? createdBatches[0] : createdBatches,
        count: createdBatches.length,
        warnings: errors.length > 0 ? errors : undefined,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating medical batch:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
