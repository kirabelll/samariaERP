import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Clears all data from the database EXCEPT the User and UserPermission tables.
 * Run with: npx ts-node --compiler-options '{"module":"commonjs"}' prisma/clear-data.ts
 */
async function main() {
  console.log('⚠️  Clearing all data except users...\n');

  // Order matters due to foreign key constraints — delete child tables first
  const deleteOperations = [
    // Commission & exceptions
    prisma.commissionItem.deleteMany(),
    prisma.commissionCalculation.deleteMany(),
    prisma.exceptionLog.deleteMany(),

    // Bank reconciliation
    prisma.reconciliationItem.deleteMany(),
    prisma.bankReconciliation.deleteMany(),

    // Daily cash
    prisma.dailyCash.deleteMany(),

    // Deposits
    prisma.depositApplication.deleteMany(),
    prisma.customerDeposit.deleteMany(),

    // Documents
    prisma.document.deleteMany(),

    // Cement module
    prisma.cementPenalty.deleteMany(),
    prisma.cementBalance.deleteMany(),
    prisma.cementWeighbridge.deleteMany(),
    prisma.cementLifting.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.cementPurchase.deleteMany(),

    // Aggregate module
    prisma.aggregateProof.deleteMany(),
    prisma.aggregateSettlement.deleteMany(),
    prisma.truckPayment.deleteMany(),
    prisma.aggregateDelivery.deleteMany(),

    // Medical
    prisma.medicalStoreIssue.deleteMany(),
    prisma.medicalPricing.deleteMany(),
    prisma.medicalBatch.deleteMany(),
    prisma.medicalRequest.deleteMany(),

    // Stock
    prisma.stockAdjustment.deleteMany(),
    prisma.stockBalance.deleteMany(),

    // Sales & invoices
    prisma.customerPayment.deleteMany(),
    prisma.salesInvoice.deleteMany(),
    prisma.delivery.deleteMany(),
    prisma.salesOrder.deleteMany(),
    prisma.proforma.deleteMany(),
    prisma.salesAgreement.deleteMany(),
    prisma.salesCommission.deleteMany(),

    // Purchasing
    prisma.supplierPayment.deleteMany(),
    prisma.goodsReceive.deleteMany(),
    prisma.purchaseOrder.deleteMany(),

    // Finance
    prisma.paymentVoucher.deleteMany(),
    prisma.journalEntry.deleteMany(),
    prisma.bankTransaction.deleteMany(),
    prisma.bankAccount.deleteMany(),
    prisma.vatPeriod.deleteMany(),
    prisma.chartOfAccount.deleteMany(),

    // HR
    prisma.payrollItem.deleteMany(),
    prisma.payrollPeriod.deleteMany(),
    prisma.employeeAdvance.deleteMany(),
    prisma.leaveRequest.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.taxTable.deleteMany(),
    prisma.employee.deleteMany(),

    // Transporter module
    prisma.transporterRecovery.deleteMany(),
    prisma.transporterAgreementItem.deleteMany(),
    prisma.transporterAgreement.deleteMany(),
    prisma.transporterPricing.deleteMany(),
    prisma.truck.deleteMany(),
    prisma.transporter.deleteMany(),
    prisma.transportAssociation.deleteMany(),

    // Core entities
    prisma.supplierBank.deleteMany(),
    prisma.supplierAgreement.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.factory.deleteMany(),
    prisma.item.deleteMany(),
    prisma.unit.deleteMany(),
    prisma.category.deleteMany(),

    // System (keep users)
    prisma.approval.deleteMany(),
    prisma.activityLog.deleteMany(),
    prisma.telegramNotification.deleteMany(),
    prisma.systemSetting.deleteMany(),
    prisma.branch.deleteMany(),
    prisma.company.deleteMany(),
  ];

  // Execute all deletes in sequence
  for (const op of deleteOperations) {
    try {
      const result = await op;
      // Get table name from the operation
      console.log(`  ✓ Deleted ${result.count} records`);
    } catch (err: any) {
      console.log(`  ⚠ Skipped (may not exist): ${err.message?.slice(0, 80)}`);
    }
  }

  console.log('\n✅ Database cleared (users preserved).');

  // Show remaining user count
  const userCount = await prisma.user.count();
  console.log(`   Users remaining: ${userCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
