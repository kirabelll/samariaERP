import { prisma } from './prisma';
import { notify } from './telegram';

// ============================================================
// APPROVAL LEVEL → ROLE MAPPING
// ============================================================
// Level 1: Department Head (MANAGER)
// Level 2: Finance Manager (FINANCE)
// Level 3: General Manager (ADMIN)

const LEVEL_ROLES: Record<number, { title: string; roles: string[] }> = {
  1: { title: 'Department Head', roles: ['MANAGER'] },
  2: { title: 'Finance Manager', roles: ['FINANCE', 'MANAGER'] },
  3: { title: 'General Manager', roles: ['ADMIN'] },
};

// Module → which roles can approve at each level (overrides)
const MODULE_LEVEL_ROLES: Record<string, Record<number, string[]>> = {
  LeaveRequest:       { 1: ['MANAGER', 'HR'], 2: ['HR'], 3: ['ADMIN'] },
  EmployeeAdvance:    { 1: ['MANAGER', 'HR'], 2: ['FINANCE'], 3: ['ADMIN'] },
  PayrollPeriod:      { 1: ['HR'], 2: ['FINANCE'], 3: ['ADMIN'] },
  MedicalRequest:     { 1: ['MEDICAL_PHARMACIST', 'MANAGER'], 2: ['FINANCE'], 3: ['ADMIN'] },
  PurchaseOrder:      { 1: ['PROCUREMENT', 'MANAGER'], 2: ['FINANCE'], 3: ['ADMIN'] },
  SupplierPayment:    { 1: ['FINANCE', 'MANAGER'], 2: ['FINANCE'], 3: ['ADMIN'] },
  PaymentVoucher:     { 1: ['MANAGER'], 2: ['FINANCE'], 3: ['ADMIN'] },
  SalesInvoice:       { 1: ['SALES', 'MANAGER'], 2: ['FINANCE'], 3: ['ADMIN'] },
  SalesOrder:         { 1: ['SALES', 'MANAGER'], 2: ['FINANCE'], 3: ['ADMIN'] },
  CementPurchase:     { 1: ['FINANCE', 'MANAGER'], 2: ['MANAGER'], 3: ['ADMIN'] },
  SalesAgreement:     { 1: ['FINANCE', 'MANAGER'], 2: ['FINANCE'], 3: ['ADMIN'] },
  SupplierAgreement:  { 1: ['FINANCE', 'MANAGER'], 2: ['FINANCE'], 3: ['ADMIN'] },
};

// How many levels required based on amount
function getRequiredLevels(amount: number): number {
  if (amount <= 0) return 1;
  if (amount < 50000) return 1;    // < 50K ETB: Department Head only
  if (amount < 200000) return 2;   // < 200K ETB: + Finance Manager
  return 3;                         // >= 200K ETB: + General Manager
}

// Module → human-readable name
const MODULE_LABELS: Record<string, string> = {
  PaymentVoucher: 'Payment Voucher',
  PurchaseOrder: 'Purchase Order',
  SupplierPayment: 'Supplier Payment',
  LeaveRequest: 'Leave Request',
  EmployeeAdvance: 'Employee Advance',
  PayrollPeriod: 'Payroll',
  MedicalRequest: 'Medical Request',
  SalesInvoice: 'Sales Invoice',
  CommissionCalculation: 'Commission',
  SalesOrder: 'Sales Order',
  CementPurchase: 'Cement Purchase',
  SalesAgreement: 'Sales Agreement',
  SupplierAgreement: 'Supplier Agreement',
};

// Module → Telegram notification module key
const MODULE_TELEGRAM_MAP: Record<string, string> = {
  PaymentVoucher: 'FINANCE',
  PurchaseOrder: 'PURCHASING',
  SupplierPayment: 'PURCHASING',
  LeaveRequest: 'HR',
  EmployeeAdvance: 'HR',
  PayrollPeriod: 'HR',
  MedicalRequest: 'MEDICAL',
  SalesInvoice: 'SALES',
  CommissionCalculation: 'SALES',
  SalesOrder: 'SALES',
  CementPurchase: 'CEMENT',
  SalesAgreement: 'SALES',
  SupplierAgreement: 'PURCHASING',
};

// Module → link path for the approvals page
const MODULE_LINK_MAP: Record<string, string> = {
  PaymentVoucher: '/dashboard/finance/vouchers',
  PurchaseOrder: '/dashboard/purchasing/orders',
  SupplierPayment: '/dashboard/purchasing/payments',
  LeaveRequest: '/dashboard/hr/leave',
  EmployeeAdvance: '/dashboard/hr/advances',
  PayrollPeriod: '/dashboard/hr/payroll',
  MedicalRequest: '/dashboard/medical/requests',
  SalesInvoice: '/dashboard/commercial/invoices',
  CommissionCalculation: '/dashboard/medical/commission',
  SalesOrder: '/dashboard/sales/orders',
  CementPurchase: '/dashboard/cement/purchases',
  SalesAgreement: '/dashboard/sales/agreements',
  SupplierAgreement: '/dashboard/supplier-agreements',
};

