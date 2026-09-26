import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'sales';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    let data: any = {};

    switch (reportType) {
      case 'sales': {
        const whereClause: any = {};
        if (startDate || endDate) whereClause.invoiceDate = dateFilter;
        // Exclude inactive invoices from sales reports by default
        whereClause.status = { notIn: ['Cancelled', 'Inactive'] };

        // Fetch invoiced sales data
        const [invoices, total, summary] = await Promise.all([
          prisma.salesInvoice.findMany({
            where: whereClause,
            skip,
            take: limit,
            include: {
              customer: { select: { companyName: true, code: true } },
              cementLifting: { select: { id: true, liftingNo: true, status: true } },
              payments: true,
            },
            orderBy: { invoiceDate: 'desc' },
          }),
          prisma.salesInvoice.count({ where: whereClause }),
          prisma.salesInvoice.aggregate({
            where: whereClause,
            _sum: { totalAmount: true, vatAmount: true, withholding: true },
            _count: true,
          }),
        ]);

        const totalPaid = invoices.reduce((sum, inv) => {
          const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
          return sum + paid;
        }, 0);

        // Fetch all active invoices (excluding Cancelled and Inactive) to extract invoiced lifting and delivery IDs
        const allActiveInvoices = await prisma.salesInvoice.findMany({
          where: { status: { notIn: ['Cancelled', 'Inactive'] } },
          select: {
            id: true,
            invoiceNo: true,
            liftingId: true,
            division: true,
            items: true,
            cementLifting: { select: { id: true, liftingNo: true, padNumber: true, podNumber: true } },
          },
        });

        // Helper to safely parse JSON items even if double-stringified
        const safelyParseItems = (itemsRaw: any): any[] => {
          if (!itemsRaw) return [];
          let parsed = itemsRaw;
          if (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
              if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
              }
            } catch {
              return [];
            }
          }
          return Array.isArray(parsed) ? parsed : [];
        };

        const invoicedLiftingIds = new Set<string>();
        const invoicedLiftingNos = new Set<string>();
        const invoicedDeliveryIds = new Set<string>();
        const invoicedDispatchNos = new Set<string>();
        const invoicedPadPodNos = new Set<string>();
        const invoicedGeneralIds = new Set<string>();
        const invoicedGeneralNos = new Set<string>();
        const textCorpusParts: string[] = [];

        allActiveInvoices.forEach((inv) => {
          // Direct lifting relationship
          if (inv.liftingId) {
            const lid = String(inv.liftingId).trim().toLowerCase();
            invoicedLiftingIds.add(lid);
            invoicedGeneralIds.add(lid);
          }
          if (inv.cementLifting?.liftingNo) {
            const lno = String(inv.cementLifting.liftingNo).trim().toLowerCase();
            invoicedLiftingNos.add(lno);
            invoicedGeneralNos.add(lno);
            if (inv.cementLifting.id) {
              const cid = String(inv.cementLifting.id).trim().toLowerCase();
              invoicedLiftingIds.add(cid);
              invoicedGeneralIds.add(cid);
            }
            if (inv.cementLifting.padNumber) {
              const pno = String(inv.cementLifting.padNumber).trim().toLowerCase();
              invoicedPadPodNos.add(pno);
              invoicedLiftingNos.add(pno);
              invoicedGeneralNos.add(pno);
            }
            if (inv.cementLifting.podNumber) {
              const pno = String(inv.cementLifting.podNumber).trim().toLowerCase();
              invoicedPadPodNos.add(pno);
              invoicedLiftingNos.add(pno);
              invoicedGeneralNos.add(pno);
            }
          }

          if (typeof inv.items === 'string') {
            textCorpusParts.push(inv.items.toLowerCase());
          }

          // Items parsing with comprehensive reference extraction
          const parsedItems = safelyParseItems(inv.items);
          parsedItems.forEach((item: any) => {
            // Explicit IDs
            if (item.id) {
              const idStr = String(item.id).trim().toLowerCase();
              invoicedGeneralIds.add(idStr);
            }
            if (item.liftingId) {
              const idStr = String(item.liftingId).trim().toLowerCase();
              invoicedLiftingIds.add(idStr);
              invoicedGeneralIds.add(idStr);
            }
            if (item.liftingIds && Array.isArray(item.liftingIds)) {
              item.liftingIds.forEach((id: any) => {
                if (id) {
                  const idStr = String(id).trim().toLowerCase();
                  invoicedLiftingIds.add(idStr);
                  invoicedGeneralIds.add(idStr);
                }
              });
            }
            if (item.deliveryId) {
              const idStr = String(item.deliveryId).trim().toLowerCase();
              invoicedDeliveryIds.add(idStr);
              invoicedGeneralIds.add(idStr);
            }
            if (item.deliveryIds && Array.isArray(item.deliveryIds)) {
              item.deliveryIds.forEach((id: any) => {
                if (id) {
                  const idStr = String(id).trim().toLowerCase();
                  invoicedDeliveryIds.add(idStr);
                  invoicedGeneralIds.add(idStr);
                }
              });
            }
            if (item.dispatchId) {
              const idStr = String(item.dispatchId).trim().toLowerCase();
              invoicedDeliveryIds.add(idStr);
              invoicedGeneralIds.add(idStr);
            }
            if (item.dispatchIds && Array.isArray(item.dispatchIds)) {
              item.dispatchIds.forEach((id: any) => {
                if (id) {
                  const idStr = String(id).trim().toLowerCase();
                  invoicedDeliveryIds.add(idStr);
                  invoicedGeneralIds.add(idStr);
                }
              });
            }

            // Explicit numbers / codes
            if (item.liftingNo) {
              const noStr = String(item.liftingNo).trim().toLowerCase();
              invoicedLiftingNos.add(noStr);
              invoicedGeneralNos.add(noStr);
            }
            if (item.liftingNos && Array.isArray(item.liftingNos)) {
              item.liftingNos.forEach((no: any) => {
                if (no) {
                  const noStr = String(no).trim().toLowerCase();
                  invoicedLiftingNos.add(noStr);
                  invoicedGeneralNos.add(noStr);
                }
              });
            }
            if (item.dispatchNo) {
              const noStr = String(item.dispatchNo).trim().toLowerCase();
              invoicedDispatchNos.add(noStr);
              invoicedGeneralNos.add(noStr);
            }
            if (item.dispatchNos && Array.isArray(item.dispatchNos)) {
              item.dispatchNos.forEach((no: any) => {
                if (no) {
                  const noStr = String(no).trim().toLowerCase();
                  invoicedDispatchNos.add(noStr);
                  invoicedGeneralNos.add(noStr);
                }
              });
            }
            if (item.padNumber) {
              const pad = String(item.padNumber).trim().toLowerCase();
              invoicedPadPodNos.add(pad);
              invoicedLiftingNos.add(pad);
              invoicedDispatchNos.add(pad);
              invoicedGeneralNos.add(pad);
            }
            if (item.padNumbers && Array.isArray(item.padNumbers)) {
              item.padNumbers.forEach((p: any) => {
                if (p) {
                  const pad = String(p).trim().toLowerCase();
                  invoicedPadPodNos.add(pad);
                  invoicedLiftingNos.add(pad);
                  invoicedDispatchNos.add(pad);
                  invoicedGeneralNos.add(pad);
                }
              });
            }
            if (item.podNumber) {
              const pod = String(item.podNumber).trim().toLowerCase();
              invoicedPadPodNos.add(pod);
              invoicedLiftingNos.add(pod);
              invoicedDispatchNos.add(pod);
              invoicedGeneralNos.add(pod);
            }
            if (item.podNumbers && Array.isArray(item.podNumbers)) {
              item.podNumbers.forEach((p: any) => {
                if (p) {
                  const pod = String(p).trim().toLowerCase();
                  invoicedPadPodNos.add(pod);
                  invoicedLiftingNos.add(pod);
                  invoicedDispatchNos.add(pod);
                  invoicedGeneralNos.add(pod);
                }
              });
            }

            if (item.ref) {
              const ref = String(item.ref).trim().toLowerCase();
              invoicedGeneralNos.add(ref);
            }
            if (item.refs && Array.isArray(item.refs)) {
              item.refs.forEach((r: any) => {
                if (r) invoicedGeneralNos.add(String(r).trim().toLowerCase());
              });
            }

            // Pattern matching in item text (item, name, description, itemName)
            const text = `${item.item || ''} ${item.name || ''} ${item.description || ''} ${item.itemName || ''}`;
            textCorpusParts.push(text.toLowerCase());
            
            // Cement lifting patterns (LIFT-xxxx, LFT-xxxx)
            const lftMatches = text.match(/(?:LIFT|LFT)-[\w-]+/gi);
            if (lftMatches) {
              lftMatches.forEach((m) => {
                const clean = m.trim().toLowerCase();
                invoicedLiftingNos.add(clean);
                invoicedGeneralNos.add(clean);
              });
            }

            // Aggregate dispatch patterns (DISP-xxxx, DSP-xxxx, AGG-xxxx)
            const dispMatches = text.match(/(?:DISP|DSP|AGG)-[\w-]+/gi);
            if (dispMatches) {
              dispMatches.forEach((m) => {
                const clean = m.trim().toLowerCase();
                invoicedDispatchNos.add(clean);
                invoicedGeneralNos.add(clean);
              });
            }

            // POD / PAD numbers embedded in text
            const podMatches = text.match(/(?:POD|PAD)s?\s*#?\s*([\w/-]+)/gi);
            if (podMatches) {
              podMatches.forEach((matchStr) => {
                const cleaned = matchStr.replace(/^(?:POD|PAD)s?\s*#?/i, '').trim().toLowerCase();
                if (cleaned) {
                  invoicedPadPodNos.add(cleaned);
                  invoicedLiftingNos.add(cleaned);
                  invoicedDispatchNos.add(cleaned);
                  invoicedGeneralNos.add(cleaned);
                }
              });
            }
          });
        });

        const allInvoicesTextCorpus = textCorpusParts.join(' ');

        // Helpers to determine whether a lifting or dispatch is already invoiced
        const isLiftingInvoiced = (l: any): boolean => {
          if (Array.isArray(l.invoices) && l.invoices.some((inv: any) => inv.status !== 'Cancelled' && inv.status !== 'Inactive')) {
            return true;
          }
          const idStr = String(l.id || '').trim().toLowerCase();
          if (idStr && (invoicedLiftingIds.has(idStr) || invoicedGeneralIds.has(idStr))) {
            return true;
          }
          const lNo = String(l.liftingNo || '').trim().toLowerCase();
          if (lNo && (invoicedLiftingNos.has(lNo) || invoicedGeneralNos.has(lNo))) {
            return true;
          }
          const padStr = String(l.padNumber || '').trim().toLowerCase();
          if (padStr && (invoicedPadPodNos.has(padStr) || invoicedLiftingNos.has(padStr) || invoicedGeneralNos.has(padStr))) {
            return true;
          }
          const podStr = String(l.podNumber || '').trim().toLowerCase();
          if (podStr && (invoicedPadPodNos.has(podStr) || invoicedLiftingNos.has(podStr) || invoicedGeneralNos.has(podStr))) {
            return true;
          }
          const delNote = String(l.deliveryNoteNo || '').trim().toLowerCase();
          if (delNote && (invoicedGeneralNos.has(delNote) || invoicedLiftingNos.has(delNote))) {
            return true;
          }
          // Substring match in all invoice items corpus
          if (lNo && allInvoicesTextCorpus.includes(lNo)) {
            return true;
          }
          if (idStr && allInvoicesTextCorpus.includes(idStr)) {
            return true;
          }
          if (padStr && padStr.length >= 3 && allInvoicesTextCorpus.includes(padStr)) {
            return true;
          }
          if (podStr && podStr.length >= 3 && allInvoicesTextCorpus.includes(podStr)) {
            return true;
          }
          return false;
        };

        const isDispatchInvoiced = (d: any): boolean => {
          const idStr = String(d.id || '').trim().toLowerCase();
          if (idStr && (invoicedDeliveryIds.has(idStr) || invoicedGeneralIds.has(idStr))) {
            return true;
          }
          const dNo = String(d.dispatchNo || '').trim().toLowerCase();
          if (dNo && (invoicedDispatchNos.has(dNo) || invoicedGeneralNos.has(dNo))) {
            return true;
          }
          const padStr = String(d.padNumber || '').trim().toLowerCase();
          if (padStr && (invoicedPadPodNos.has(padStr) || invoicedDispatchNos.has(padStr) || invoicedGeneralNos.has(padStr))) {
            return true;
          }
          const podStr = String((d as any).podNumber || '').trim().toLowerCase();
          if (podStr && (invoicedPadPodNos.has(podStr) || invoicedDispatchNos.has(podStr) || invoicedGeneralNos.has(podStr))) {
            return true;
          }
          // Substring match in all invoice items corpus
          if (dNo && allInvoicesTextCorpus.includes(dNo)) {
            return true;
          }
          if (idStr && allInvoicesTextCorpus.includes(idStr)) {
            return true;
          }
          if (padStr && padStr.length >= 3 && allInvoicesTextCorpus.includes(padStr)) {
            return true;
          }
          if (podStr && podStr.length >= 3 && allInvoicesTextCorpus.includes(podStr)) {
            return true;
          }
          return false;
        };

        // Date filter for liftings and deliveries
        const liftingDateFilter: any = {};
        if (startDate) liftingDateFilter.gte = new Date(startDate);
        if (endDate) liftingDateFilter.lte = new Date(endDate);

        // 1. Fetch Cement Liftings and check strictly against active invoices
        const cementLiftings = await prisma.cementLifting.findMany({
          where: {
            status: { in: ['Delivered', 'Verified', 'Lifted'] },
            ...(startDate || endDate ? { liftingDate: liftingDateFilter } : {}),
          },
          include: {
            customer: { select: { id: true, companyName: true, code: true } },
            factory: { select: { name: true } },
            purchase: { select: { unitPrice: true, cementType: true } },
            invoices: {
              where: { status: { notIn: ['Cancelled', 'Inactive'] } },
              select: { id: true, invoiceNo: true, status: true },
            },
          },
          orderBy: { liftingDate: 'desc' },
        });

        // Fetch customer agreements for liftings to resolve exact customer price per Quintal
        const liftingCustomerIds = Array.from(new Set(cementLiftings.map((l) => l.customerId).filter(Boolean)));
        const customerAgreements = liftingCustomerIds.length > 0
          ? await prisma.salesAgreement.findMany({
              where: { customerId: { in: liftingCustomerIds }, status: { notIn: ['Void', 'Cancelled'] } },
              select: { customerId: true, agreementNo: true, items: true, division: true, validFrom: true, validTo: true },
              orderBy: { createdAt: 'desc' },
            })
          : [];

        const resolveCustomerAgreementPrice = (customerId?: string, cementType?: string, liftingDate?: any): number => {
          if (!customerId) return 0;
          const agreements = customerAgreements.filter((a) => a.customerId === customerId);
          const lDate = liftingDate ? new Date(liftingDate) : null;
          const validDateAgreements = lDate
            ? agreements.filter((a) => {
                const from = a.validFrom ? new Date(a.validFrom) : null;
                const to = a.validTo ? new Date(a.validTo) : null;
                return (!from || from <= lDate) && (!to || to >= lDate);
              })
            : [];
          const targetAgreements = validDateAgreements.length > 0 ? validDateAgreements : agreements;
          for (const agr of targetAgreements) {
            try {
              const parsed = typeof agr.items === 'string' ? JSON.parse(agr.items) : (agr.items as any[] || []);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const targetType = (cementType || '').toUpperCase().trim();
                const matched = targetType
                  ? parsed.find((item: any) => {
                      const rawName = (item.itemName || item.name || item.description || '').toUpperCase();
                      const rawType = (item.cementType || item.type || '').toUpperCase();
                      return (
                        (rawType && (rawType === targetType || targetType.includes(rawType) || rawType.includes(targetType))) ||
                        (rawName && (rawName.includes(targetType) || targetType.includes(rawName)))
                      );
                    }) || parsed[0]
                  : parsed[0];
                if (matched) {
                  const price = Number(matched.unitPrice ?? matched.pricePerUnit ?? matched.price ?? matched.amount ?? 0);
                  if (price > 0) return price;
                }
              }
            } catch {}
          }
          return 0;
        };

        const uninvoicedCementItems = cementLiftings
          .filter((l) => !isLiftingInvoiced(l))
          .map((l) => {
            const rawWeight = Number(l.buyerWeighbridgeQty || l.factoryWeight || 0);
            const weightInQuintals = rawWeight > 1000 ? rawWeight / 100 : rawWeight;
            const agreedPrice = resolveCustomerAgreementPrice(l.customer?.id, l.purchase?.cementType, l.liftingDate);
            const unitPrice = agreedPrice > 0 ? agreedPrice : Number(l.purchase?.unitPrice || 0);
            const estValue = Math.round(weightInQuintals * unitPrice * 100) / 100;
            return {
              id: l.id,
              type: 'CEMENT' as const,
              division: 'CEMENT',
              referenceNo: l.liftingNo,
              customerId: l.customer?.id,
              customer: l.customer?.companyName || 'Unknown',
              source: l.factory?.name || 'Factory',
              quantity: weightInQuintals,
              unit: 'Quintal',
              unitPrice,
              estValue,
              deliveryDate: l.liftingDate,
              status: l.status,
              isInvoiced: false,
            };
          });

        // 2. Fetch Aggregate Deliveries and check strictly against active invoices
        const aggregateDeliveries = await prisma.aggregateDelivery.findMany({
          where: {
            status: { in: ['Delivered', 'Verified', 'Settled', 'Dispatched'] },
            ...(startDate || endDate ? { dispatchDate: liftingDateFilter } : {}),
          },
          orderBy: { dispatchDate: 'desc' },
        });

        const aggCustIds = Array.from(new Set(aggregateDeliveries.map((d) => d.customerId)));
        const aggCustomers = await prisma.customer.findMany({
          where: { id: { in: aggCustIds } },
          select: { id: true, companyName: true, code: true },
        });
        const aggCustMap = new Map(aggCustomers.map((c) => [c.id, c.companyName]));

        const uninvoicedAggItems = aggregateDeliveries
          .filter((d) => !isDispatchInvoiced(d))
          .map((d) => {
            const volume = Number(d.deliveredVolume || d.loadedVolume || 0);
            let customerPrice = 0;
            if (d.registeredBy && typeof d.registeredBy === 'string' && d.registeredBy.startsWith('{')) {
              try {
                const meta = JSON.parse(d.registeredBy);
                if (meta.customerPrice && Number(meta.customerPrice) > 0) {
                  customerPrice = Number(meta.customerPrice);
                }
              } catch {}
            }
            const unitPrice = customerPrice > 0 ? customerPrice : Number(d.aggregateValue || d.transportRate || 0);
            const estValue = Math.round(volume * unitPrice * 100) / 100;
            return {
              id: d.id,
              type: 'AGGREGATE' as const,
              division: 'AGGREGATE',
              referenceNo: d.dispatchNo,
              customerId: d.customerId,
              customer: aggCustMap.get(d.customerId) || 'Customer',
              source: d.padNumber ? `Pad #${d.padNumber}` : `Site Dispatch`,
              quantity: volume,
              unit: 'm³',
              unitPrice,
              estValue,
              deliveryDate: d.deliveryDate || d.dispatchDate,
              status: d.status,
              isInvoiced: false,
            };
          });

        const uninvoicedItems = [...uninvoicedCementItems, ...uninvoicedAggItems].sort(
          (a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
        );

        const uninvoicedTotalValue = uninvoicedItems.reduce((s, i) => s + i.estValue, 0);

        data = {
          records: invoices.map((inv) => {
            const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
            const deliveryRefsSet = new Set<string>();
            const deliveryIdsSet = new Set<string>();
            const itemsBreakdown: Array<{
              id?: string;
              ref: string;
              type: 'CEMENT' | 'AGGREGATE' | 'OTHER';
              name?: string;
              description?: string;
              quantity?: number;
              unit?: string;
              unitPrice?: number;
              total?: number;
            }> = [];

            // Handle direct cement lifting relationship
            if (inv.cementLifting?.liftingNo) {
              deliveryRefsSet.add(inv.cementLifting.liftingNo);
              if (inv.cementLifting.id) deliveryIdsSet.add(inv.cementLifting.id);
              itemsBreakdown.push({
                id: inv.cementLifting.id,
                ref: inv.cementLifting.liftingNo,
                type: 'CEMENT',
                name: `Cement Lifting ${inv.cementLifting.liftingNo}`,
                description: `Linked Lifting #${inv.cementLifting.liftingNo} (${inv.cementLifting.status})`,
              });
            } else if (inv.liftingId) {
              deliveryIdsSet.add(inv.liftingId);
              const lifting = cementLiftings.find((l) => l.id === inv.liftingId);
              if (lifting) {
                deliveryRefsSet.add(lifting.liftingNo);
                itemsBreakdown.push({
                  id: lifting.id,
                  ref: lifting.liftingNo,
                  type: 'CEMENT',
                  name: `Cement Lifting ${lifting.liftingNo}`,
                  description: `Direct Lifting Reference (${lifting.status})`,
                });
              }
            }

            // Parse items JSON for dispatches / liftings
            const parsed = safelyParseItems(inv.items);
            if (parsed.length > 0) {
              parsed.forEach((item: any, idx: number) => {
                const itemRefs: string[] = [];

                if (item.liftingNo) itemRefs.push(String(item.liftingNo));
                if (item.liftingNos && Array.isArray(item.liftingNos)) {
                  item.liftingNos.forEach((no: any) => itemRefs.push(String(no)));
                }
                if (item.dispatchNo) itemRefs.push(String(item.dispatchNo));
                if (item.dispatchNos && Array.isArray(item.dispatchNos)) {
                  item.dispatchNos.forEach((no: any) => itemRefs.push(String(no)));
                }
                if (item.padNumber) itemRefs.push(String(item.padNumber));
                if (item.podNumber) itemRefs.push(String(item.podNumber));
                if (item.podNumbers && Array.isArray(item.podNumbers)) {
                  item.podNumbers.forEach((p: any) => itemRefs.push(String(p)));
                }

                // Match text patterns
                const text = `${item.item || ''} ${item.name || ''} ${item.description || ''} ${item.itemName || ''}`;
                
                const lftMatches = text.match(/(?:LIFT|LFT)-[\w-]+/gi);
                if (lftMatches) lftMatches.forEach((m) => itemRefs.push(m));

                const dispMatches = text.match(/(?:DISP|DSP|AGG)-[\w-]+/gi);
                if (dispMatches) dispMatches.forEach((m) => itemRefs.push(m));

                const podMatches = text.match(/(?:POD|PAD)s?\s*#?\s*([\w/-]+)/gi);
                if (podMatches) {
                  podMatches.forEach((matchStr) => {
                    const cleaned = matchStr.replace(/^(?:POD|PAD)s?\s*#?/i, '').trim();
                    if (cleaned) itemRefs.push(cleaned);
                  });
                }

                // Add to overall sets
                itemRefs.forEach((r) => deliveryRefsSet.add(r));

                const id = item.deliveryId || item.liftingId || item.dispatchId || item.id;
                if (id) deliveryIdsSet.add(String(id));
                if (item.liftingIds && Array.isArray(item.liftingIds)) {
                  item.liftingIds.forEach((i: any) => deliveryIdsSet.add(String(i)));
                }

                // Determine item type based on properties and division
                let itemType: 'CEMENT' | 'AGGREGATE' | 'OTHER' = 'OTHER';
                if (item.liftingNo || item.liftingId || item.liftingNos || inv.division === 'CEMENT' || lftMatches) {
                  itemType = 'CEMENT';
                } else if (item.dispatchNo || item.deliveryId || item.dispatchId || item.dispatchNos || inv.division === 'AGGREGATE' || dispMatches) {
                  itemType = 'AGGREGATE';
                }

                const primaryRef = itemRefs[0] || (id ? String(id) : `Item #${idx + 1}`);

                itemsBreakdown.push({
                  id: id ? String(id) : `item-${idx}`,
                  ref: primaryRef,
                  type: itemType,
                  name: item.item || item.name || `${itemType === 'CEMENT' ? 'Lifting' : itemType === 'AGGREGATE' ? 'Dispatch' : 'Item'} ${primaryRef}`,
                  description: item.description || '',
                  quantity: typeof item.qty === 'number' ? item.qty : (typeof item.quantity === 'number' ? item.quantity : undefined),
                  unit: item.unit || (itemType === 'CEMENT' ? 'Tons' : itemType === 'AGGREGATE' ? 'm³' : ''),
                  unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : undefined,
                  total: typeof item.total === 'number' ? item.total : undefined,
                });
              });
            }

            // Fallback for direct lifting if breakdown still empty
            if (itemsBreakdown.length === 0 && (inv.liftingId || inv.cementLifting)) {
              const liftingRef = inv.cementLifting?.liftingNo || `Lifting-${inv.liftingId}`;
              deliveryRefsSet.add(liftingRef);
              itemsBreakdown.push({
                id: inv.liftingId || inv.cementLifting?.id,
                ref: liftingRef,
                type: 'CEMENT',
                name: `Cement Lifting ${liftingRef}`,
                description: 'Linked via direct lifting relationship',
              });
            }

            const deliveryRefs = Array.from(deliveryRefsSet);
            const deliveryIds = Array.from(deliveryIdsSet);
            const dispatchesCount = itemsBreakdown.filter((i) => i.type === 'AGGREGATE').length || (inv.division === 'AGGREGATE' ? deliveryRefs.length : 0);
            const liftingsCount = itemsBreakdown.filter((i) => i.type === 'CEMENT').length || (inv.division === 'CEMENT' ? deliveryRefs.length : 0);
            const deliveriesCount = Math.max(deliveryRefs.length, itemsBreakdown.length);

            return {
              id: inv.id,
              invoiceNo: inv.invoiceNo,
              fsNo: inv.fsNo || null,
              date: inv.invoiceDate,
              customer: inv.customer?.companyName || 'Unknown',
              customerCode: inv.customer?.code || '',
              amount: inv.totalAmount,
              vat: inv.vatAmount,
              paid: paid,
              status: inv.status,
              division: inv.division,
              deliveryRef: deliveryRefs.length > 0 ? deliveryRefs.join(', ') : null,
              deliveryRefs,
              deliveryIds,
              deliveriesCount,
              dispatchesCount,
              liftingsCount,
              itemsBreakdown,
            };
          }),
          summary: {
            totalInvoices: summary._count,
            totalAmount: summary._sum.totalAmount || 0,
            totalVAT: summary._sum.vatAmount || 0,
            totalPaid: totalPaid,
            totalOutstanding: (summary._sum.totalAmount || 0) - totalPaid,
          },
          deliveredNotInvoiced: {
            count: uninvoicedItems.length,
            cementCount: uninvoicedCementItems.length,
            aggregateCount: uninvoicedAggItems.length,
            totalValue: uninvoicedTotalValue,
            items: uninvoicedItems,
          },
          pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        };
        break;
      }

      case 'purchase': {
        const whereClausePO: any = {};
        const whereClauseCP: any = {};
        if (startDate || endDate) {
          whereClausePO.createdAt = dateFilter;
          whereClauseCP.createdAt = dateFilter;
        }

        // Fetch both PurchaseOrders (aggregate) and CementPurchases
        const [orders, poTotal, poSummary, cementPurchases, cpTotal, cpSummary] = await Promise.all([
          prisma.purchaseOrder.findMany({
            where: whereClausePO,
            take: 500,
            include: { supplier: { select: { companyName: true } } },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.purchaseOrder.count({ where: whereClausePO }),
          prisma.purchaseOrder.aggregate({
            where: whereClausePO,
            _sum: { totalAmount: true },
            _count: true,
          }),
          prisma.cementPurchase.findMany({
            where: whereClauseCP,
            take: 500,
            include: { factory: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.cementPurchase.count({ where: whereClauseCP }),
          prisma.cementPurchase.aggregate({
            where: whereClauseCP,
            _sum: { totalAmount: true },
            _count: true,
          }),
        ]);

        // Merge and sort by date
        const allRecords = [
          ...orders.map((po) => ({
            id: po.id,
            poNumber: po.poNo,
            date: po.createdAt,
            supplier: po.supplier.companyName,
            amount: po.totalAmount,
            status: po.status,
            type: 'PO',
          })),
          ...cementPurchases.map((cp) => ({
            id: cp.id,
            poNumber: cp.purchaseNo,
            date: cp.createdAt,
            supplier: cp.factory?.name || '—',
            amount: cp.totalAmount,
            status: cp.status,
            type: 'Cement',
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const combinedTotal = poTotal + cpTotal;
        const paged = allRecords.slice(skip, skip + limit);

        data = {
          records: paged,
          summary: {
            totalOrders: (poSummary._count || 0) + (cpSummary._count || 0),
            totalAmount: (poSummary._sum.totalAmount || 0) + (cpSummary._sum.totalAmount || 0),
          },
          pagination: { total: combinedTotal, page, limit, pages: Math.ceil(combinedTotal / limit) },
        };
        break;
      }

      case 'financial': {
        const whereClause: any = {};
        if (startDate || endDate) whereClause.entryDate = dateFilter;

        const [entries, total] = await Promise.all([
          prisma.journalEntry.findMany({
            where: whereClause,
            skip,
            take: limit,
            include: {
              account: { select: { accountCode: true, accountName: true } },
            },
            orderBy: { entryDate: 'desc' },
          }),
          prisma.journalEntry.count({ where: whereClause }),
        ]);

        // Calculate account balances from journal entries
        const accountsData = await prisma.chartOfAccount.findMany({
          where: { isActive: true },
          orderBy: { accountCode: 'asc' },
        });

        const accountBalances: Record<string, number> = {};
        for (const acc of accountsData) {
          const accEntries = await prisma.journalEntry.findMany({
            where: { accountId: acc.id },
          });
          const balance = accEntries.reduce((sum, entry) => {
            return sum + (entry.debit || 0) - (entry.credit || 0);
          }, 0);
          accountBalances[acc.id] = balance;
        }

        data = {
          records: entries.map((entry) => ({
            id: entry.id,
            voucherNo: entry.voucherNo,
            date: entry.entryDate,
            description: entry.description || '-',
            account: `${entry.account.accountCode} - ${entry.account.accountName}`,
            debit: entry.debit,
            credit: entry.credit,
          })),
          accountBalances: accountsData.map((acc) => ({
            id: acc.id,
            code: acc.accountCode,
            name: acc.accountName,
            type: acc.accountType,
            balance: accountBalances[acc.id] || 0,
          })),
          pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        };
        break;
      }

      case 'journal': {
        const accountId = searchParams.get('accountId') || '';
        const whereClause: any = {};
        if (startDate || endDate) whereClause.entryDate = dateFilter;
        if (accountId) whereClause.accountId = accountId;

        const [entries, total] = await Promise.all([
          prisma.journalEntry.findMany({
            where: whereClause,
            skip,
            take: limit,
            include: {
              account: { select: { accountCode: true, accountName: true } },
            },
            orderBy: { entryDate: 'desc' },
          }),
          prisma.journalEntry.count({ where: whereClause }),
        ]);

        data = {
          records: entries.map((entry) => ({
            id: entry.id,
            voucherNo: entry.voucherNo,
            date: entry.entryDate,
            description: entry.description || '-',
            account: `${entry.account.accountCode} - ${entry.account.accountName}`,
            debit: entry.debit,
            credit: entry.credit,
            refModule: entry.refModule || '-',
            refId: entry.refId || '-',
          })),
          pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        };
        break;
      }

      case 'voucher': {
        const whereClause: any = {};
        if (startDate || endDate) whereClause.voucherDate = dateFilter;
        const voucherType = searchParams.get('voucherType') || '';
        const voucherStatus = searchParams.get('voucherStatus') || '';
        if (voucherType) whereClause.voucherType = voucherType;
        if (voucherStatus) whereClause.status = voucherStatus;

        const [vouchers, total, summary] = await Promise.all([
          prisma.paymentVoucher.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { voucherDate: 'desc' },
          }),
          prisma.paymentVoucher.count({ where: whereClause }),
          prisma.paymentVoucher.aggregate({
            where: whereClause,
            _sum: { amount: true },
            _count: true,
          }),
        ]);

        // Group by type
        const byType = await prisma.paymentVoucher.groupBy({
          by: ['voucherType'],
          where: whereClause,
          _sum: { amount: true },
          _count: true,
        });

        // Group by status
        const byStatus = await prisma.paymentVoucher.groupBy({
          by: ['status'],
          where: whereClause,
          _sum: { amount: true },
          _count: true,
        });

        data = {
          records: vouchers.map((v) => ({
            id: v.id,
            voucherNo: v.voucherNo,
            date: v.voucherDate,
            type: v.voucherType,
            payeeName: v.payeeName,
            amount: v.amount,
            paymentMethod: v.paymentMethod,
            status: v.status,
            sourceModule: v.sourceModule,
            sourceRef: v.sourceRef,
          })),
          summary: {
            totalVouchers: summary._count,
            totalAmount: summary._sum.amount || 0,
            byType: byType.map((t) => ({
              type: t.voucherType,
              count: t._count,
              amount: t._sum.amount || 0,
            })),
            byStatus: byStatus.map((s) => ({
              status: s.status,
              count: s._count,
              amount: s._sum.amount || 0,
            })),
          },
          pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        };
        break;
      }

      case 'stock': {
        const stockBalances = await prisma.stockBalance.findMany({
          skip,
          take: limit,
          include: { item: { select: { code: true, name: true, category: true, unit: true } } },
          orderBy: { quantity: 'asc' },
        });

        const total = await prisma.stockBalance.count();

        const lowStockThreshold = 10;

        data = {
          records: stockBalances.map((sb) => ({
            id: sb.id,
            itemCode: sb.item.code,
            itemName: sb.item.name,
            category: sb.item.category,
            unit: sb.item.unit,
            warehouse: sb.warehouse,
            quantity: sb.quantity,
            minQuantity: lowStockThreshold,
            isLow: sb.quantity <= lowStockThreshold,
          })),
          pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        };
        break;
      }

      case 'hr': {
        const employees = await prisma.employee.findMany({
          select: {
            id: true,
            employeeNo: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
            baseSalary: true,
            employmentType: true,
            hireDate: true,
            status: true,
          },
          skip,
          take: limit,
          orderBy: { firstName: 'asc' },
        });

        const total = await prisma.employee.count();

        const deptSummary = await prisma.employee.groupBy({
          by: ['department'],
          where: { status: 'Active' },
          _count: true,
          _avg: { baseSalary: true },
        });

        data = {
          records: employees.map((emp) => ({
            id: emp.id,
            employeeNo: emp.employeeNo,
            name: `${emp.firstName} ${emp.lastName}`,
            department: emp.department,
            position: emp.position,
            salary: emp.baseSalary,
            type: emp.employmentType,
            hireDate: emp.hireDate,
            status: emp.status,
          })),
          departmentSummary: deptSummary.map((dept) => ({
            department: dept.department || 'Unassigned',
            count: dept._count,
            avgSalary: dept._avg.baseSalary || 0,
          })),
          pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        };
        break;
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid report type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
