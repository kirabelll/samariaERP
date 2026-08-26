import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const [
      totalItems,
      activeItems,
      stockBalances,
      lowStockBalances,
      outOfStockBalances,
      recentAdjustments,
      adjustmentsAgg,
      categoriesCount,
    ] = await Promise.all([
      prisma.item.count(),
      prisma.item.count({ where: { status: 'Active' } }),
      prisma.stockBalance.findMany({
        include: { item: { select: { name: true, code: true, category: true, unit: true } } },
        orderBy: { quantity: 'desc' },
      }),
      prisma.stockBalance.findMany({
        where: { quantity: { gt: 0, lte: 10 } },
        include: { item: { select: { name: true, code: true, category: true, unit: true } } },
        take: 10,
        orderBy: { quantity: 'asc' },
      }),
      prisma.stockBalance.findMany({
        where: { quantity: { lte: 0 } },
        include: { item: { select: { name: true, code: true, category: true, unit: true } } },
        take: 10,
      }),
      prisma.stockAdjustment.findMany({
        take: 8,
        orderBy: { adjustmentDate: 'desc' },
      }),
      prisma.stockAdjustment.aggregate({
        _count: true,
      }),
      prisma.category.count(),
    ]);

    // Calculate total inventory valuation
    const totalValuation = stockBalances.reduce(
      (sum, sb) => sum + (sb.quantity * (sb.avgCost || 0)),
      0
    );

    // Group balances by warehouse
    const warehouseMap: { [key: string]: { count: number; totalQty: number; value: number } } = {};
    stockBalances.forEach((sb) => {
      const wh = sb.warehouse || 'main';
      if (!warehouseMap[wh]) {
        warehouseMap[wh] = { count: 0, totalQty: 0, value: 0 };
      }
      warehouseMap[wh].count += 1;
      warehouseMap[wh].totalQty += sb.quantity;
      warehouseMap[wh].value += sb.quantity * (sb.avgCost || 0);
    });

    const warehouseBreakdown = Object.entries(warehouseMap).map(([name, data]) => ({
      warehouse: name,
      itemCount: data.count,
      totalQuantity: data.totalQty,
      valuation: data.value,
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalItems,
          activeItems,
          totalStockValuation: totalValuation,
          totalWarehouses: Object.keys(warehouseMap).length,
          lowStockCount: lowStockBalances.length,
          outOfStockCount: outOfStockBalances.length,
          totalAdjustments: adjustmentsAgg._count || 0,
          categoriesCount,
        },
        warehouseBreakdown,
        lowStockItems: lowStockBalances.map((sb) => ({
          id: sb.id,
          itemCode: sb.item?.code || '—',
          itemName: sb.item?.name || 'Unknown Item',
          category: sb.item?.category || 'General',
          unit: sb.item?.unit || 'Units',
          quantity: sb.quantity,
          warehouse: sb.warehouse,
          avgCost: sb.avgCost,
        })),
        outOfStockItems: outOfStockBalances.map((sb) => ({
          id: sb.id,
          itemCode: sb.item?.code || '—',
          itemName: sb.item?.name || 'Unknown Item',
          category: sb.item?.category || 'General',
          unit: sb.item?.unit || 'Units',
          warehouse: sb.warehouse,
        })),
        recentAdjustments: recentAdjustments.map((adj) => ({
          id: adj.id,
          adjustmentNo: adj.adjustmentNo,
          warehouse: adj.warehouse,
          type: adj.adjustmentType,
          difference: adj.difference,
          reason: adj.reason,
          date: adj.adjustmentDate,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching stock dashboard stats:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