// ============================================================
// PUBLIC: Request Approval
// ============================================================
export interface RequestApprovalOptions {
  module: string;        // e.g. 'PaymentVoucher'
  recordId: string;      // ID of the source record
  recordRef: string;     // e.g. 'PV-20260513-0001'
  amount: number;        // For determining required levels
  description: string;   // e.g. 'Payment Voucher PV-001 — 150,000 ETB to ABC Supplier'
  requesterId: string;   // User ID of the person requesting
}

export async function requestApproval(options: RequestApprovalOptions) {
  const { module, recordId, recordRef, amount, description, requesterId } = options;
  const requiredLevels = getRequiredLevels(amount);

  // Create Level 1 approval
  const approval = await prisma.approval.create({
    data: {
      module,
      recordId,
      requesterId,
      status: 'PENDING',
      level: 1,
      amount,
      description,
      recordRef,
      requiredLevels,
      notes: `Level 1 — ${LEVEL_ROLES[1].title}`,
    },
  });

  // Get requester name for the notification
  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { firstName: true, lastName: true },
  });
  const requesterName = requester ? `${requester.firstName} ${requester.lastName}`.trim() : 'Unknown';

  // Determine which roles should receive Level 1 notification
  const targetRoles = MODULE_LEVEL_ROLES[module]?.[1] || LEVEL_ROLES[1].roles;

  // Find users with those roles who have Telegram configured
  const approvers = await prisma.user.findMany({
    where: {
      role: { in: targetRoles },
      status: 'ACTIVE',
      telegramChatId: { not: null },
    },
    select: { id: true, telegramChatId: true },
  });

  const approverIds = approvers.map(a => a.id);

  // Send Telegram notification to Level 1 approvers
  const moduleLabel = MODULE_LABELS[module] || module;
  const levelTitle = LEVEL_ROLES[1].title;

  notify({
    module: 'APPROVAL',
    event: 'approval_needed',
    details: {
      '📋 Type': moduleLabel,
      '🔖 Reference': recordRef,
      '💰 Amount': amount > 0 ? `${amount.toLocaleString('en-US')} ETB` : 'N/A',
      '👤 Requested By': requesterName,
      '📝 Description': description,
      '🔄 Level': `1 of ${requiredLevels} — ${levelTitle}`,
      '⏳ Action': `Awaiting ${levelTitle} approval`,
    },
    specificUserIds: approverIds.length > 0 ? approverIds : undefined,
    specificRoles: approverIds.length === 0 ? targetRoles : undefined,
  });

  return approval;
}

