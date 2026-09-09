import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const batchId = resolvedParams.id;

    const record = await prisma.medicalBatch.findUnique({
      where: { id: batchId },
      include: {
        item: true,
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Batch record not found' },
        { status: 404 }
      );
    }

    // Parallel fetch related data: Supplier, StockBalance, Sibling Batches, Store Issues, Sales Orders, GRVs, Adjustments, Pricing
    const [
      supplier,
      stockBalance,
      siblingBatches,
      allStoreIssues,
      allSalesOrders,
      allGRVs,
      stockAdjustments,
      medicalPricing,
    ] = await Promise.all([
      record.supplierId
        ? prisma.supplier.findUnique({ where: { id: record.supplierId } }).catch(() => null)
        : Promise.resolve(null),
      prisma.stockBalance.findUnique({
        where: { itemId_warehouse: { itemId: record.itemId, warehouse: record.warehouse } },
      }).catch(() => null),
      prisma.medicalBatch.findMany({
        where: { itemId: record.itemId, id: { not: record.id } },
        orderBy: { expiryDate: 'asc' },
      }).catch(() => []),
      prisma.medicalStoreIssue.findMany({
        include: {
          customer: {
            select: {
              id: true,
              companyName: true,
              code: true,
              licenseNo: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }).catch(() => []),
      prisma.salesOrder.findMany({
        where: { division: 'MEDICAL' },
        include: {
          customer: {
            select: {
              id: true,
              companyName: true,
              code: true,
              phone: true,
            },
          },
        },
        orderBy: { orderDate: 'desc' },
        take: 100,
      }).catch(() => []),
      prisma.goodsReceive.findMany({
        include: {
          supplier: {
            select: {
              id: true,
              companyName: true,
              phone: true,
            },
          },
          purchaseOrder: {
            select: {
              id: true,
              poNo: true,
            },
          },
        },
        orderBy: { receivedDate: 'desc' },
        take: 100,
      }).catch(() => []),
      prisma.stockAdjustment.findMany({
        where: {
          OR: [
            { batchId: record.id },
            { itemId: record.itemId },
          ],
        },
        orderBy: { adjustmentDate: 'desc' },
        take: 50,
      }).catch(() => []),
      prisma.medicalPricing.findFirst({
        where: { itemId: record.itemId },
        orderBy: { createdAt: 'desc' },
      }).catch(() => null),
    ]);

    // Filter and extract Store Issues (Sales Deductions) relevant to this batch or item
    const storeIssues: any[] = [];
    let totalDeductedQty = 0;
    let totalDeductedAmount = 0;

    for (const issue of allStoreIssues) {
      let parsedItems: any[] = [];
      try {
        parsedItems = typeof issue.items === 'string' ? JSON.parse(issue.items) : (issue.items || []);
      } catch {
        continue;
      }
      if (!Array.isArray(parsedItems)) continue;

      const matchedItems = parsedItems.filter((it: any) => {
        const itemMatches = it.itemId === record.itemId || it.id === record.itemId;
        const batchMatches = it.batchId === record.id || it.batchNo === record.batchNo;
        return itemMatches || batchMatches;
      });

      if (matchedItems.length > 0) {
        const issueDeductedQty = matchedItems.reduce(
          (sum: number, it: any) => sum + Number(it.qty !== undefined ? it.qty : (it.quantity || 0)),
          0
        );
        const issueDeductedTotal = matchedItems.reduce(
          (sum: number, it: any) => sum + Number(it.total || ((it.qty || it.quantity || 0) * (it.unitPrice || it.price || 0))),
          0
        );

        totalDeductedQty += issueDeductedQty;
        totalDeductedAmount += issueDeductedTotal;

        storeIssues.push({
          id: issue.id,
          issueNo: issue.issueNo,
          customer: issue.customer,
          issuedBy: issue.issuedBy,
          issuedDate: issue.issuedDate || issue.createdAt,
          status: issue.status,
          deliveryMethod: issue.deliveryMethod,
          receiverName: issue.receiverName,
          notes: issue.notes,
          matchedItems,
          totalDeductedQty: issueDeductedQty,
          totalDeductedAmount: issueDeductedTotal,
        });
      }
    }

    // Filter Medical Sales Orders relevant to this item/batch
    const salesOrders: any[] = [];
    for (const order of allSalesOrders) {
      let parsedItems: any[] = [];
      try {
        parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
      } catch {
        continue;
      }
      if (!Array.isArray(parsedItems)) continue;

      const matchedItems = parsedItems.filter((it: any) => {
        return (
          it.itemId === record.itemId ||
          it.id === record.itemId ||
          it.batchNo === record.batchNo ||
          (it.name && record.item && it.name.toLowerCase().includes(record.item.name.toLowerCase()))
        );
      });

      if (matchedItems.length > 0) {
        const orderQty = matchedItems.reduce((sum: number, it: any) => sum + Number(it.qty || it.quantity || 0), 0);
        const orderTotal = matchedItems.reduce((sum: number, it: any) => sum + Number(it.total || ((it.qty || it.quantity || 0) * (it.unitPrice || 0))), 0);
        salesOrders.push({
          id: order.id,
          orderNo: order.orderNo,
          customer: order.customer,
          orderDate: order.orderDate,
          status: order.status,
          matchedItems,
          orderQty,
          orderTotal,
        });
      }
    }

    // Filter GRVs relevant to this item/batch
    const goodsReceives: any[] = [];
    for (const grv of allGRVs) {
      let parsedItems: any[] = [];
      try {
        parsedItems = typeof grv.items === 'string' ? JSON.parse(grv.items) : (grv.items || []);
      } catch {
        continue;
      }
      if (!Array.isArray(parsedItems)) continue;

      const matchedItems = parsedItems.filter((it: any) => {
        return (
          it.batchNo === record.batchNo ||
          it.itemId === record.itemId ||
          it.id === record.itemId ||
          (it.name && record.item && it.name.toLowerCase().includes(record.item.name.toLowerCase()))
        );
      });

      if (matchedItems.length > 0) {
        const receivedQty = matchedItems.reduce((sum: number, it: any) => sum + Number(it.receivedQty !== undefined ? it.receivedQty : (it.quantity || it.qty || 0)), 0);
        const unitCost = matchedItems[0]?.costPrice || matchedItems[0]?.unitPrice || matchedItems[0]?.unitCost || 0;
        goodsReceives.push({
          id: grv.id,
          grvNo: grv.grvNo,
          supplier: grv.supplier,
          purchaseOrder: grv.purchaseOrder,
          receivedDate: grv.receivedDate,
          receivedBy: grv.receivedBy,
          status: grv.status,
          receivedQty,
          unitCost,
          totalCost: receivedQty * unitCost,
          matchedItems,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...record,
        supplier,
        stockBalance,
        siblingBatches,
        storeIssues,
        salesOrders,
        goodsReceives,
        stockAdjustments,
        medicalPricing,
        stats: {
          totalDeductedQty,
          totalDeductedAmount,
          deductionsCount: storeIssues.length,
          salesOrdersCount: salesOrders.length,
          grvsCount: goodsReceives.length,
          adjustmentsCount: stockAdjustments.length,
          totalWarehouseStock: stockBalance?.quantity ?? record.quantity,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching medical batch details:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const body = await request.json();

    // Strip non-updatable and relation fields
    const { id: _id, item: _item, supplier: _supplier, stockBalance: _sb, siblingBatches: _sbb, storeIssues: _si, salesOrders: _so, goodsReceives: _gr, stockAdjustments: _sa, medicalPricing: _mp, stats: _st, ...updateData } = body;

    const record = await prisma.medicalBatch.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    const updatedRecord = await prisma.medicalBatch.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: { item: true },
    });

    return NextResponse.json({ success: true, data: updatedRecord });
  } catch (error: any) {
    console.error('Error updating batch record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const searchParams = request.nextUrl?.searchParams;
    const isPermanent = searchParams?.get('permanent') === 'true';

    const record = await prisma.medicalBatch.findUnique({
      where: { id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // If batch has remaining quantity, adjust StockBalance
    if (record.status !== 'Inactive' && record.quantity > 0) {
      try {
        const existingStock = await prisma.stockBalance.findUnique({
          where: { itemId_warehouse: { itemId: record.itemId, warehouse: record.warehouse } },
        });
        if (existingStock) {
          const newQty = Math.max(0, existingStock.quantity - record.quantity);
          await prisma.stockBalance.update({
            where: { id: existingStock.id },
            data: { quantity: newQty, lastUpdated: new Date() },
          });
        }
      } catch (err) {
        console.error('Error updating stock balance on batch delete:', err);
      }
    }

    // Permanently purge from database if already Inactive or explicitly requested
    if (record.status === 'Inactive' || isPermanent) {
      await prisma.medicalBatch.delete({
        where: { id },
      });

      return NextResponse.json({
        success: true,
        message: 'Stock batch permanently deleted from database.',
        permanent: true,
      });
    }

    // Otherwise mark status as Inactive
    const updatedRecord = await prisma.medicalBatch.update({
      where: { id },
      data: { status: 'Inactive', quantity: 0 },
    });

    return NextResponse.json({
      success: true,
      message: 'Batch marked as Inactive. Delete again to permanently remove.',
      data: updatedRecord,
      permanent: false,
    });
  } catch (error: any) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
