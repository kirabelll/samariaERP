import { prisma } from './prisma';

export interface InventoryItemPayload {
  id?: string | number;
  itemId?: string | null;
  item?: string;
  name?: string;
  itemName?: string;
  code?: string;
  itemCode?: string;
  qty?: number | string;
  quantity?: number | string;
  batchNo?: string | null;
  expiryDate?: string | Date | null;
  warehouse?: string;
  unitPrice?: number;
  price?: number;
  total?: number;
}

/**
 * Resolves an item ID from various possible input formats
 */
export async function resolveItemId(item: InventoryItemPayload): Promise<string | null> {
  let rawId = item.itemId || (typeof item.id === 'string' && !/^\d+$/.test(item.id) && !item.id.startsWith('temp-') ? item.id : null);

  // Check if rawId exists in database
  if (rawId) {
    const existing = await prisma.item.findUnique({
      where: { id: rawId },
      select: { id: true },
    });
    if (existing) return existing.id;
  }

  // Search by code
  const code = item.code || item.itemCode;
  if (code && typeof code === 'string' && code.trim()) {
    const byCode = await prisma.item.findFirst({
      where: { code: { equals: code.trim(), mode: 'insensitive' } },
      select: { id: true },
    });
    if (byCode) return byCode.id;
  }

  // Search by name
  const name = item.name || item.itemName || item.item;
  if (name && typeof name === 'string' && name.trim()) {
    const byName = await prisma.item.findFirst({
      where: {
        OR: [
          { name: { equals: name.trim(), mode: 'insensitive' } },
          { genericName: { equals: name.trim(), mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    if (byName) return byName.id;

    // Partial name match as fallback
    const byPartialName = await prisma.item.findFirst({
      where: {
        OR: [
          { name: { contains: name.trim(), mode: 'insensitive' } },
          { genericName: { contains: name.trim(), mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    if (byPartialName) return byPartialName.id;
  }

  return null;
}

/**
 * Deducts inventory (both StockBalance and MedicalBatch) for ordered or delivered items.
 */
export async function deductInventory(
  rawItems: any,
  division?: string,
  options?: { orderNo?: string; defaultWarehouse?: string }
): Promise<{ success: boolean; deductions: any[]; errors: string[] }> {
  const deductions: any[] = [];
  const errors: string[] = [];

  let items: InventoryItemPayload[] = [];
  try {
    items = typeof rawItems === 'string' ? JSON.parse(rawItems) : (rawItems || []);
  } catch (err: any) {
    return { success: false, deductions, errors: [`Failed to parse items: ${err.message}`] };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { success: true, deductions, errors: [] };
  }

  const defaultWh = options?.defaultWarehouse || (division === 'MEDICAL' ? 'medical_store' : 'main');

  for (const item of items) {
    const qty = Number(item.qty !== undefined ? item.qty : (item.quantity !== undefined ? item.quantity : 0));
    if (qty <= 0) continue;

    const itemId = await resolveItemId(item);
    if (!itemId) {
      const label = item.item || item.name || item.itemName || item.code || 'Unknown';
      errors.push(`Could not resolve system item for "${label}" to deduct inventory`);
      continue;
    }

    const warehouse = item.warehouse || defaultWh;

    try {
      // 1. Deduct from StockBalance
      let existingStock = await prisma.stockBalance.findUnique({
        where: {
          itemId_warehouse: {
            itemId,
            warehouse,
          },
        },
      });

      if (!existingStock) {
        // Fallback to any warehouse balance for this item
        existingStock = await prisma.stockBalance.findFirst({
          where: { itemId },
        });
      }

      if (existingStock) {
        const newQty = Math.max(0, existingStock.quantity - qty);
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

      // 2. Deduct from MedicalBatch (for medical items or items with batchNo)
      let deductedBatches: any[] = [];
      const batchNo = item.batchNo ? String(item.batchNo).trim() : null;

      if (batchNo) {
        // Specific batch specified
        const targetedBatch = await prisma.medicalBatch.findFirst({
          where: {
            itemId,
            batchNo: { equals: batchNo, mode: 'insensitive' },
          },
        });

        if (targetedBatch) {
          const deductFromTarget = Math.min(targetedBatch.quantity, qty);
          const newTargetQty = Math.max(0, targetedBatch.quantity - deductFromTarget);
          await prisma.medicalBatch.update({
            where: { id: targetedBatch.id },
            data: {
              quantity: newTargetQty,
              status: newTargetQty <= 0 ? 'Exhausted' : 'Available',
            },
          });
          deductedBatches.push({ batchId: targetedBatch.id, batchNo: targetedBatch.batchNo, deducted: deductFromTarget });

          // If ordered quantity exceeds this batch, deduct remaining from other available batches using FEFO
          let remaining = qty - deductFromTarget;
          if (remaining > 0) {
            const otherBatches = await prisma.medicalBatch.findMany({
              where: {
                itemId,
                id: { not: targetedBatch.id },
                quantity: { gt: 0 },
                status: { notIn: ['Expired', 'Damaged', 'Quarantine', 'Inactive'] },
              },
              orderBy: { expiryDate: 'asc' },
            });

            for (const b of otherBatches) {
              if (remaining <= 0) break;
              const dQty = Math.min(b.quantity, remaining);
              const nQty = b.quantity - dQty;
              await prisma.medicalBatch.update({
                where: { id: b.id },
                data: {
                  quantity: nQty,
                  status: nQty <= 0 ? 'Exhausted' : 'Available',
                },
              });
              deductedBatches.push({ batchId: b.id, batchNo: b.batchNo, deducted: dQty });
              remaining -= dQty;
            }
          }
        } else {
          // Targeted batch not found, fallback to FEFO
          const availableBatches = await prisma.medicalBatch.findMany({
            where: {
              itemId,
              quantity: { gt: 0 },
              status: { notIn: ['Expired', 'Damaged', 'Quarantine', 'Inactive'] },
            },
            orderBy: { expiryDate: 'asc' },
          });

          let remaining = qty;
          for (const b of availableBatches) {
            if (remaining <= 0) break;
            const dQty = Math.min(b.quantity, remaining);
            const nQty = b.quantity - dQty;
            await prisma.medicalBatch.update({
              where: { id: b.id },
              data: {
                quantity: nQty,
                status: nQty <= 0 ? 'Exhausted' : 'Available',
              },
            });
            deductedBatches.push({ batchId: b.id, batchNo: b.batchNo, deducted: dQty });
            remaining -= dQty;
          }
        }
      } else {
        // No specific batch: FEFO across all available active batches
        const availableBatches = await prisma.medicalBatch.findMany({
          where: {
            itemId,
            quantity: { gt: 0 },
            status: { notIn: ['Expired', 'Damaged', 'Quarantine', 'Inactive'] },
          },
          orderBy: { expiryDate: 'asc' },
        });

        let remaining = qty;
        for (const b of availableBatches) {
          if (remaining <= 0) break;
          const dQty = Math.min(b.quantity, remaining);
          const nQty = b.quantity - dQty;
          await prisma.medicalBatch.update({
            where: { id: b.id },
            data: {
              quantity: nQty,
              status: nQty <= 0 ? 'Exhausted' : 'Available',
            },
          });
          deductedBatches.push({ batchId: b.id, batchNo: b.batchNo, deducted: dQty });
          remaining -= dQty;
        }
      }

      deductions.push({
        itemId,
        warehouse,
        qty,
        deductedBatches,
      });
    } catch (stockErr: any) {
      console.error(`Error deducting stock for itemId ${itemId}:`, stockErr);
      errors.push(`Error updating inventory for item ${itemId}: ${stockErr.message}`);
    }
  }

  return { success: errors.length === 0, deductions, errors };
}

/**
 * Restores inventory (both StockBalance and MedicalBatch) when a Sales Order or Delivery is cancelled/deleted.
 */
export async function restoreInventory(
  rawItems: any,
  division?: string,
  options?: { orderNo?: string; defaultWarehouse?: string }
): Promise<{ success: boolean; restorations: any[]; errors: string[] }> {
  const restorations: any[] = [];
  const errors: string[] = [];

  let items: InventoryItemPayload[] = [];
  try {
    items = typeof rawItems === 'string' ? JSON.parse(rawItems) : (rawItems || []);
  } catch (err: any) {
    return { success: false, restorations, errors: [`Failed to parse items: ${err.message}`] };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { success: true, restorations, errors: [] };
  }

  const defaultWh = options?.defaultWarehouse || (division === 'MEDICAL' ? 'medical_store' : 'main');

  for (const item of items) {
    const qty = Number(item.qty !== undefined ? item.qty : (item.quantity !== undefined ? item.quantity : 0));
    if (qty <= 0) continue;

    const itemId = await resolveItemId(item);
    if (!itemId) {
      const label = item.item || item.name || item.itemName || item.code || 'Unknown';
      errors.push(`Could not resolve system item for "${label}" to restore inventory`);
      continue;
    }

    const warehouse = item.warehouse || defaultWh;

    try {
      // 1. Restore StockBalance
      const existingStock = await prisma.stockBalance.findUnique({
        where: {
          itemId_warehouse: {
            itemId,
            warehouse,
          },
        },
      });

      if (existingStock) {
        await prisma.stockBalance.update({
          where: { id: existingStock.id },
          data: {
            quantity: existingStock.quantity + qty,
            lastUpdated: new Date(),
          },
        });
      } else {
        await prisma.stockBalance.create({
          data: {
            itemId,
            warehouse,
            quantity: qty,
            lastUpdated: new Date(),
          },
        });
      }

      // 2. Restore MedicalBatch
      const batchNo = item.batchNo ? String(item.batchNo).trim() : null;

      if (batchNo) {
        const existingBatch = await prisma.medicalBatch.findFirst({
          where: {
            itemId,
            batchNo: { equals: batchNo, mode: 'insensitive' },
          },
        });

        if (existingBatch) {
          await prisma.medicalBatch.update({
            where: { id: existingBatch.id },
            data: {
              quantity: existingBatch.quantity + qty,
              status: 'Available',
            },
          });
        } else {
          // Create batch record if it didn't exist
          const expiryDate = item.expiryDate
            ? new Date(item.expiryDate)
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

          await prisma.medicalBatch.create({
            data: {
              itemId,
              batchNo,
              expiryDate,
              quantity: qty,
              costPrice: Number(item.unitPrice || item.price || 0),
              warehouse,
              status: 'Available',
            },
          });
        }
      } else {
        // Find most recent batch for this item
        const existingBatch = await prisma.medicalBatch.findFirst({
          where: { itemId, warehouse },
          orderBy: { expiryDate: 'desc' },
        });

        if (existingBatch) {
          await prisma.medicalBatch.update({
            where: { id: existingBatch.id },
            data: {
              quantity: existingBatch.quantity + qty,
              status: 'Available',
            },
          });
        } else {
          const defaultBatchNo = `BATCH-${itemId.slice(-6).toUpperCase()}`;
          const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          await prisma.medicalBatch.create({
            data: {
              itemId,
              batchNo: defaultBatchNo,
              expiryDate,
              quantity: qty,
              costPrice: Number(item.unitPrice || item.price || 0),
              warehouse,
              status: 'Available',
            },
          });
        }
      }

      restorations.push({
        itemId,
        warehouse,
        qty,
      });
    } catch (stockErr: any) {
      console.error(`Error restoring stock for itemId ${itemId}:`, stockErr);
      errors.push(`Error restoring inventory for item ${itemId}: ${stockErr.message}`);
    }
  }

  return { success: errors.length === 0, restorations, errors };
}

/**
 * Reconciles inventory when order items are modified.
 * Restores the old items and then deducts the new items.
 */
export async function reconcileInventory(
  oldItems: any,
  newItems: any,
  division?: string,
  options?: { orderNo?: string; defaultWarehouse?: string }
) {
  await restoreInventory(oldItems, division, options);
  return await deductInventory(newItems, division, options);
}