// ============================================================
// PUBLIC: Approve Record
// ============================================================
export async function approveRecord(approvalId: string, approverId: string, notes?: string) {
  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
    include: {
      requester: { select: { id: true, firstName: true, lastName: true, telegramChatId: true } },
    },
  });

  if (!approval) throw new Error('Approval not found');
  if (approval.status !== 'PENDING') throw new Error('Approval is not pending');

  const approver = await prisma.user.findUnique({
    where: { id: approverId },
    select: { firstName: true, lastName: true, role: true },
  });
  const approverName = approver ? `${approver.firstName} ${approver.lastName}`.trim() : 'Unknown';

  // Verify the approver has the right role for this level
  const targetRoles = MODULE_LEVEL_ROLES[approval.module]?.[approval.level] || LEVEL_ROLES[approval.level]?.roles || [];
  if (approver && !['ADMIN'].includes(approver.role) && !targetRoles.includes(approver.role)) {
    throw new Error(`Your role (${approver.role}) cannot approve Level ${approval.level} for ${approval.module}`);
  }

  // Mark current approval as APPROVED
  const updated = await prisma.approval.update({
    where: { id: approvalId },
    data: {
      status: 'APPROVED',
      approverId,
      notes: notes || `Approved by ${approverName}`,
      resolvedAt: new Date(),
    },
  });

  const currentLevel = approval.level;
  const requiredLevels = approval.requiredLevels;
  const moduleLabel = MODULE_LABELS[approval.module] || approval.module;

  if (currentLevel < requiredLevels) {
    // ---- Need next level approval ----
    const nextLevel = currentLevel + 1;
    const nextLevelInfo = LEVEL_ROLES[nextLevel];

    // Create next level approval
    await prisma.approval.create({
      data: {
        module: approval.module,
        recordId: approval.recordId,
        requesterId: approval.requesterId,
        status: 'PENDING',
        level: nextLevel,
        amount: approval.amount,
        description: approval.description,
        recordRef: approval.recordRef,
        requiredLevels,
        notes: `Level ${nextLevel} — ${nextLevelInfo.title}. Approved at Level ${currentLevel} by ${approverName}`,
      },
    });

    // Notify next level approvers
    const nextTargetRoles = MODULE_LEVEL_ROLES[approval.module]?.[nextLevel] || nextLevelInfo.roles;
    const nextApprovers = await prisma.user.findMany({
      where: {
        role: { in: nextTargetRoles },
        status: 'ACTIVE',
        telegramChatId: { not: null },
      },
      select: { id: true },
    });

    notify({
      module: 'APPROVAL',
      event: 'approval_needed',
      details: {
        '📋 Type': moduleLabel,
        '🔖 Reference': approval.recordRef || approval.recordId,
        '💰 Amount': (approval.amount || 0) > 0 ? `${(approval.amount || 0).toLocaleString('en-US')} ETB` : 'N/A',
        '✅ Level ${currentLevel}': `Approved by ${approverName}`,
        '🔄 Level': `${nextLevel} of ${requiredLevels} — ${nextLevelInfo.title}`,
        '⏳ Action': `Awaiting ${nextLevelInfo.title} approval`,
      },
      specificUserIds: nextApprovers.map(a => a.id),
      specificRoles: nextApprovers.length === 0 ? nextTargetRoles : undefined,
    });

    // Notify requester about progress
    if (approval.requester?.telegramChatId) {
      notify({
        module: 'APPROVAL',
        event: 'approval_resolved',
        details: {
          '📋 Type': moduleLabel,
          '🔖 Reference': approval.recordRef || approval.recordId,
          '✅ Status': `Level ${currentLevel} approved by ${approverName}`,
          '🔄 Next': `Awaiting Level ${nextLevel} — ${nextLevelInfo.title}`,
        },
        specificUserIds: [approval.requesterId],
      });
    }

    return { status: 'NEXT_LEVEL', nextLevel, approval: updated };
  } else {
    // ---- All levels complete — FULLY APPROVED ----
    // Update source record status
    await updateSourceRecordStatus(approval.module, approval.recordId, 'Approved');

    // Notify requester of full approval
    notify({
      module: 'APPROVAL',
      event: 'approval_resolved',
      details: {
        '📋 Type': moduleLabel,
        '🔖 Reference': approval.recordRef || approval.recordId,
        '💰 Amount': (approval.amount || 0) > 0 ? `${(approval.amount || 0).toLocaleString('en-US')} ETB` : 'N/A',
        '✅ Status': 'FULLY APPROVED',
        '👤 Final Approver': approverName,
        '🔄 Levels': `${requiredLevels} of ${requiredLevels} completed`,
      },
      specificUserIds: [approval.requesterId],
    });

    // Also notify FINANCE and ADMIN about fully approved high-value items
    if ((approval.amount || 0) >= 50000) {
      notify({
        module: MODULE_TELEGRAM_MAP[approval.module] || 'SYSTEM',
        event: 'approval_resolved',
        details: {
          '📋 Type': moduleLabel,
          '🔖 Reference': approval.recordRef || approval.recordId,
          '💰 Amount': `${(approval.amount || 0).toLocaleString('en-US')} ETB`,
          '✅ Status': 'FULLY APPROVED — Ready for processing',
        },
        specificRoles: ['FINANCE', 'ADMIN'],
      });
    }

    return { status: 'FULLY_APPROVED', approval: updated };
  }
}

