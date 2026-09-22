/**
 * Helper utility to resolve navigation URLs for Voucher Source Modules and Source References.
 */

export interface SourceReferenceLinkItem {
  id?: string;
  ref: string;
  url: string;
  label: string;
  isDirectItem: boolean;
}

export interface ModuleInfo {
  name: string;
  url: string;
  badgeClass: string;
}

/**
 * Returns general module info (name, landing URL, badge styling) for a source module.
 */
export function getSourceModuleInfo(sourceModule?: string | null): ModuleInfo | null {
  if (!sourceModule) return null;
  const mod = sourceModule.toUpperCase().trim();

  switch (mod) {
    case 'PURCHASE':
    case 'PURCHASING':
      return {
        name: 'Purchasing Orders',
        url: '/dashboard/purchasing/orders',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
      };
    case 'CEMENT':
      return {
        name: 'Cement Purchases',
        url: '/dashboard/cement/purchases',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
      };
    case 'AGGREGATE':
      return {
        name: 'Aggregate Dispatches',
        url: '/dashboard/aggregate',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
      };
    case 'SALES':
      return {
        name: 'Sales Invoices',
        url: '/dashboard/sales/invoices',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      };
    case 'PAYROLL':
    case 'HR':
      return {
        name: 'HR & Payroll',
        url: '/dashboard/hr/payroll',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
      };
    case 'MEDICAL':
      return {
        name: 'Medical Requests',
        url: '/dashboard/medical/requests',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
      };
    case 'TRANSPORTER':
      return {
        name: 'Transporters',
        url: '/dashboard/transporters',
        badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100',
      };
    case 'VAT':
    case 'TAX':
      return {
        name: 'Tax Reports',
        url: '/dashboard/reports',
        badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
      };
    case 'ASSOCIATION':
      return {
        name: 'Associations',
        url: '/dashboard/transporters/associations',
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100',
      };
    default:
      return null;
  }
}

/**
 * Resolves source references and source IDs into clickable navigation items.
 * Handles single IDs/references or comma-separated lists (e.g., multi-dispatch settlements).
 */
