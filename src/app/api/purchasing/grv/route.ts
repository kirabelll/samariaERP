import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';
import { journalGoodsReceive } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { grvNo: { contains: search, mode: 'insensitive' } },
        { supplier: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.goodsReceive.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { supplier: true, purchaseOrder: { include: { supplier: true } } },
        orderBy: { receivedDate: 'desc' },
      }),
      prisma.goodsReceive.count({ where: whereClause }),
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
    console.error('Error fetching GRVs:', error);
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
      supplierId,
      purchaseOrderId,
      warehouse: defaultWarehouse,
      division,
      items,
      totalAmount,
      receivedBy,
      receivedDate,
      status,
    } = body;

    if (!supplierId || !items) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: supplierId, items' },
        { status: 400 }
      );
    }

    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Items must be a non-empty array' },
        { status: 400 }
      );
    }

    // Calculate total amount if 0 or not provided
    const calculatedTotal = Number(totalAmount) || parsedItems.reduce((sum: number, it: any) => {
      const q = Number(it.receivedQty || it.quantity || it.qty || 0);
      const c = Number(it.costPrice || it.unitPrice || it.unitCost || 0);
      return sum + q * c;
    }, 0);

    // Generate GRV number
    const count = await prisma.goodsReceive.count();
    const grvNo = `GRV-${String(count + 1).padStart(7, '0')}`;

    const grv = await prisma.goodsReceive.create({
      data: {
        grvNo,
        supplierId,
        purchaseOrderId: purchaseOrderId || null,
        items: JSON.stringify(parsedItems),
        totalAmount: calculatedTotal,
        receivedBy: receivedBy || null,
        receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
        status: status || 'Received',
      },
      include: { supplier: true, purchaseOrder: { include: { supplier: true } } },
    });

    // Determine target warehouse
    const baseWarehouse = defaultWarehouse || (division === 'MEDICAL' ? 'medical_store' : 'main');

    // Update inventory: StockBalance and MedicalBatch
    for (const item of parsedItems) {
      const receivedQty = Number(item.receivedQty !== undefined ? item.receivedQty : (item.quantity !== undefined ? item.quantity : (item.qty || 0)));
      if (receivedQty <= 0) continue;

      const unitCost = Number(item.costPrice || item.unitPrice || item.unitCost || 0);
      const rowWarehouse = item.warehouse || baseWarehouse;

      let itemId = item.itemId || item.id;
      if (!itemId || typeof itemId !== 'string' || itemId.startsWith('temp-')) {
        // Find by name or code
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
          // 1. Update or create StockBalance
          const existingStock = await prisma.stockBalance.findUnique({
            where: {
              itemId_warehouse: {
                itemId,
                warehouse: rowWarehouse,
              },
            },
          });

          if (existingStock) {
            const currentQty = existingStock.quantity || 0;
            const currentCost = existingStock.avgCost || 0;
            const newTotalQty = currentQty + receivedQty;
            const newAvgCost = newTotalQty > 0 && unitCost > 0
              ? ((currentQty * currentCost) + (receivedQty * unitCost)) / newTotalQty
              : currentCost;

            await prisma.stockBalance.update({
              where: { id: existingStock.id },
              data: {
                quantity: newTotalQty,
                avgCost: newAvgCost,
                lastUpdated: new Date(),
              },
            });
          } else {
            await prisma.stockBalance.create({
              data: {
                itemId,
                warehouse: rowWarehouse,
                quantity: receivedQty,
                avgCost: unitCost,
                lastUpdated: new Date(),
              },
            });
          }

          // 2. Create or update MedicalBatch (consolidate and update stock when items are the same)
          const expiryDate = item.expiryDate
            ? new Date(item.expiryDate)
            : new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000); // 2 years default
          const batchNo = item.batchNo ? String(item.batchNo).trim() : null;

          if (batchNo) {
            const existingBatch = await prisma.medicalBatch.findUnique({
              where: {
                itemId_batchNo_warehouse: {
                  itemId,
                  batchNo,
                  warehouse: rowWarehouse,
                },
              },
            });

            if (existingBatch) {
              await prisma.medicalBatch.update({
                where: { id: existingBatch.id },
                data: {
                  quantity: existingBatch.quantity + receivedQty,
                  costPrice: unitCost > 0 ? unitCost : existingBatch.costPrice,
                  expiryDate,
                  supplierId: supplierId || existingBatch.supplierId,
                  status: item.condition === 'Damaged' || item.condition === 'Defective' ? 'Damaged' : 'Available',
                },
              });
            } else {
              await prisma.medicalBatch.create({
                data: {
                  itemId,
                  batchNo,
                  expiryDate,
                  quantity: receivedQty,
                  costPrice: unitCost,
                  warehouse: rowWarehouse,
                  status: item.condition === 'Damaged' || item.condition === 'Defective' ? 'Damaged' : 'Available',
                  supplierId,
                },
              });
            }
          } else {
            // When batchNo is not specified, find existing batch for the same item in this warehouse to update stock
            const existingSameItemBatch = await prisma.medicalBatch.findFirst({
              where: {
                itemId,
                warehouse: rowWarehouse,
              },
              orderBy: { expiryDate: 'desc' },
            });

            if (existingSameItemBatch) {
              await prisma.medicalBatch.update({
                where: { id: existingSameItemBatch.id },
                data: {
                  quantity: existingSameItemBatch.quantity + receivedQty,
                  costPrice: unitCost > 0 ? unitCost : existingSameItemBatch.costPrice,
                  expiryDate,
                  supplierId: supplierId || existingSameItemBatch.supplierId,
                  status: item.condition === 'Damaged' || item.condition === 'Defective' ? 'Damaged' : 'Available',
                },
              });
            } else {
              const defaultBatchNo = `BATCH-${itemId.slice(-6).toUpperCase()}`;
              await prisma.medicalBatch.create({
                data: {
                  itemId,
                  batchNo: defaultBatchNo,
                  expiryDate,
                  quantity: receivedQty,
                  costPrice: unitCost,
                  warehouse: rowWarehouse,
                  status: item.condition === 'Damaged' || item.condition === 'Defective' ? 'Damaged' : 'Available',
                  supplierId,
                },
              });
            }
          }
        } catch (stockErr) {
          console.error(`Error updating stock balance for item ${itemId}:`, stockErr);
        }
      }
    }

    // Auto-create double-entry journal (Debit Inventory, Credit Supplier's AP Account)
    try {
      if (calculatedTotal > 0) {
        await journalGoodsReceive({
          ...grv,
          division,
          totalAmount: calculatedTotal,
        });
      }
    } catch (journalErr) {
      console.warn('Auto-journal creation for GRV skipped/failed:', journalErr);
    }

    notify({ module: 'PURCHASING', event: 'grv_received', details: { grvNo: grv.grvNo, totalAmount: grv.totalAmount } });

    return NextResponse.json(
      { success: true, data: grv },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating GRV:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
