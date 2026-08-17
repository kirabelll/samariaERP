import { prisma } from './prisma';
import { notify } from './telegram';

/**
 * Synchronizes and updates status of linked source documents (CementPurchase, AggregateDelivery, PurchaseOrder, SalesInvoice)
 * whenever a PaymentVoucher is Approved or Posted.
 */
export async function updateVoucherLinkedDocument(voucher: any) {
  if (!voucher || !voucher.sourceModule) return;

  const { sourceModule, sourceId, sourceRef, amount } = voucher;

  // 1. CEMENT PURCHASES
  if (sourceModule === 'CEMENT' && (sourceId || sourceRef)) {
    try {
      let purchase = sourceId
        ? await prisma.cementPurchase.findUnique({ where: { id: sourceId } })
        : null;

      if (!purchase && sourceRef) {
        purchase = await prisma.cementPurchase.findFirst({
          where: { purchaseNo: sourceRef },
        });
      }

      if (purchase) {
        // Calculate total paid across all vouchers for this purchase
        const linkedVouchers = await prisma.paymentVoucher.findMany({
          where: {
            sourceModule: { in: ['CEMENT', 'CEMENT_PURCHASE', 'cement'] },
            OR: [
              { sourceId: purchase.id },
              { sourceRef: { contains: purchase.purchaseNo, mode: 'insensitive' } },
            ],
            status: { notIn: ['Cancelled', 'Rejected'] },
          },
          select: { amount: true },
        });

        const voucherPaidTotal = linkedVouchers.reduce((sum, v) => sum + Number(v.amount), 0);
        const currentPaid = Number(purchase.paidAmount || 0);
        const totalPaid = Math.max(voucherPaidTotal, currentPaid, Number(amount || 0));
        const totalAmount = Number(purchase.totalAmount);

        let paymentStatus = 'Unpaid';
        if (totalPaid >= totalAmount || Math.abs(totalAmount - totalPaid) < 1) {
          paymentStatus = 'Paid';
        } else if (totalPaid > 0) {
          paymentStatus = 'Partial';
        }

        // Auto-activate purchase when paid or partially paid!
        let newStatus = purchase.status;
        if ((paymentStatus === 'Paid' || paymentStatus === 'Partial') && (purchase.status === 'Approved' || purchase.status === 'Checked' || purchase.status === 'Pending')) {
          newStatus = 'Active';
        }

        await prisma.cementPurchase.update({
          where: { id: purchase.id },
          data: {
            paidAmount: totalPaid,
            paymentStatus,
            status: newStatus,
            paymentRef: voucher.voucherNo || voucher.refNo || purchase.paymentRef,
            paymentDate: new Date(),
          },
        });

        notify({
          module: 'CEMENT',
          event: 'cement_purchase_paid',
          details: {
            purchaseNo: purchase.purchaseNo,
            totalAmount,
            paidAmount: totalPaid,
            paymentStatus,
            status: newStatus,
            voucherNo: voucher.voucherNo,
          },
        });
      }
    } catch (err: any) {
      console.error('[VoucherSync] Failed to update CementPurchase status:', err.message);
    }
  }

  // 2. AGGREGATE DISPATCHES
  if (sourceModule === 'AGGREGATE' && (sourceId || sourceRef)) {
    try {
      const ids = (sourceId || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      const refs = (sourceRef || '').split(',').map((s: string) => s.trim()).filter(Boolean);

      const whereOr: any[] = [];
      if (ids.length > 0) whereOr.push({ id: { in: ids } });
      if (refs.length > 0) whereOr.push({ dispatchNo: { in: refs } });

      if (whereOr.length > 0) {
        await prisma.aggregateDelivery.updateMany({
          where: {
            OR: whereOr,
            status: { in: ['Verified', 'Delivered', 'Dispatched'] },
          },
          data: { status: 'Settled' },
        });

        notify({
          module: 'AGGREGATE',
          event: 'aggregate_bulk_settled',
          details: {
            voucherNo: voucher.voucherNo,
            totalAmount: `ETB ${Number(amount || 0).toLocaleString('en-US')}`,
            payee: voucher.payeeName,
          },
        });
      }
    } catch (err: any) {
      console.error('[VoucherSync] Failed to update AggregateDelivery status:', err.message);
    }
  }

  // 3. PURCHASE ORDERS
  if (sourceModule === 'PURCHASE' && (sourceId || sourceRef)) {
    try {
      let po = sourceId
        ? await prisma.purchaseOrder.findUnique({ where: { id: sourceId } })
        : null;

      if (!po && sourceRef) {
        po = await prisma.purchaseOrder.findFirst({ where: { poNo: sourceRef } });
      }

      if (po) {
        const linkedVouchers = await prisma.paymentVoucher.findMany({
          where: {
            sourceModule: 'PURCHASE',
            OR: [{ sourceId: po.id }, { sourceRef: po.poNo }],
            status: { in: ['Posted', 'Approved'] },
          },
          select: { amount: true },
        });

        const poPaidTotal = linkedVouchers.reduce((sum, v) => sum + Number(v.amount), 0);
        const poTotal = Number(po.totalAmount);
        if (poPaidTotal >= poTotal || Math.abs(poTotal - poPaidTotal) < 1) {
          await prisma.purchaseOrder.update({
            where: { id: po.id },
            data: { status: 'Completed' },
          });
        }
      }
    } catch (err: any) {
      console.error('[VoucherSync] Failed to update PurchaseOrder status:', err.message);
    }
  }

  // 4. SALES INVOICES
  if (sourceModule === 'SALES' && (sourceId || sourceRef)) {
    try {
      let invoice = sourceId
        ? await prisma.salesInvoice.findUnique({ where: { id: sourceId } })
        : null;

      if (!invoice && sourceRef) {
        invoice = await prisma.salesInvoice.findFirst({ where: { invoiceNo: sourceRef } });
      }

      if (invoice) {
        const allReceipts = await prisma.paymentVoucher.findMany({
          where: {
            sourceModule: 'SALES',
            OR: [{ sourceId: invoice.id }, { sourceRef: invoice.invoiceNo }],
            voucherType: 'RECEIPT',
            status: { in: ['Posted', 'Approved'] },
          },
          select: { amount: true },
        });
        const totalPaidVouchers = allReceipts.reduce((sum, v) => sum + Number(v.amount), 0);

        const customerPaymentAgg = await prisma.customerPayment.aggregate({
          where: { invoiceId: invoice.id, status: 'Verified' },
          _sum: { amount: true, withholdingAmount: true },
        });
        const totalPaidCustomer = Number(customerPaymentAgg._sum.amount || 0);
        const totalWithheld = Number(customerPaymentAgg._sum.withholdingAmount || 0);

        const totalPaid = Math.max(totalPaidVouchers, totalPaidCustomer);
        const totalSettled = Math.round((totalPaid + totalWithheld) * 100) / 100;
        const invoiceTotal = Math.round(Number(invoice.totalAmount) * 100) / 100;
        const newStatus = (totalSettled >= invoiceTotal || Math.abs(invoiceTotal - totalSettled) < 1)
          ? 'Paid' : totalSettled > 0 ? 'Partial' : 'Unpaid';

        await prisma.salesInvoice.update({
          where: { id: invoice.id },
          data: { status: newStatus },
        });
      }
    } catch (err: any) {
      console.error('[VoucherSync] Failed to update SalesInvoice status:', err.message);
    }
  }
}