// ============================================================
// PUBLIC: Reject Record
// ============================================================
export async function rejectRecord(approvalId: string, approverId: string, reason: string) {
  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
    include: {
      requester: { select: { id: true, firstName: true, lastName: true, telegramChatId: true } },
    },
  });

  if (!approval) throw new Error('Approval not found');
  if (approval.status !== 'PENDING') throw new Error('Approval is not pending');

  const approver = await prisma.user.findUnique({
    where: { id: approverId },
    select: { firstName: true, lastName: true, role: true },
  });
  const approverName = approver ? `${approver.firstName} ${approver.lastName}`.trim() : 'Unknown';

  // Mark as REJECTED
  const updated = await prisma.approval.update({
    where: { id: approvalId },
    data: {
      status: 'REJECTED',
      approverId,
      notes: reason || `Rejected by ${approverName}`,
      resolvedAt: new Date(),
    },
  });

  // Update source record status back to Draft/Rejected
  await updateSourceRecordStatus(approval.module, approval.recordId, 'Rejected');

  // Cancel any other pending approvals for the same record
  await prisma.approval.updateMany({
    where: {
      module: approval.module,
      recordId: approval.recordId,
      status: 'PENDING',
      id: { not: approvalId },
    },
    data: { status: 'CANCELLED' },
  });

  const moduleLabel = MODULE_LABELS[approval.module] || approval.module;
  const levelTitle = LEVEL_ROLES[approval.level]?.title || `Level ${approval.level}`;

  // Notify requester about rejection
  notify({
    module: 'APPROVAL',
    event: 'approval_resolved',
    details: {
      '📋 Type': moduleLabel,
      '🔖 Reference': approval.recordRef || approval.recordId,
      '❌ Status': 'REJECTED',
      '👤 Rejected By': `${approverName} (${levelTitle})`,
      '📝 Reason': reason || 'No reason provided',
    },
    specificUserIds: [approval.requesterId],
  });

  return { status: 'REJECTED', approval: updated };
}

// ============================================================
// INTERNAL: Update source record status
// ============================================================
async function updateSourceRecordStatus(module: string, recordId: string, status: string) {
  const modelMap: Record<string, string> = {
    PaymentVoucher: 'paymentVoucher',
    PurchaseOrder: 'purchaseOrder',
    SupplierPayment: 'supplierPayment',
    LeaveRequest: 'leaveRequest',
    EmployeeAdvance: 'employeeAdvance',
    PayrollPeriod: 'payrollPeriod',
    MedicalRequest: 'medicalRequest',
    SalesInvoice: 'salesInvoice',
    CommissionCalculation: 'commissionCalculation',
    SalesOrder: 'salesOrder',
    CementPurchase: 'cementPurchase',
    SalesAgreement: 'salesAgreement',
    SupplierAgreement: 'supplierAgreement',
  };

  // For agreements, "Approved" means "Active" — they skip the Approved status
  const AGREEMENT_MODULES = ['SalesAgreement', 'SupplierAgreement'];
  let finalStatus = status;
  if (AGREEMENT_MODULES.includes(module) && status === 'Approved') {
    finalStatus = 'Active';
  }

  const modelName = modelMap[module];
  if (!modelName) return;

  try {
    const updatePayload: any = { status: finalStatus };
    await (prisma as any)[modelName].update({
      where: { id: recordId },
      data: updatePayload,
    });

    // If a PaymentVoucher is rejected or cancelled, reverse any linked bank transaction
    if (module === 'PaymentVoucher' && (finalStatus === 'Rejected' || finalStatus === 'Cancelled')) {
      const existingTxn = await prisma.bankTransaction.findFirst({
        where: { refModule: 'PAYMENT_VOUCHER', refId: recordId },
      });
      if (existingTxn) {
        await prisma.bankAccount.update({
          where: { id: existingTxn.bankAccountId },
          data: {
            balance: existingTxn.type === 'withdrawal'
              ? { increment: Number(existingTxn.amount) }
              : { decrement: Number(existingTxn.amount) },
          },
        });
        await prisma.bankTransaction.delete({ where: { id: existingTxn.id } });
      }
    }
  } catch (err: any) {
    console.error(`[Approval] Failed to update ${module} ${recordId} status to ${finalStatus}:`, err.message);
  }
}

// ============================================================
// PUBLIC: Get approval status for a record
// ============================================================
export async function getApprovalStatus(module: string, recordId: string) {
  const approvals = await prisma.approval.findMany({
    where: { module, recordId },
    orderBy: { level: 'asc' },
    include: {
      requester: { select: { firstName: true, lastName: true } },
      approver: { select: { firstName: true, lastName: true } },
    },
  });

  if (approvals.length === 0) return null;

  const latest = approvals[approvals.length - 1];
  const requiredLevels = latest.requiredLevels || 1;
  const completedLevels = approvals.filter(a => a.status === 'APPROVED').length;
  const isFullyApproved = completedLevels >= requiredLevels;
  const isRejected = approvals.some(a => a.status === 'REJECTED');
  const pendingApproval = approvals.find(a => a.status === 'PENDING');

  return {
    approvals,
    requiredLevels,
    completedLevels,
    isFullyApproved,
    isRejected,
    pendingLevel: pendingApproval?.level || null,
    pendingApprovalId: pendingApproval?.id || null,
  };
}

// Export constants for use in other files
export { MODULE_LABELS, MODULE_LINK_MAP, MODULE_TELEGRAM_MAP, LEVEL_ROLES, MODULE_LEVEL_ROLES };