export function getSourceReferenceLinks(
  sourceModule?: string | null,
  sourceId?: string | null,
  sourceRef?: string | null
): SourceReferenceLinkItem[] {
  const mod = (sourceModule || '').toUpperCase().trim();
  const rawRef = (sourceRef || '').trim();
  const rawId = (sourceId || '').trim();

  if (!rawRef && !rawId) return [];

  // Split multiple refs and IDs if comma-separated
  const refTokens = rawRef
    ? rawRef.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const idTokens = rawId
    ? rawId.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const count = Math.max(refTokens.length, idTokens.length, 1);
  const items: SourceReferenceLinkItem[] = [];

  for (let i = 0; i < count; i++) {
    const itemRef =
      refTokens[i] ||
      (refTokens.length === 1 ? refTokens[0] : '') ||
      rawRef ||
      'Source Record';
    const itemId =
      idTokens[i] ||
      (idTokens.length === 1 ? idTokens[0] : '') ||
      rawId ||
      '';

    let url = '';
    let isDirectItem = false;
    const label = itemRef;
    const upperRef = itemRef.toUpperCase();

    switch (mod) {
      case 'PURCHASE':
      case 'PURCHASING': {
        if (upperRef.startsWith('PAY-') || upperRef.includes('PAYMENT')) {
          url = itemId ? `/dashboard/purchasing/payments/${itemId}` : '/dashboard/purchasing/payments';
          isDirectItem = Boolean(itemId);
        } else if (upperRef.startsWith('GRV-') || upperRef.includes('GRV')) {
          url = '/dashboard/purchasing/grv';
        } else {
          url = itemId ? `/dashboard/purchasing/orders/${itemId}` : '/dashboard/purchasing/orders';
          isDirectItem = Boolean(itemId);
        }
        break;
      }

      case 'CEMENT': {
        if (upperRef.startsWith('LFT-') || upperRef.includes('LIFT') || upperRef.includes('LFT')) {
          url = itemId ? `/dashboard/cement/liftings/${itemId}` : '/dashboard/cement/liftings';
          isDirectItem = Boolean(itemId);
        } else {
          url = itemId ? `/dashboard/cement/purchases/${itemId}` : '/dashboard/cement/purchases';
          isDirectItem = Boolean(itemId);
        }
        break;
      }

      case 'AGGREGATE': {
        url = itemId ? `/dashboard/aggregate/${itemId}` : '/dashboard/aggregate';
        isDirectItem = Boolean(itemId);
        break;
      }

      case 'SALES': {
        if (upperRef.startsWith('SO-') || upperRef.includes('ORDER')) {
          url = itemId ? `/dashboard/sales/orders/${itemId}` : '/dashboard/sales/orders';
          isDirectItem = Boolean(itemId);
        } else {
          url = itemId ? `/dashboard/sales/invoices/${itemId}` : '/dashboard/sales/invoices';
          isDirectItem = Boolean(itemId);
        }
        break;
      }

      case 'PAYROLL':
      case 'HR': {
        url = itemId ? `/dashboard/hr/payroll/${itemId}` : '/dashboard/hr/payroll';
        isDirectItem = Boolean(itemId);
        break;
      }

      case 'MEDICAL': {
        url = itemId ? `/dashboard/medical/requests/${itemId}` : '/dashboard/medical/requests';
        isDirectItem = Boolean(itemId);
        break;
      }

      case 'TRANSPORTER': {
        // Transporter vouchers created from aggregate dispatches point to aggregate record
        url = itemId ? `/dashboard/aggregate/${itemId}` : '/dashboard/transporters';
        isDirectItem = Boolean(itemId);
        break;
      }

      case 'VAT':
      case 'TAX': {
        url = '/dashboard/reports';
        break;
      }

      case 'ASSOCIATION': {
        url = '/dashboard/transporters/associations';
        break;
      }

      default: {
        // Universal fallback heuristics based on ref format
        if (upperRef.startsWith('PO-')) {
          url = itemId ? `/dashboard/purchasing/orders/${itemId}` : '/dashboard/purchasing/orders';
          isDirectItem = Boolean(itemId);
        } else if (upperRef.startsWith('PAY-')) {
          url = itemId ? `/dashboard/purchasing/payments/${itemId}` : '/dashboard/purchasing/payments';
          isDirectItem = Boolean(itemId);
        } else if (upperRef.startsWith('INV-')) {
          url = itemId ? `/dashboard/sales/invoices/${itemId}` : '/dashboard/sales/invoices';
          isDirectItem = Boolean(itemId);
        } else if (upperRef.startsWith('CP-')) {
          url = itemId ? `/dashboard/cement/purchases/${itemId}` : '/dashboard/cement/purchases';
          isDirectItem = Boolean(itemId);
        } else if (upperRef.startsWith('LFT-')) {
          url = itemId ? `/dashboard/cement/liftings/${itemId}` : '/dashboard/cement/liftings';
          isDirectItem = Boolean(itemId);
        } else if (upperRef.startsWith('DISP-')) {
          url = itemId ? `/dashboard/aggregate/${itemId}` : '/dashboard/aggregate';
          isDirectItem = Boolean(itemId);
        } else if (upperRef.startsWith('MR-') || upperRef.startsWith('MED-')) {
          url = itemId ? `/dashboard/medical/requests/${itemId}` : '/dashboard/medical/requests';
          isDirectItem = Boolean(itemId);
        } else if (upperRef.startsWith('PR-') || upperRef.startsWith('PAYROLL-')) {
          url = itemId ? `/dashboard/hr/payroll/${itemId}` : '/dashboard/hr/payroll';
          isDirectItem = Boolean(itemId);
        }
        break;
      }
    }

    if (url) {
      items.push({
        id: itemId || undefined,
        ref: itemRef,
        url,
        label,
        isDirectItem,
      });
    }
  }

  return items;
}

/**
 * Returns navigation URL for a Payee (Supplier, Customer, Transporter, Employee).
 */
export function getPayeeLink(payeeType?: string | null, payeeId?: string | null): string | null {
  if (!payeeType || !payeeId || payeeId === 'ONE_TIME_SUPPLIER') return null;
  const type = payeeType.toUpperCase().trim();
  switch (type) {
    case 'SUPPLIER':
      return `/dashboard/suppliers/${payeeId}`;
    case 'CUSTOMER':
      return `/dashboard/customers/${payeeId}`;
    case 'TRANSPORTER':
      return `/dashboard/transporters/${payeeId}`;
    case 'EMPLOYEE':
      return `/dashboard/employees/${payeeId}`;
    default:
      return null;
  }
}
