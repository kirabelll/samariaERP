import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const typeFilter = searchParams.get('type') || 'ALL'; // ALL, SUPPLIER, TRANSPORTER, FACTORY

    const now = Date.now();

    // 1. Fetch pending/approved supplier payments
    const pendingSupplierPayments = await prisma.supplierPayment.findMany({
      where: {
        status: { in: ['Pending', 'Approved'] },
      },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            companyName: true,
            phone: true,
            email: true,
            location: true,
            category: true,
            status: true,
          },
        },
        purchaseOrder: {
          select: {
            id: true,
            poNo: true,
            totalAmount: true,
          },
        },
      },
      orderBy: { paymentDate: 'asc' },
    });

    // 2. Fetch pending truck payments (Transporters)
    const pendingTruckPayments = await prisma.truckPayment.findMany({
      where: {
        status: { in: ['Draft', 'Approved', 'Pending'] },
      },
      orderBy: { periodFrom: 'asc' },
    });

    // Get transporter details for truck payments
    const transporterIds = Array.from(new Set(pendingTruckPayments.map((t) => t.transporterId)));
    const transporters = await prisma.transporter.findMany({
      where: { id: { in: transporterIds } },
      select: {
        id: true,
        code: true,
        companyName: true,
        phone: true,
        contactPerson: true,
        location: true,
        status: true,
      },
    });
    const transporterMap = new Map(transporters.map((t) => [t.id, t]));

    // Grouping by payee
    const payeeMap = new Map<string, any>();
    let grandTotalPayables = 0;
    const agingSummary = {
      current: 0,   // 0-30 days
      days30: 0,    // 31-60 days
      days60: 0,    // 61-90 days
      days90Plus: 0 // 90+ days
    };

    // Process Supplier Payments
    for (const sp of pendingSupplierPayments) {
      const supp = sp.supplier;
      if (!supp) continue;

      const amount = sp.amount || 0;
      if (amount <= 0) continue;

      grandTotalPayables += amount;

      const pDate = new Date(sp.paymentDate || sp.createdAt);
      const ageDays = Math.max(0, Math.floor((now - pDate.getTime()) / (1000 * 60 * 60 * 24)));
      let ageBracket = '0-30 days';
      if (ageDays > 90) {
        ageBracket = '90+ days';
        agingSummary.days90Plus += amount;
      } else if (ageDays > 60) {
        ageBracket = '61-90 days';
        agingSummary.days60 += amount;
      } else if (ageDays > 30) {
        ageBracket = '31-60 days';
        agingSummary.days30 += amount;
      } else {
        agingSummary.current += amount;
      }

      const cleanCode = (supp.code || supp.id.slice(-6)).toUpperCase();
      const accountCode = `2010-${cleanCode}`;
      const accountName = `AP - ${supp.companyName}`;

      if (!payeeMap.has(`SUPPLIER_${supp.id}`)) {
        payeeMap.set(`SUPPLIER_${supp.id}`, {
          payeeId: supp.id,
          payeeType: 'SUPPLIER',
          categoryLabel: supp.category || 'Supplier',
          companyName: supp.companyName,
          payeeCode: supp.code || 'N/A',
          accountCode,
          accountName,
          phone: supp.phone,
          email: supp.email,
          location: supp.location,
          status: supp.status,
          totalOutstanding: 0,
          pendingCount: 0,
          oldestAgeDays: 0,
          items: [],
        });
      }

      const entry = payeeMap.get(`SUPPLIER_${supp.id}`)!;
      entry.totalOutstanding += amount;
      entry.pendingCount += 1;
      if (ageDays > entry.oldestAgeDays) entry.oldestAgeDays = ageDays;

      entry.items.push({
        id: sp.id,
        itemType: 'SUPPLIER_PAYMENT',
        refNo: sp.paymentNo,
        secondaryRef: sp.purchaseOrder?.poNo || null,
        description: sp.description || `Payment to ${supp.companyName}`,
        paymentMethod: sp.paymentMethod,
        date: sp.paymentDate,
        amount,
        status: sp.status,
        ageDays,
        ageBracket,
      });
    }

    // Process Transporter Payments
    for (const tp of pendingTruckPayments) {
      const trans = transporterMap.get(tp.transporterId);
      const amount = tp.finalPayable || tp.totalNetPayment || 0;
      if (amount <= 0) continue;

      grandTotalPayables += amount;

      const pDate = new Date(tp.periodTo || tp.periodFrom);
      const ageDays = Math.max(0, Math.floor((now - pDate.getTime()) / (1000 * 60 * 60 * 24)));
      let ageBracket = '0-30 days';
      if (ageDays > 90) {
        ageBracket = '90+ days';
        agingSummary.days90Plus += amount;
      } else if (ageDays > 60) {
        ageBracket = '61-90 days';
        agingSummary.days60 += amount;
      } else if (ageDays > 30) {
        ageBracket = '31-60 days';
        agingSummary.days30 += amount;
      } else {
        agingSummary.current += amount;
      }

      const cleanCode = (trans?.code || tp.transporterId.slice(-6)).toUpperCase();
      const accountCode = `2010-${cleanCode}`;
      const name = trans?.companyName || `Transporter ${cleanCode}`;
      const accountName = `AP - ${name}`;

      if (!payeeMap.has(`TRANSPORTER_${tp.transporterId}`)) {
        payeeMap.set(`TRANSPORTER_${tp.transporterId}`, {
          payeeId: tp.transporterId,
          payeeType: 'TRANSPORTER',
          categoryLabel: 'Transporter',
          companyName: name,
          payeeCode: trans?.code || 'N/A',
          accountCode,
          accountName,
          phone: trans?.phone || '',
          email: null,
          location: trans?.location || '',
          status: trans?.status || 'Active',
          totalOutstanding: 0,
          pendingCount: 0,
          oldestAgeDays: 0,
          items: [],
        });
      }

      const entry = payeeMap.get(`TRANSPORTER_${tp.transporterId}`)!;
      entry.totalOutstanding += amount;
      entry.pendingCount += 1;
      if (ageDays > entry.oldestAgeDays) entry.oldestAgeDays = ageDays;

      entry.items.push({
        id: tp.id,
        itemType: 'TRUCK_PAYMENT',
        refNo: tp.paymentSheetNo,
        secondaryRef: `Period: ${new Date(tp.periodFrom).toLocaleDateString()} - ${new Date(tp.periodTo).toLocaleDateString()}`,
        description: `Transporter Payment Sheet #${tp.paymentSheetNo}`,
        paymentMethod: 'Bank Transfer',
        date: tp.periodTo,
        amount,
        status: tp.status,
        ageDays,
        ageBracket,
      });
    }

    let payees = Array.from(payeeMap.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    if (typeFilter !== 'ALL') {
      payees = payees.filter((p) => p.payeeType === typeFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      payees = payees.filter(
        (p) =>
          p.companyName.toLowerCase().includes(q) ||
          p.payeeCode.toLowerCase().includes(q) ||
          p.accountCode.toLowerCase().includes(q) ||
          (p.phone && p.phone.toLowerCase().includes(q)) ||
          p.items.some((it: any) => it.refNo.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        totalPayables: grandTotalPayables,
        payeeCount: payeeMap.size,
        totalPendingItems: pendingSupplierPayments.length + pendingTruckPayments.length,
        agingSummary,
        payees,
      },
    });
  } catch (error: any) {
    console.error('Error fetching payables breakdown:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
