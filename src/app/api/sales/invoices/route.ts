import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';
import { journalSalesInvoice } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

/**
 * Auto-generate or update VAT period when an invoice is created.
 * Creates a VatPeriod for the invoice month if it doesn't exist.
 */
async function autoCreateVatPeriod(invoice: any) {
  try {
    const invoiceDate = new Date(invoice.invoiceDate);
    const periodName = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`;
    const startDate = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth(), 1);
    const endDate = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth() + 1, 0);

    // Check if period already exists
    let period = await prisma.vatPeriod.findFirst({
      where: {
        periodName,
      },
    });

    // Create period if it doesn't exist
    if (!period) {
      period = await prisma.vatPeriod.create({
        data: {
          periodName,
          startDate,
          endDate,
          status: 'Open',
        },
      });
    }

    return { created: period.id === period.id, periodId: period.id, periodName };
  } catch (error: any) {
    console.error('Auto VAT period creation failed:', error);
    return { created: false, reason: error.message };
  }
}

/**
 * Auto-calculate commission for the salesperson when an invoice is created.
 * Looks up active SalesCommission rules and creates a CommissionItem.
 */
async function autoCalcCommission(invoice: any) {
  try {
    if (!invoice.createdBy) return { created: false, reason: 'No createdBy (salesperson) on invoice' };

    // Find active commission rule for this salesperson
    const rule = await prisma.salesCommission.findFirst({
      where: {
        salespersonId: invoice.createdBy,
        status: 'Active',
        effectiveFrom: { lte: new Date() },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date() } },
        ],
      },
    });

    if (!rule) return { created: false, reason: 'No active commission rule for salesperson' };

    // Find or create a commission calculation for current month
    const now = new Date();
    const periodFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let calculation = await prisma.commissionCalculation.findFirst({
      where: {
        salespersonId: invoice.createdBy,
        periodFrom: { gte: periodFrom },
        periodTo: { lte: new Date(periodTo.getTime() + 86400000) },
        status: 'Calculated',
      },
    });

    if (!calculation) {
      const cCount = await prisma.commissionCalculation.count();
      const calculationNo = `COM-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${String(cCount + 1).padStart(4, '0')}`;

      calculation = await prisma.commissionCalculation.create({
        data: {
          calculationNo,
          salespersonId: invoice.createdBy,
          periodFrom,
          periodTo,
          basis: rule.basis,
          commissionRate: rule.ratePercent,
          totalSales: 0,
          grossCommission: 0,
          netCommission: 0,
          status: 'Calculated',
        },
      });
    }

    // Create commission item for this invoice
    const commissionBase = rule.basis === 'invoiced' ? invoice.totalAmount : 0;
    const commissionAmount = (commissionBase * rule.ratePercent) / 100;

    await prisma.commissionItem.create({
      data: {
        calculationId: calculation.id,
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo,
        customerId: invoice.customerId,
        customerName: invoice.customer?.companyName || '',
        invoiceAmount: invoice.totalAmount,
        paidAmount: 0,
        commissionBase,
        rate: rule.ratePercent,
        commissionAmount,
      },
    });

    // Update calculation totals
    const allItems = await prisma.commissionItem.findMany({ where: { calculationId: calculation.id } });
    const totalSales = allItems.reduce((sum, i) => sum + i.invoiceAmount, 0);
    const grossCommission = allItems.reduce((sum, i) => sum + i.commissionAmount, 0);

    await prisma.commissionCalculation.update({
      where: { id: calculation.id },
      data: { totalSales, grossCommission, netCommission: grossCommission - (calculation.adjustments || 0) },
    });

    return { created: true, calculationNo: calculation.calculationNo, commissionAmount, rate: rule.ratePercent };
  } catch (error: any) {
    console.error('Auto-commission calculation failed:', error);
    return { created: false, reason: error.message };
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const division = searchParams.get('division') || '';
    const customerId = searchParams.get('customerId') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { invoiceNo: { contains: search, mode: 'insensitive' } },
        { fsNo: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      // Support multiple statuses separated by comma
      const statusList = status.split(',').map(s => s.trim());
      if (statusList.length > 1) {
        whereClause.status = { in: statusList };
      } else {
        whereClause.status = status;
      }
    }
    if (division) {
      whereClause.division = division;
    }
    if (customerId) {
      whereClause.customerId = customerId;
    }

    const [rawInvoices, total] = await Promise.all([
      prisma.salesInvoice.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          customer: true,
          salesOrder: true,
          payments: { where: { status: { not: 'Rejected' } } },
        },
        orderBy: { invoiceDate: 'desc' },
      }),
      prisma.salesInvoice.count({ where: whereClause }),
    ]);

    // Compute paid amounts, remaining amounts, and live payment status for each invoice
    const data = await Promise.all(
      rawInvoices.map(async (inv: any) => {
        const totalPaidCustomer = (inv.payments || []).reduce(
          (sum: number, p: any) => sum + Number(p.amount || 0) + Number(p.withholdingAmount || 0),
          0
        );

        // Also check any payment vouchers linked to this sales invoice (RECEIPT or PAYMENT)
        const voucherAgg = await prisma.paymentVoucher.aggregate({
          where: {
            sourceModule: 'SALES',
            OR: [{ sourceId: inv.id }, { sourceRef: inv.invoiceNo }],
            status: { notIn: ['Cancelled', 'Rejected'] },
          },
          _sum: { amount: true },
        });
        const totalPaidVouchers = Number(voucherAgg._sum.amount || 0);

        const totalPaid = Math.max(totalPaidCustomer, totalPaidVouchers);
        const totalAmount = Number(inv.totalAmount || 0);
        const remainingAmount = Math.max(0, Math.round((totalAmount - totalPaid) * 100) / 100);

        let computedStatus = inv.status;
        if (totalPaid >= totalAmount || Math.abs(totalAmount - totalPaid) < 1) {
          computedStatus = 'Paid';
        } else if (totalPaid > 0) {
          computedStatus = 'Partial';
        } else {
          computedStatus = inv.status || 'Unpaid';
        }

        // Persist computed status to database if out of sync
        if (computedStatus !== inv.status && inv.id) {
          await prisma.salesInvoice.update({
            where: { id: inv.id },
            data: { status: computedStatus },
          }).catch(() => null);
        }

        return {
          ...inv,
          paidAmount: totalPaid,
          remainingAmount,
          status: computedStatus,
          isPartial: computedStatus === 'Partial' || (totalPaid > 0 && totalPaid < totalAmount),
        };
      })
    );

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
    console.error('Error fetching invoices:', error);
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
      salesOrderId,
      liftingId,
      division,
      items,
      subtotal,
      vatRate,
      vatAmount,
      withholding,
      totalAmount,
      dueDate,
      createdBy,
      fsNo,
      fsNumber,
    } = body;

    if (!customerId || !division || !items || !totalAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: customerId, division, items, totalAmount' },
        { status: 400 }
      );
    }

    // Ensure customerId exists in Customer table (support selecting a Supplier)
    let validCustomer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!validCustomer) {
      const supplier = await prisma.supplier.findUnique({ where: { id: customerId } });
      if (supplier) {
        validCustomer = await prisma.customer.upsert({
          where: { id: supplier.id },
          update: {
            companyName: supplier.companyName,
            tin: supplier.tin || undefined,
            phone: supplier.phone || '0000000000',
          },
          create: {
            id: supplier.id,
            companyName: supplier.companyName,
            tin: supplier.tin || undefined,
            phone: supplier.phone || '0000000000',
            withholding: supplier.withholding,
            withholdRate: supplier.withholdRate || 2,
          },
        });
      }
    }

    // Generate invoice number
    const lastInvoice = await prisma.salesInvoice.findFirst({
      orderBy: { invoiceNo: 'desc' },
      select: { invoiceNo: true },
    });
    let nextInvoiceSeq = 1;
    if (lastInvoice?.invoiceNo) {
      const match = lastInvoice.invoiceNo.match(/(\d+)$/);
      if (match) nextInvoiceSeq = parseInt(match[1]) + 1;
    }
    const invoiceNo = `INV-${String(nextInvoiceSeq).padStart(7, '0')}`;

    const finalFsNo = fsNo ? String(fsNo).trim() : (fsNumber ? String(fsNumber).trim() : null);

    const invoice = await prisma.salesInvoice.create({
      data: {
        invoiceNo,
        fsNo: finalFsNo || null,
        customerId,
        salesOrderId: salesOrderId || null,
        liftingId: liftingId || null,
        division,
        items: typeof items === 'string' ? items : JSON.stringify(items || []),
        subtotal: subtotal || 0,
        vatRate: vatRate || 15,
        vatAmount: vatAmount || 0,
        withholding: withholding || 0,
        totalAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'Unpaid',
        createdBy: createdBy || null,
      },
      include: { customer: true, salesOrder: true },
    });

    notify({ module: 'SALES', event: 'invoice_created', details: { invoiceNo: invoice.invoiceNo, totalAmount: invoice.totalAmount, vatAmount: invoice.vatAmount } });

    // Auto-create VAT period for the invoice month
    let vatPeriodResult = null;
    vatPeriodResult = await autoCreateVatPeriod(invoice);

    // Auto-calculate commission for the salesperson
    let commissionResult = null;
    if (invoice.createdBy) {
      commissionResult = await autoCalcCommission(invoice);
    }

    // Auto-log exception if invoice exceeds credit limit
    try {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (customer && (customer as any).creditLimit) {
        const unpaidTotal = await prisma.salesInvoice.aggregate({
          where: { customerId, status: { in: ['Unpaid', 'Partial'] } },
          _sum: { totalAmount: true },
        });
        const outstanding = unpaidTotal._sum.totalAmount || 0;
        if (outstanding > (customer as any).creditLimit) {
          await prisma.exceptionLog.create({
            data: {
              exceptionType: 'OVER_CREDIT',
              severity: 'High',
              module: 'SALES',
              recordId: invoice.id,
              recordRef: invoice.invoiceNo,
              description: `Customer ${customer.companyName} exceeded credit limit: Outstanding ETB ${outstanding.toLocaleString('en-US')} vs Limit ETB ${(customer as any).creditLimit.toLocaleString('en-US')}`,
              status: 'Open',
            },
          });
        }
      }
    } catch (e) {
      // Non-critical - don't fail invoice creation
      console.error('Exception check failed:', e);
    }

    // Auto-create journal entries (Debit AR, Credit Revenue + VAT)
    let journalResult = null;
    try {
      journalResult = await journalSalesInvoice(invoice);
      if (journalResult.created) {
        notify({
          module: 'FINANCE',
          event: 'auto_journal_posted',
          details: {
            source: 'Sales Invoice',
            ref: invoice.invoiceNo,
            journalNo: journalResult.voucherNo,
            amount: invoice.totalAmount,
          },
        });
      }
    } catch (e) {
      console.error('Auto-journal for invoice failed:', e);
    }

    return NextResponse.json(
      {
        success: true,
        data: invoice,
        ...(vatPeriodResult ? { vatPeriod: vatPeriodResult } : {}),
        ...(commissionResult ? { commission: commissionResult } : {}),
        ...(journalResult ? { journal: journalResult } : {}),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
