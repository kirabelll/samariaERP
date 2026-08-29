'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, Button, Input, Select } from '@/components/ui';

interface EntityOption {
  id: string;
  name: string;
  code?: string;
  pendingAmount?: number;
  pendingTrips?: number;
  withholding?: boolean;
  withholdRate?: number;
}

interface SourceRefOption {
  id: string;
  label: string;
  ref: string;
  amount?: number;
  totalAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  isPartial?: boolean;
  status?: string;
  dispatchNo?: string;
  padNumber?: string;
  supplierPayable?: number;
  customerReceivable?: number;
  transporterPayable?: number;
  driverName?: string;
  truckPlate?: string;
  transporterId?: string;
  transporterName?: string;
  supplierName?: string;
  paymentMethod?: string;
  bankName?: string;
}

interface BankAccountOption {
  id: string;
  bankName: string;
  accountNo: string;
  accountName: string;
}

interface FormData {
  voucherType: string;
  sourceModule: string;
  sourceId: string;
  sourceReference: string;
  payeeType: string;
  payeeId: string;
  payeeName: string;
  amount: string;
  paymentMethod: string;
  bankAccountId: string;
  bankName: string;
  checkNo: string;
  referenceNo: string;
  description: string;
}

export default function NewVoucherPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Entity lists
  const [customers, setCustomers] = useState<EntityOption[]>([]);
  const [suppliers, setSuppliers] = useState<EntityOption[]>([]);
  const [medicalSuppliers, setMedicalSuppliers] = useState<EntityOption[]>([]);
  const [employees, setEmployees] = useState<EntityOption[]>([]);
  const [transporters, setTransporters] = useState<EntityOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [sourceRefs, setSourceRefs] = useState<SourceRefOption[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  // Multi-select for AGGREGATE deliveries
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<string>>(new Set());
  const [deliverySearch, setDeliverySearch] = useState('');

  // Multi-transporter selection with amount state
  const [transporterMode, setTransporterMode] = useState<'single' | 'multi'>('multi');
  const [multiTransporters, setMultiTransporters] = useState<Record<string, { selected: boolean; amount: string }>>({});
  const [transporterSearch, setTransporterSearch] = useState('');

  // Tax & Withholding states
  const [applyVat, setApplyVat] = useState(false);
  const [vatRate, setVatRate] = useState<number>(15);
  const [applyWithholding, setApplyWithholding] = useState(false);
  const [withholdRate, setWithholdRate] = useState<number>(3);

  const [formData, setFormData] = useState<FormData>({
    voucherType: 'PAYMENT',
    sourceModule: '',
    sourceId: '',
    sourceReference: '',
    payeeType: '',
    payeeId: '',
    payeeName: '',
    amount: '',
    paymentMethod: 'cash',
    bankAccountId: '',
    bankName: '',
    checkNo: '',
    referenceNo: '',
    description: '',
  });

  // Calculated totals based on subtotal amount, VAT and withholding
  const subtotal = useMemo(() => {
    return parseFloat(formData.amount || '0') || 0;
  }, [formData.amount]);

  const totalVAT = useMemo(() => {
    return applyVat ? (subtotal * vatRate) / 100 : 0;
  }, [subtotal, applyVat, vatRate]);

  const grossTotal = useMemo(() => {
    return subtotal + totalVAT;
  }, [subtotal, totalVAT]);

  const withholdAmount = useMemo(() => {
    return applyWithholding ? (subtotal * withholdRate) / 100 : 0;
  }, [subtotal, applyWithholding, withholdRate]);

  const netPayable = useMemo(() => {
    return Math.max(0, grossTotal - withholdAmount);
  }, [grossTotal, withholdAmount]);

  const handleMultiTransporterToggle = (id: string) => {
    const targetTransporter = transporters.find((t) => t.id === id);
    setMultiTransporters((prev) => {
      const current = prev[id] || { selected: false, amount: '' };
      const nextSelected = !current.selected;
      const defaultAmt = targetTransporter?.pendingAmount && targetTransporter.pendingAmount > 0
        ? String(targetTransporter.pendingAmount)
        : '';
      const updated = {
        ...prev,
        [id]: {
          selected: nextSelected,
          amount: nextSelected ? (current.amount || defaultAmt) : '',
        },
      };

      const selectedList = transporters.filter((t) => updated[t.id]?.selected);
      const total = selectedList.reduce((sum, t) => sum + (parseFloat(updated[t.id]?.amount || '0') || 0), 0);

      const breakdown = selectedList
        .filter((t) => parseFloat(updated[t.id]?.amount || '0') > 0)
        .map((t) => `${t.name}: ETB ${(parseFloat(updated[t.id]?.amount || '0') || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
        .join(' | ');

      setFormData((f) => ({
        ...f,
        payeeId: selectedList.map((t) => t.id).join(','),
        payeeName: selectedList.length === 1 ? selectedList[0].name : selectedList.length > 1 ? `Multi-Transporters (${selectedList.length} Selected)` : '',
        amount: total > 0 ? String(Math.round(total * 100) / 100) : f.amount,
        description: breakdown ? `Transporter Settlements: ${breakdown}` : f.description,
      }));

      return updated;
    });
  };

  const handleMultiTransporterAmountChange = (id: string, val: string) => {
    setMultiTransporters((prev) => {
      const updated = {
        ...prev,
        [id]: {
          selected: true,
          amount: val,
        },
      };

      const selectedList = transporters.filter((t) => updated[t.id]?.selected);
      const total = selectedList.reduce((sum, t) => sum + (parseFloat(updated[t.id]?.amount || '0') || 0), 0);

      const breakdown = selectedList
        .filter((t) => parseFloat(updated[t.id]?.amount || '0') > 0)
        .map((t) => `${t.name}: ETB ${(parseFloat(updated[t.id]?.amount || '0') || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
        .join(' | ');

      setFormData((f) => ({
        ...f,
        payeeId: selectedList.map((t) => t.id).join(','),
        payeeName: selectedList.length === 1 ? selectedList[0].name : selectedList.length > 1 ? `Multi-Transporters (${selectedList.length} Selected)` : f.payeeName,
        amount: total > 0 ? String(Math.round(total * 100) / 100) : '',
        description: breakdown ? `Transporter Settlements: ${breakdown}` : f.description,
      }));

      return updated;
    });
  };

  const handleAutoFillPendingAmounts = () => {
    const nextMap: Record<string, { selected: boolean; amount: string }> = {};
    transporters.forEach((t) => {
      const amt = t.pendingAmount && t.pendingAmount > 0 ? String(t.pendingAmount) : '';
      nextMap[t.id] = {
        selected: amt !== '' ? true : (multiTransporters[t.id]?.selected || false),
        amount: amt,
      };
    });

    const selectedList = transporters.filter((t) => nextMap[t.id]?.selected);
    const total = selectedList.reduce((sum, t) => sum + (parseFloat(nextMap[t.id]?.amount || '0') || 0), 0);

    const breakdown = selectedList
      .filter((t) => parseFloat(nextMap[t.id]?.amount || '0') > 0)
      .map((t) => `${t.name}: ETB ${(parseFloat(nextMap[t.id]?.amount || '0') || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
      .join(' | ');

    setFormData((f) => ({
      ...f,
      payeeId: selectedList.map((t) => t.id).join(','),
      payeeName: selectedList.length === 1 ? selectedList[0].name : selectedList.length > 1 ? `Multi-Transporters (${selectedList.length} Selected)` : f.payeeName,
      amount: total > 0 ? String(Math.round(total * 100) / 100) : '',
      description: breakdown ? `Transporter Settlements: ${breakdown}` : f.description,
    }));

    setMultiTransporters(nextMap);
  };

  const handleSelectAllMultiTransporters = () => {
    const allSelected = transporters.length > 0 && transporters.every((t) => multiTransporters[t.id]?.selected);
    const nextMap: Record<string, { selected: boolean; amount: string }> = {};

    if (allSelected) {
      transporters.forEach((t) => {
        nextMap[t.id] = { selected: false, amount: '' };
      });
      setFormData((f) => ({
        ...f,
        payeeId: '',
        payeeName: '',
        amount: '',
        description: '',
      }));
    } else {
      transporters.forEach((t) => {
        const defaultAmt = t.pendingAmount && t.pendingAmount > 0 ? String(t.pendingAmount) : (multiTransporters[t.id]?.amount || '');
        nextMap[t.id] = { selected: true, amount: defaultAmt };
      });
      const total = transporters.reduce((sum, t) => sum + (parseFloat(nextMap[t.id]?.amount || '0') || 0), 0);
      setFormData((f) => ({
        ...f,
        payeeId: transporters.map((t) => t.id).join(','),
        payeeName: `Multi-Transporters (${transporters.length} Selected)`,
        amount: total > 0 ? String(Math.round(total * 100) / 100) : f.amount,
      }));
    }
    setMultiTransporters(nextMap);
  };

  // Fetch all entity lists on mount
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [custRes, suppRes, empRes, transRes, bankRes, allCustRes, aggRes] = await Promise.all([
          fetch('/api/sales/agreements/customers').then(r => r.json()).catch(() => ({ success: false })),
          fetch('/api/suppliers?limit=1000').then(r => r.json()).catch(() => ({ success: false })),
          fetch('/api/employees?limit=1000').then(r => r.json()).catch(() => ({ success: false })),
          fetch('/api/transporters?limit=1000').then(r => r.json()).catch(() => ({ success: false })),
          fetch('/api/finance/bank?limit=100').then(r => r.json()).catch(() => ({ success: false })),
          fetch('/api/customers?limit=1000').then(r => r.json()).catch(() => ({ success: false })),
          fetch('/api/aggregate?limit=1000').then(r => r.json()).catch(() => ({ success: false })),
        ]);

        const customerMap = new Map<string, EntityOption>();

        if (allCustRes.success && Array.isArray(allCustRes.data)) {
          allCustRes.data.forEach((c: any) => {
            if (c.id) {
              customerMap.set(c.id, {
                id: c.id,
                name: c.companyName || c.name || 'Customer',
                code: c.code || '',
                withholding: c.withholding || false,
                withholdRate: c.withholdRate || 3,
              });
            }
          });
        }

        if (custRes.success && Array.isArray(custRes.data)) {
          custRes.data.forEach((c: any) => {
            if (c.customerId) {
              customerMap.set(c.customerId, {
                id: c.customerId,
                name: `${c.companyName}${c.agreementNo ? ` — ${c.agreementNo}` : ''}`,
                code: c.agreementNo || '',
                withholding: c.withholding || false,
                withholdRate: c.withholdRate || 3,
              });
            }
          });
        }

        setCustomers(Array.from(customerMap.values()));
        if (suppRes.success) {
          const fetchedSuppliers = (suppRes.data || []).map((s: any) => ({
            id: s.id,
            name: s.companyName || s.name || '',
            code: s.code,
            category: s.category || '',
            withholding: s.withholding || false,
            withholdRate: s.withholdRate || 3,
          }));
          setSuppliers([
            { id: 'ONE_TIME_SUPPLIER', name: '⚡ One-Time Supplier (Ad-Hoc / Manual)', code: 'ONE-TIME' },
            ...fetchedSuppliers,
          ]);

          // Filter medical/pharma suppliers
          const medList = fetchedSuppliers.filter(
            (s: any) =>
              (s.category && s.category.toLowerCase().includes('med')) ||
              (s.category && s.category.toLowerCase().includes('pharma'))
          );
          setMedicalSuppliers(medList.length > 0 ? medList : fetchedSuppliers);
        } else {
          setSuppliers([
            { id: 'ONE_TIME_SUPPLIER', name: '⚡ One-Time Supplier (Ad-Hoc / Manual)', code: 'ONE-TIME' },
          ]);
          setMedicalSuppliers([]);
        }
        if (empRes.success) {
          setEmployees((empRes.data || []).map((e: any) => ({
            id: e.id,
            name: e.fullName || e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim(),
            code: e.employeeId || e.code,
          })));
        }

        // Aggregate pending balances per transporter
        const transPendingMap = new Map<string, { amount: number; count: number }>();
        if (aggRes.success && Array.isArray(aggRes.data)) {
          aggRes.data.forEach((d: any) => {
            if (d.transporterId && d.status !== 'Settled' && d.status !== 'Void' && d.status !== 'Cancelled') {
              const amt = Number(d.transporterPayable || d.netTruckPayment || d.grossTruckFee || 0);
              const current = transPendingMap.get(d.transporterId) || { amount: 0, count: 0 };
              transPendingMap.set(d.transporterId, {
                amount: current.amount + amt,
                count: current.count + 1,
              });
            }
          });
        }

        if (transRes.success) {
          const initialMap: Record<string, { selected: boolean; amount: string }> = {};
          const list = (transRes.data || []).map((t: any) => {
            const pendingInfo = transPendingMap.get(t.id) || { amount: 0, count: 0 };
            const pendingAmt = Math.round(pendingInfo.amount * 100) / 100;
            initialMap[t.id] = {
              selected: false,
              amount: pendingAmt > 0 ? String(pendingAmt) : '',
            };
            return {
              id: t.id,
              name: t.companyName || t.name || '',
              code: t.code,
              pendingAmount: pendingAmt,
              pendingTrips: pendingInfo.count,
              withholding: t.withholding || false,
              withholdRate: t.withholdRate || 3,
            };
          });
          setTransporters(list);
          setMultiTransporters(initialMap);
        }
        if (bankRes.success) {
          setBankAccounts(bankRes.data || []);
        }
      } catch (err) {
        console.error('Error loading entities:', err);
      }
    };
    fetchAll();
  }, []);
  
  const getPayeeOptions = (): EntityOption[] => {
    switch (formData.payeeType) {
      case 'CUSTOMER': return customers;
      case 'SUPPLIER': return suppliers;
      case 'MEDICAL':
      case 'MEDICAL_SUPPLIER':
        return medicalSuppliers.length > 0 ? medicalSuppliers : suppliers;
      case 'ONE_TIME_SUPPLIER': return [{ id: 'ONE_TIME_SUPPLIER', name: '⚡ One-Time Supplier (Ad-Hoc / Manual)', code: 'ONE-TIME' }];
      case 'EMPLOYEE': return employees;
      case 'TRANSPORTER': return transporters;
      default: return [];
    }
  };

  useEffect(() => {
    if (!formData.sourceModule) {
      setSourceRefs([]);
      return;
    }

    const fetchRefs = async () => {
      setLoadingRefs(true);
      try {
        let refs: SourceRefOption[] = [];

        switch (formData.sourceModule) {
          case 'PURCHASE': {
            const [poRes, payRes] = await Promise.all([
              fetch('/api/purchasing/orders?limit=100').then((r) => r.json()).catch(() => ({ success: false })),
              fetch('/api/purchasing/payments?limit=100').then((r) => r.json()).catch(() => ({ success: false })),
            ]);

            const paymentRefs: SourceRefOption[] = [];
            if (payRes.success && Array.isArray(payRes.data)) {
              payRes.data.forEach((pm: any) => {
                paymentRefs.push({
                  id: pm.id,
                  label: `Purchasing Payment: ${pm.paymentNo || pm.id} — ${pm.supplier?.companyName || 'Unknown Supplier'} — ETB ${Number(pm.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} (${pm.status || 'Active'})`,
                  ref: pm.paymentNo || pm.id,
                  amount: Number(pm.amount || 0),
                  supplierName: pm.supplier?.companyName || '',
                  paymentMethod: pm.paymentMethod || 'cash',
                  bankName: pm.bankName || '',
                });
              });
            }

            const poRefs: SourceRefOption[] = [];
            if (poRes.success && Array.isArray(poRes.data)) {
              const approvedOnly = poRes.data.filter((po: any) =>
                po.status === 'Approved' || po.status === 'Active' || po.status === 'Received'
              );
              approvedOnly.forEach((po: any) => {
                poRefs.push({
                  id: po.id,
                  label: `PO: ${po.poNo} — ${po.supplier?.companyName || 'Unknown'} — ETB ${Number(po.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} (${po.status})`,
                  ref: po.poNo,
                  amount: Number(po.totalAmount || 0),
                  supplierName: po.supplier?.companyName || '',
                });
              });
            }

            refs = [...paymentRefs, ...poRefs];
            break;
          }
          case 'AGGREGATE': {
            const aggParams = new URLSearchParams({ limit: '1000' });
            if (formData.payeeType === 'CUSTOMER' && formData.payeeId && formData.payeeId !== 'ONE_TIME_SUPPLIER') {
              aggParams.set('customerId', formData.payeeId);
            } else if (formData.payeeType === 'SUPPLIER' && formData.payeeId && formData.payeeId !== 'ONE_TIME_SUPPLIER') {
              aggParams.set('supplierId', formData.payeeId);
            } else if (formData.payeeType === 'TRANSPORTER') {
              if (transporterMode === 'single' && formData.payeeId && formData.payeeId !== 'ONE_TIME_SUPPLIER') {
                aggParams.set('transporterId', formData.payeeId);
              } else if (transporterMode === 'multi') {
                const selectedTransporterIds = transporters.filter((t) => multiTransporters[t.id]?.selected).map((t) => t.id);
                if (selectedTransporterIds.length > 0) {
                  aggParams.set('transporterId', selectedTransporterIds.join(','));
                }
              }
            }

            const res = await fetch(`/api/aggregate?${aggParams.toString()}`);
            const data = await res.json();
            if (data.success) {
              refs = (data.data || []).map((d: any) => {
                let amount = 0;
                let typeStr = 'Payable';

                if (formData.payeeType === 'CUSTOMER') {
                  amount = Number(d.customerReceivable || 0);
                  typeStr = 'Customer Receivable';
                } else if (formData.payeeType === 'TRANSPORTER') {
                  amount = Number(d.transporterPayable || d.netTruckPayment || d.grossTruckFee || 0);
                  typeStr = 'Transporter Freight';
                } else if (formData.payeeType === 'SUPPLIER' || formData.payeeType === 'ONE_TIME_SUPPLIER') {
                  amount = Number(d.supplierPayable || 0);
                  typeStr = 'Supplier Material';
                } else {
                  amount = Number(d.supplierPayable || d.netTruckPayment || 0);
                  typeStr = 'Payable';
                }

                const podStr = d.padNumber ? `POD: ${d.padNumber}` : 'POD: N/A';
                const transName = d.transporter?.companyName || d.transporter?.name || '';
                const partyStr = transName || d.customer?.companyName || d.supplier?.companyName || '';

                return {
                  id: d.id,
                  dispatchNo: d.dispatchNo,
                  padNumber: d.padNumber || 'N/A',
                  label: `${d.dispatchNo} — ${podStr}${partyStr ? ` — ${partyStr}` : ''} — ETB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${typeStr})`,
                  ref: d.dispatchNo,
                  amount: Math.round(amount * 100) / 100,
                  supplierPayable: Number(d.supplierPayable || 0),
                  transporterPayable: Number(d.transporterPayable || d.netTruckPayment || 0),
                  customerReceivable: Number(d.customerReceivable || 0),
                  transporterId: d.transporterId,
                  transporterName: transName,
                  driverName: d.driverName,
                  truckPlate: d.truck?.plateNo || d.truck?.plateNumber || d.plateNumber,
                };
              });
            }
            break;
          }
          case 'CEMENT': {
            const res = await fetch('/api/cement/purchases?limit=100&paymentStatus=Unpaid,Partial');
            const data = await res.json();
            if (data.success) {
              const approvedOnly = (data.data || []).filter((p: any) =>
                p.status === 'Active' || p.status === 'Approved' || p.status === 'Checked'
              );
              refs = approvedOnly.map((p: any) => {
                const total = Number(p.totalAmount) || 0;
                const paid = Number(p.paidAmount) || 0;
                const remaining = Math.max(0, total - paid);
                const isPartial = p.paymentStatus === 'Partial' || (paid > 0 && remaining > 0);
                const statusStr = isPartial ? 'Partial' : (remaining <= 0 ? 'Paid' : 'Unpaid');
                const badge = isPartial ? '🟡 Partial Payment' : statusStr === 'Paid' ? '🟢 Paid' : '🔴 Unpaid';

                return {
                  id: p.id,
                  label: `${p.purchaseNo} — ${p.factory?.name || 'Unknown'} — Total: ETB ${total.toLocaleString('en-US')} | Paid: ETB ${paid.toLocaleString('en-US')} | Rem: ETB ${remaining.toLocaleString('en-US')} (${badge})`,
                  ref: p.purchaseNo,
                  amount: remaining > 0 ? remaining : total,
                  totalAmount: total,
                  paidAmount: paid,
                  remainingAmount: remaining,
                  isPartial,
                  status: statusStr,
                };
              });
            }
            break;
          }
          case 'PAYROLL': {
            const res = await fetch('/api/hr/payroll?limit=50');
            const data = await res.json();
            if (data.success) {
              // Only show Approved payroll
              const approvedOnly = (data.data || []).filter((pr: any) =>
                pr.status === 'Approved' || pr.status === 'Active' || pr.status === 'Finalized'
              );
              refs = approvedOnly.map((pr: any) => ({
                id: pr.id,
                label: `${pr.payrollNo || pr.period || 'Payroll'} — ${pr.status || 'Active'}`,
                ref: pr.payrollNo || pr.period,
                amount: pr.totalNet || pr.totalAmount,
              }));
            }
            break;
          }
          case 'MEDICAL': {
            const res = await fetch('/api/medical/requests?limit=200').then((r) => r.json()).catch(() => ({ success: false }));
            if (res.success && Array.isArray(res.data)) {
              refs = res.data.map((r: any) => {
                let totalAmount = 0;
                let itemCount = 0;
                let itemsPreview = '';
                try {
                  const parsed = typeof r.items === 'string' ? JSON.parse(r.items) : r.items;
                  if (Array.isArray(parsed)) {
                    itemCount = parsed.length;
                    totalAmount = parsed.reduce(
                      (sum: number, it: any) =>
                        sum + (Number(it.amount) || (Number(it.qty || 0) * Number(it.unitPrice || 0)) || 0),
                      0
                    );
                    itemsPreview = parsed
                      .map((it: any) => `${it.drugName || it.genericName || 'Item'} (${it.qty || 1})`)
                      .slice(0, 3)
                      .join(', ');
                  }
                } catch {}

                const partnerName =
                  r.supplier?.companyName ||
                  r.customer?.companyName ||
                  (r.supplier?.firstName ? `${r.supplier.firstName} ${r.supplier.lastName || ''}`.trim() : '') ||
                  (r.customer?.firstName ? `${r.customer.firstName} ${r.customer.lastName || ''}`.trim() : '') ||
                  'Medical Supplier';

                return {
                  id: r.id,
                  label: `Medical Request: ${r.requestNo} — Supplier: ${partnerName} — ${itemCount} items${itemsPreview ? ` [${itemsPreview}]` : ''} — ETB ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${r.status})`,
                  ref: r.requestNo,
                  amount: totalAmount,
                  totalAmount: totalAmount,
                  supplierName: partnerName,
                  status: r.status,
                };
              });
            }
            break;
          }
          case 'SALES': {
            // Fetch sales invoices using server-side filters
            const invoiceParams = new URLSearchParams({ limit: '200' });
            if (formData.payeeId && formData.payeeId !== 'ONE_TIME_SUPPLIER') {
              invoiceParams.set('customerId', formData.payeeId);
            }

            // Try fetching unpaid/partial invoices first
            let invRes = await fetch(`/api/sales/invoices?${invoiceParams.toString()}&status=Unpaid,Partial`);
            let invData = await invRes.json();
            let invoiceList = (invData.success && Array.isArray(invData.data)) ? invData.data : [];

            // Fallback: if no Unpaid/Partial invoices found, fetch all invoices for customer/system
            if (invoiceList.length === 0) {
              invRes = await fetch(`/api/sales/invoices?${invoiceParams.toString()}`);
              invData = await invRes.json();
              if (invData.success && Array.isArray(invData.data)) {
                invoiceList = invData.data;
              }
            }

            refs = invoiceList.map((inv: any) => {
              const totalAmount = Number(inv.totalAmount || 0);
              const paidAmount = Number(inv.paidAmount || 0);
              const remainingAmount = inv.remainingAmount !== undefined ? Number(inv.remainingAmount) : Math.max(0, totalAmount - paidAmount);
              const isPartial = inv.isPartial || (paidAmount > 0 && remainingAmount > 0);
              const statusStr = isPartial ? 'Partial' : (paidAmount >= totalAmount && totalAmount > 0 ? 'Paid' : (inv.status || 'Unpaid'));
              const dateStr = inv.dueDate ? `Due: ${new Date(inv.dueDate).toLocaleDateString()}` : (inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A');

              const statusBadge = isPartial ? '🟡 Partial Payment' : statusStr === 'Paid' ? '🟢 Paid' : '🔴 Unpaid';
              let amountText = `Total: ETB ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
              if (paidAmount > 0) {
                amountText = `Total: ETB ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Paid: ETB ${paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Rem: ETB ${remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
              }

              return {
                id: inv.id,
                label: `${inv.invoiceNo} — ${inv.customer?.companyName || 'Unknown Customer'} — ${amountText} (${statusBadge} - ${dateStr})`,
                ref: inv.invoiceNo,
                amount: remainingAmount > 0 ? remainingAmount : totalAmount,
                totalAmount,
                paidAmount,
                remainingAmount,
                isPartial,
                status: statusStr,
              };
            });
            break;
          }
          case 'TRANSPORTER': {
            const transParams = new URLSearchParams({ limit: '1000' });
            if (transporterMode === 'single' && formData.payeeId && formData.payeeId !== 'ONE_TIME_SUPPLIER') {
              transParams.set('transporterId', formData.payeeId);
            } else if (transporterMode === 'multi') {
              const selectedTransporterIds = transporters.filter((t) => multiTransporters[t.id]?.selected).map((t) => t.id);
              if (selectedTransporterIds.length > 0) {
                transParams.set('transporterId', selectedTransporterIds.join(','));
              }
            }
            const res = await fetch(`/api/aggregate?${transParams.toString()}`);
            const data = await res.json();
            if (data.success) {
              const eligible = (data.data || []).filter((d: any) =>
                d.status !== 'Void' && d.status !== 'Cancelled'
              );
              refs = eligible.map((d: any) => {
                const amount = Number(d.transporterPayable || d.netTruckPayment || d.grossTruckFee || 0);
                const podStr = d.padNumber ? `POD: ${d.padNumber}` : 'POD: N/A';
                const plate = d.truck?.plateNo || d.truck?.plateNumber || d.plateNumber || '';
                const driverInfo = d.driverName || plate
                  ? `Truck: ${d.driverName || ''} ${plate ? `(${plate})` : ''}`.trim()
                  : '';
                const transName = d.transporter?.companyName || d.transporter?.name || '';
                const partyStr = transName ? `Transporter: ${transName}` : (d.customer?.companyName || '');

                return {
                  id: d.id,
                  dispatchNo: d.dispatchNo,
                  padNumber: d.padNumber || 'N/A',
                  label: `${d.dispatchNo} — ${podStr}${driverInfo ? ` — ${driverInfo}` : ''}${partyStr ? ` — ${partyStr}` : ''} — ETB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                  ref: d.dispatchNo,
                  amount: Math.round(amount * 100) / 100,
                  transporterPayable: amount,
                  transporterId: d.transporterId,
                  transporterName: transName,
                  driverName: d.driverName,
                  truckPlate: plate,
                };
              });
            }
            break;
          }
          default: {
            // ASSOCIATION, VAT — no specific refs
            break;
          }
        }

        setSourceRefs(refs);
      } catch (err) {
        console.error('Error loading source refs:', err);
        setSourceRefs([]);
      } finally {
        setLoadingRefs(false);
      }
    };

    fetchRefs();
  }, [formData.sourceModule, formData.payeeId, formData.payeeType, transporterMode]);

  // When payee type changes, reset payee selection
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      payeeId: formData.payeeType === 'ONE_TIME_SUPPLIER' ? 'ONE_TIME_SUPPLIER' : '',
      payeeName: formData.payeeType === 'ONE_TIME_SUPPLIER' ? prev.payeeName : '',
    }));
  }, [formData.payeeType]);

  // When source module changes, reset source selection
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      sourceId: '',
      sourceReference: '',
    }));
    setSelectedDeliveryIds(new Set());
  }, [formData.sourceModule]);

  // Auto-set source module based on payee type
  useEffect(() => {
    if (!formData.payeeType) return;
    const moduleMap: Record<string, string> = {
      'SUPPLIER': 'PURCHASE',
      'MEDICAL': 'MEDICAL',
      'ONE_TIME_SUPPLIER': 'PURCHASE',
      'CUSTOMER': 'SALES',
      'TRANSPORTER': 'TRANSPORTER',
      'EMPLOYEE': 'PAYROLL',
      'ASSOCIATION': 'ASSOCIATION',
      'GOVERNMENT': 'VAT',
    };
    const suggested = moduleMap[formData.payeeType];
    if (suggested) {
      setFormData((prev) => ({
        ...prev,
        sourceModule: suggested,
        payeeId: formData.payeeType === 'ONE_TIME_SUPPLIER' ? 'ONE_TIME_SUPPLIER' : prev.payeeId,
        // Auto-set RECEIPT when customer is selected (collecting money from them)
        ...(formData.payeeType === 'CUSTOMER' ? { voucherType: 'RECEIPT' } : {}),
      }));
    }
  }, [formData.payeeType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePayeeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const options = getPayeeOptions();
    const selected = options.find((o) => o.id === selectedId);

    if (selectedId === 'ONE_TIME_SUPPLIER') {
      setFormData((prev) => ({
        ...prev,
        payeeId: 'ONE_TIME_SUPPLIER',
        payeeName: prev.payeeName && prev.payeeName !== '⚡ One-Time Supplier (Ad-Hoc / Manual)' ? prev.payeeName : '',
        sourceModule: prev.sourceModule || 'PURCHASE',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        payeeId: selectedId,
        payeeName: selected ? `${selected.name}${selected.code ? ` (${selected.code})` : ''}` : '',
      }));

      // Auto-configure withholding if configured on entity
      if (selected?.withholding) {
        setApplyWithholding(true);
        if (selected.withholdRate) {
          setWithholdRate(selected.withholdRate);
        }
      }
    }
  };

  const handleSourceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = sourceRefs.find((r) => r.id === selectedId);

    if (!selected) {
      setFormData((prev) => ({
        ...prev,
        sourceId: '',
        sourceReference: '',
      }));
      return;
    }

    setFormData((prev) => {
      // Auto-extract supplier/party name from reference label if available
      const labelParts = selected.label ? selected.label.split(' — ') : [];
      let extractedParty = selected.supplierName || '';
      if (!extractedParty && labelParts.length > 1) {
        const p = labelParts[1].split(' (')[0].trim();
        extractedParty = p.replace(/^Supplier:\s*/i, '').trim();
      }

      const targetAmount = selected.amount !== undefined && selected.amount !== null && selected.amount > 0
        ? String(selected.amount)
        : prev.amount;

      // Try finding matching supplier
      const foundSupplier =
        medicalSuppliers.find(
          (s) =>
            s.id !== 'ONE_TIME_SUPPLIER' &&
            extractedParty &&
            (s.name.toLowerCase().includes(extractedParty.toLowerCase()) ||
              extractedParty.toLowerCase().includes(s.name.toLowerCase()))
        ) ||
        suppliers.find(
          (s) =>
            s.id !== 'ONE_TIME_SUPPLIER' &&
            extractedParty &&
            (s.name.toLowerCase().includes(extractedParty.toLowerCase()) ||
              extractedParty.toLowerCase().includes(s.name.toLowerCase()))
        );

      const updatedPayeeId = foundSupplier?.id || prev.payeeId;
      const updatedPayeeName = foundSupplier
        ? `${foundSupplier.name}${foundSupplier.code ? ` (${foundSupplier.code})` : ''}`
        : extractedParty || prev.payeeName;

      return {
        ...prev,
        sourceId: selected.id,
        sourceReference: selected.ref || '',
        amount: targetAmount,
        payeeId: prev.payeeId === 'ONE_TIME_SUPPLIER' ? 'ONE_TIME_SUPPLIER' : updatedPayeeId,
        payeeName: prev.payeeId === 'ONE_TIME_SUPPLIER' && prev.payeeName ? prev.payeeName : updatedPayeeName,
        paymentMethod: selected.paymentMethod || prev.paymentMethod,
        bankName: selected.bankName || prev.bankName,
        description:
          prev.description ||
          (selected.ref
            ? prev.sourceModule === 'MEDICAL'
              ? `Medical Purchase Request Payment: ${selected.ref} — ${updatedPayeeName}`
              : `Voucher settlement for ref: ${selected.ref}`
            : prev.description),
      };
    });
  };

  // Toggle aggregate delivery selection (multi-select)
  const handleDeliveryToggle = (deliveryId: string) => {
    setSelectedDeliveryIds((prev) => {
      const next = new Set(prev);
      if (next.has(deliveryId)) {
        next.delete(deliveryId);
      } else {
        next.add(deliveryId);
      }
      // Update form: comma-separated IDs, refs, and sum of amounts
      const selectedRefs = sourceRefs.filter((r) => next.has(r.id));
      const totalAmount = selectedRefs.reduce((sum, r) => sum + (r.amount || 0), 0);

      // In Multi-Transporter mode, update individual transporter amounts based on selected dispatches
      if (formData.payeeType === 'TRANSPORTER' && transporterMode === 'multi') {
        const transSums: Record<string, number> = {};
        selectedRefs.forEach((r) => {
          if (r.transporterId) {
            transSums[r.transporterId] = (transSums[r.transporterId] || 0) + (r.amount || 0);
          }
        });

        if (selectedRefs.length > 0) {
          setMultiTransporters((prevTrans) => {
            const nextTrans = { ...prevTrans };
            Object.keys(transSums).forEach((tId) => {
              nextTrans[tId] = {
                selected: true,
                amount: String(Math.round(transSums[tId] * 100) / 100),
              };
            });
            return nextTrans;
          });
        }
      }

      setFormData((prev) => ({
        ...prev,
        sourceId: Array.from(next).join(','),
        sourceReference: selectedRefs.map((r) => r.ref).join(', '),
        amount: totalAmount > 0 ? String(Math.round(totalAmount * 100) / 100) : prev.amount,
      }));
      return next;
    });
  };

  // Filter source refs (deliveries/trips) by search query (matching POD number, dispatch no, transporter, driver, truck, etc.)
  const filteredSourceRefs = useMemo(() => {
    if (!deliverySearch.trim()) return sourceRefs;
    const rawQ = deliverySearch.toLowerCase().trim();
    const q = rawQ.replace(/^#+/, '').replace(/^pad\s*#*/i, '').replace(/^pod\s*#*/i, '').trim();

    return sourceRefs.filter((r) => {
      const pod = String(r.padNumber || '').toLowerCase();
      const dispatchNo = String(r.dispatchNo || r.ref || '').toLowerCase();
      const label = String(r.label || '').toLowerCase();
      const driver = String(r.driverName || '').toLowerCase();
      const plate = String(r.truckPlate || '').toLowerCase();
      const transporter = String(r.transporterName || '').toLowerCase();

      return (
        pod.includes(rawQ) ||
        (q && pod.includes(q)) ||
        dispatchNo.includes(rawQ) ||
        label.includes(rawQ) ||
        driver.includes(rawQ) ||
        plate.includes(rawQ) ||
        transporter.includes(rawQ)
      );
    });
  }, [sourceRefs, deliverySearch]);

  const handleSelectAllDeliveries = () => {
    const targetList = deliverySearch.trim() ? filteredSourceRefs : sourceRefs;
    const targetIds = targetList.map((r) => r.id);
    const allTargetSelected = targetIds.length > 0 && targetIds.every((id) => selectedDeliveryIds.has(id));

    setSelectedDeliveryIds((prev) => {
      const next = new Set(prev);
      if (allTargetSelected) {
        // Deselect filtered
        targetIds.forEach((id) => next.delete(id));
      } else {
        // Select all filtered
        targetIds.forEach((id) => next.add(id));
      }
      const selectedRefs = sourceRefs.filter((r) => next.has(r.id));
      const totalAmount = selectedRefs.reduce((sum, r) => sum + (r.amount || 0), 0);

      // In Multi-Transporter mode, update individual transporter amounts
      if (formData.payeeType === 'TRANSPORTER' && transporterMode === 'multi') {
        const transSums: Record<string, number> = {};
        selectedRefs.forEach((r) => {
          if (r.transporterId) {
            transSums[r.transporterId] = (transSums[r.transporterId] || 0) + (r.amount || 0);
          }
        });

        if (selectedRefs.length > 0) {
          setMultiTransporters((prevTrans) => {
            const nextTrans = { ...prevTrans };
            Object.keys(transSums).forEach((tId) => {
              nextTrans[tId] = {
                selected: true,
                amount: String(Math.round(transSums[tId] * 100) / 100),
              };
            });
            return nextTrans;
          });
        }
      }

      setFormData((f) => ({
        ...f,
        sourceId: Array.from(next).join(','),
        sourceReference: selectedRefs.map((r) => r.ref).join(', '),
        amount: totalAmount > 0 ? String(Math.round(totalAmount * 100) / 100) : '',
      }));
      return next;
    });
  };

  const handleBankSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = bankAccounts.find((b) => b.id === selectedId);

    setFormData((prev) => ({
      ...prev,
      bankAccountId: selectedId,
      bankName: selected ? `${selected.bankName} — ${selected.accountNo}` : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.payeeType) {
        throw new Error('Please select a payee type');
      }
      if (!formData.payeeName) {
        throw new Error('Please select or enter a payee name');
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Please enter a valid amount');
      }
      if (formData.paymentMethod === 'bank_transfer' && !formData.bankAccountId) {
        throw new Error('Please select a bank account for bank transfers');
      }
      if (formData.paymentMethod === 'check' && !formData.checkNo) {
        throw new Error('Check number is required for check payments');
      }

      // Determine effective payable amount and format calculation breakdown
      const effectiveAmount = (applyVat || applyWithholding) && netPayable > 0
        ? Math.round(netPayable * 100) / 100
        : parseFloat(formData.amount);

      let autoBreakdown = '';
      if (applyVat || applyWithholding) {
        const parts = [
          `Subtotal (excl. VAT): ETB ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ];
        if (applyVat) {
          parts.push(`VAT (${vatRate}%): +ETB ${totalVAT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
          parts.push(`Gross: ETB ${grossTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        }
        if (applyWithholding) {
          parts.push(`Withholding (${withholdRate}%): -ETB ${withholdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        }
        parts.push(`Net Payable: ETB ${netPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        autoBreakdown = ` [${parts.join(' | ')}]`;
      }

      let finalDescription = formData.description || (formData.payeeId === 'ONE_TIME_SUPPLIER' ? `One-Time Supplier payment to ${formData.payeeName}` : '');
      if (autoBreakdown && !finalDescription.includes('Net Payable:')) {
        finalDescription = finalDescription ? `${finalDescription}${autoBreakdown}` : autoBreakdown.trim().replace(/^\[|\]$/g, '');
      }

      const payload = {
        voucherType: formData.voucherType,
        sourceModule: formData.sourceModule || 'PURCHASE',
        sourceId: formData.sourceId || null,
        sourceRef: formData.sourceReference || null,
        payeeType: formData.payeeType === 'ONE_TIME_SUPPLIER' ? 'SUPPLIER' : formData.payeeType,
        payeeId: formData.payeeId === 'ONE_TIME_SUPPLIER' ? null : (formData.payeeId || null),
        payeeName: formData.payeeName,
        amount: effectiveAmount,
        paymentMethod: formData.paymentMethod,
        bankAccountId: formData.bankAccountId || null,
        bankName: formData.bankName || null,
        checkNo: formData.checkNo || null,
        refNo: formData.referenceNo || null,
        description: finalDescription || null,
      };

      const response = await fetch('/api/finance/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create voucher');
      }

      router.push(`/dashboard/finance/vouchers/${result.data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const payeeOptions = getPayeeOptions();

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1D1D1F]">Create New Payment Voucher</h1>
        <Button
          variant="secondary"
          onClick={() => router.push('/dashboard/finance/vouchers')}
        >
          Cancel
        </Button>
      </div>

      {error && (
        <div className="bg-[#FF3B30]/10 border border-[#FF3B30] rounded-2xl p-4 text-[#D70015]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Voucher Type & Payee Type */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Voucher Information</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Voucher Type"
                name="voucherType"
                value={formData.voucherType}
                onChange={handleChange}
                options={[
                  { value: 'PAYMENT', label: 'Payment Voucher' },
                  { value: 'RECEIPT', label: 'Receipt Voucher' },
                  { value: 'REFUND', label: 'Refund Voucher' },
                ]}
                required
              />

              <Select
                label="Payee Type"
                name="payeeType"
                value={formData.payeeType}
                onChange={handleChange}
                options={[
                  { value: '', label: '-- Select Payee Type --' },
                  { value: 'CUSTOMER', label: 'Customer' },
                  { value: 'SUPPLIER', label: 'Supplier' },
                  { value: 'MEDICAL', label: 'Medical / Pharma Supplier' },
                  { value: 'ONE_TIME_SUPPLIER', label: 'One-Time Supplier' },
                  { value: 'TRANSPORTER', label: 'Transporter' },
                  { value: 'EMPLOYEE', label: 'Employee' },
                  { value: 'ASSOCIATION', label: 'Association' },
                  { value: 'GOVERNMENT', label: 'Government / Tax' },
                ]}
                required
              />
            </div>
          </CardBody>
        </Card>

        {/* Payee Selection */}
        {formData.payeeType && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-[#1D1D1F]">
                  Select {formData.payeeType === 'CUSTOMER' ? 'Customer' :
                    formData.payeeType === 'SUPPLIER' ? 'Supplier' :
                    formData.payeeType === 'MEDICAL' ? 'Medical Supplier' :
                    formData.payeeType === 'ONE_TIME_SUPPLIER' ? 'One-Time Supplier' :
                    formData.payeeType === 'TRANSPORTER' ? 'Transporter(s)' :
                    formData.payeeType === 'EMPLOYEE' ? 'Employee' :
                    'Payee'}
                </h2>
                {formData.payeeType === 'TRANSPORTER' && (
                  <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setTransporterMode('multi')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all ${transporterMode === 'multi' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Multi-Transporter (with Amount)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransporterMode('single')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all ${transporterMode === 'single' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Single Transporter
                    </button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {formData.payeeType === 'TRANSPORTER' && transporterMode === 'multi' ? (
                /* Multi-Transporter Selection with Individual Amounts */
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <input
                      type="text"
                      placeholder="Search transporter by name or code..."
                      value={transporterSearch}
                      onChange={(e) => setTransporterSearch(e.target.value)}
                      className="px-3 py-2 text-sm bg-white border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-72"
                    />
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={handleAutoFillPendingAmounts}
                        className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                        title="Import and populate each transporter's pending unsettled trip balance automatically"
                      >
                        <span>⚡</span>
                        <span>Auto-Fill / Import Total Balances</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectAllMultiTransporters}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                      >
                        {transporters.length > 0 && transporters.every((t) => multiTransporters[t.id]?.selected) ? 'Deselect All' : 'Select All'}
                      </button>
                      <span className="text-xs text-slate-500 font-medium">
                        ({transporters.filter((t) => multiTransporters[t.id]?.selected).length} selected)
                      </span>
                    </div>
                  </div>

                  <div className="border border-[#D2D2D7] rounded-xl overflow-hidden bg-white/80 max-h-80 overflow-y-auto divide-y divide-gray-100">
                    {transporters
                      .filter((t) => !transporterSearch || t.name.toLowerCase().includes(transporterSearch.toLowerCase()) || (t.code && t.code.toLowerCase().includes(transporterSearch.toLowerCase())))
                      .map((t) => {
                        const isSelected = !!multiTransporters[t.id]?.selected;
                        const currentAmt = multiTransporters[t.id]?.amount || '';

                        return (
                          <div
                            key={t.id}
                            className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-4 py-3 transition-colors ${isSelected ? 'bg-blue-50/70' : 'hover:bg-gray-50'}`}
                          >
                            <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleMultiTransporterToggle(t.id)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                              />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-sm text-slate-900 truncate">
                                    {t.name}
                                  </span>
                                  {t.code && (
                                    <span className="px-1.5 py-0.5 text-[11px] bg-gray-100 text-gray-600 rounded">
                                      {t.code}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {t.pendingTrips && t.pendingTrips > 0 ? (
                                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                                      🚚 {t.pendingTrips} Trip{t.pendingTrips > 1 ? 's' : ''} — Total: ETB {(t.pendingAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">
                                      No pending trips recorded
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                              {t.pendingAmount && t.pendingAmount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handleMultiTransporterAmountChange(t.id, String(t.pendingAmount))}
                                  title="Import this transporter's calculated balance into the amount field"
                                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline whitespace-nowrap"
                                >
                                  Import Total
                                </button>
                              ) : null}
                              <span className="text-xs text-slate-500 font-medium">ETB</span>
                              <input
                                type="number"
                                placeholder="0.00"
                                step="0.01"
                                value={currentAmt}
                                onChange={(e) => handleMultiTransporterAmountChange(t.id, e.target.value)}
                                className="w-32 px-3 py-1.5 text-sm bg-white border border-[#D2D2D7] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-medium text-slate-900"
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Multi-transporter live calculation summary banner */}
                  {transporters.some((t) => multiTransporters[t.id]?.selected) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs uppercase font-bold text-blue-700 block">
                          Selected Batch ({transporters.filter((t) => multiTransporters[t.id]?.selected).length} Transporters)
                        </span>
                        <p className="text-xs text-blue-600 mt-0.5">
                          Total amount is automatically calculated and linked to this voucher.
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">Total Amount:</span>
                        <span className="text-base font-bold text-blue-900">
                          ETB {transporters.filter((t) => multiTransporters[t.id]?.selected).reduce((sum, t) => sum + (parseFloat(multiTransporters[t.id]?.amount || '0') || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : payeeOptions.length > 0 ? (
                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
                    {formData.payeeType === 'CUSTOMER' ? 'Customer' :
                     formData.payeeType === 'SUPPLIER' ? 'Supplier' :
                     formData.payeeType === 'MEDICAL' ? 'Medical Supplier' :
                     formData.payeeType === 'ONE_TIME_SUPPLIER' ? 'One-Time Supplier' :
                     formData.payeeType === 'TRANSPORTER' ? 'Transporter' :
                     formData.payeeType === 'EMPLOYEE' ? 'Employee' : 'Payee'} *
                  </label>
                  <select
                    value={formData.payeeId}
                    onChange={handlePayeeSelect}
                    className="w-full px-4 py-3 bg-white/80 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-4 focus:ring-[rgba(0,122,255,0.25)] focus:border-[#007AFF] transition-all duration-200 text-[#1D1D1F]"
                    required
                  >
                    <option value="">-- Select --</option>
                    {payeeOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}{opt.code && opt.id !== 'ONE_TIME_SUPPLIER' ? ` (${opt.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {/* Show manual Payee Name input if ONE_TIME_SUPPLIER is selected or if no dropdown options exist */}
              {(formData.payeeId === 'ONE_TIME_SUPPLIER' || (payeeOptions.length === 0 && formData.payeeType !== 'TRANSPORTER')) && (
                <div>
                  <Input
                    label="One-Time Payee / Supplier Name *"
                    name="payeeName"
                    type="text"
                    placeholder="Enter one-time supplier or payee name"
                    value={formData.payeeName}
                    onChange={handleChange}
                    required
                  />
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    ⚡ One-Time Supplier mode active: Enter the name above and specify your payment amount below.
                  </p>
                </div>
              )}

              {formData.payeeName && formData.payeeId !== 'ONE_TIME_SUPPLIER' && formData.payeeType !== 'TRANSPORTER' && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <span className="text-sm text-green-800">
                    Selected: <strong>{formData.payeeName}</strong>
                  </span>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Source Module & Reference */}
        {formData.payeeType && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[#1D1D1F]">Source Reference</h2>
              <p className="text-sm text-[#86868B] mt-1">Link this voucher to its source document</p>
            </CardHeader>
            <CardBody className="space-y-4">
              <Select
                label="Source Module"
                name="sourceModule"
                value={formData.sourceModule}
                onChange={handleChange}
                options={[
                  { value: '', label: '-- Select Module --' },
                  { value: 'SALES', label: 'Sales Invoices (Customer)' },
                  { value: 'PURCHASE', label: 'Purchase Orders' },
                  { value: 'AGGREGATE', label: 'Aggregate Dispatches' },
                  { value: 'CEMENT', label: 'Cement Purchases' },
                  { value: 'PAYROLL', label: 'Payroll' },
                  { value: 'MEDICAL', label: 'Medical Purchase Requests' },
                  { value: 'TRANSPORTER', label: 'Transporter Settlements' },
                  { value: 'ASSOCIATION', label: 'Association' },
                  { value: 'VAT', label: 'VAT / Tax' },
                ]}
              />

              {formData.sourceModule && sourceRefs.length > 0 && (formData.sourceModule === 'AGGREGATE' || formData.sourceModule === 'TRANSPORTER') && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider">
                      Select {formData.sourceModule === 'TRANSPORTER' ? 'Transporter Trips / Dispatches' : 'Deliveries'} to Settle ({selectedDeliveryIds.size} selected)
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllDeliveries}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                    >
                      {filteredSourceRefs.length > 0 && filteredSourceRefs.every((r) => selectedDeliveryIds.has(r.id))
                        ? (deliverySearch ? 'Deselect Filtered' : 'Deselect All')
                        : (deliverySearch ? `Select All Filtered (${filteredSourceRefs.length})` : 'Select All')}
                    </button>
                  </div>

                  {/* Search box for POD / Dispatch number */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={deliverySearch}
                      onChange={(e) => setDeliverySearch(e.target.value)}
                      placeholder="Search deliveries by POD number (e.g. 01995), Dispatch No, or Truck..."
                      className="block w-full pl-9 pr-8 py-2 text-sm bg-white border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400"
                    />
                    {deliverySearch && (
                      <button
                        type="button"
                        onClick={() => setDeliverySearch('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {filteredSourceRefs.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                      <p className="text-slate-600 text-sm">
                        No deliveries matching &quot;{deliverySearch}&quot;
                      </p>
                      <button
                        type="button"
                        onClick={() => setDeliverySearch('')}
                        className="text-xs text-blue-600 font-semibold mt-1 hover:underline"
                      >
                        Clear search filter
                      </button>
                    </div>
                  ) : (
                    <div className="border border-[#D2D2D7] rounded-xl overflow-hidden bg-white/80">
                      <div className="px-4 py-2 bg-gray-50 border-b border-[#D2D2D7] flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={
                              filteredSourceRefs.length > 0 &&
                              filteredSourceRefs.every((r) => selectedDeliveryIds.has(r.id))
                            }
                            onChange={handleSelectAllDeliveries}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium text-slate-700">
                            Select All {deliverySearch ? `Filtered (${filteredSourceRefs.length})` : `(${sourceRefs.length})`}
                          </span>
                        </label>
                        {selectedDeliveryIds.size > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">Selected Total:</span>
                            <span className="text-sm font-bold text-blue-600">
                              ETB {sourceRefs.filter((r) => selectedDeliveryIds.has(r.id)).reduce((s, r) => s + (r.amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                        {filteredSourceRefs.map((ref) => {
                          const isSelected = selectedDeliveryIds.has(ref.id);
                          return (
                            <label
                              key={ref.id}
                              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/70' : 'hover:bg-gray-50'}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleDeliveryToggle(ref.id)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1 text-sm min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-slate-900">
                                    Dispatch: {ref.dispatchNo || ref.ref}
                                  </span>
                                  {ref.padNumber && ref.padNumber !== 'N/A' && (
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-200">
                                      POD: {ref.padNumber}
                                    </span>
                                  )}
                                  {ref.transporterName && (
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-md border border-indigo-200">
                                      🏢 {ref.transporterName}
                                    </span>
                                  )}
                                  {(ref.driverName || ref.truckPlate) && (
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md">
                                      🚚 {ref.driverName || ''} {ref.truckPlate ? `(${ref.truckPlate})` : ''}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{ref.label}</p>
                              </div>
                              <div className="text-right whitespace-nowrap ml-3">
                                <span className="text-sm font-bold text-slate-900">
                                  ETB {(ref.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <p className="text-[11px] font-medium text-slate-500">
                                  {formData.payeeType === 'CUSTOMER' ? 'Customer Receivable' :
                                   formData.payeeType === 'TRANSPORTER' || formData.sourceModule === 'TRANSPORTER' ? 'Transporter Freight' :
                                   formData.payeeType === 'SUPPLIER' ? 'Supplier Material' : 'Payable'}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {loadingRefs && <p className="text-xs text-slate-500 mt-1">Loading references...</p>}
                </div>
              )}

              {formData.sourceModule && sourceRefs.length > 0 && formData.sourceModule !== 'AGGREGATE' && formData.sourceModule !== 'TRANSPORTER' && (
                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
                    Source Document
                  </label>
                  <select
                    value={formData.sourceId}
                    onChange={handleSourceSelect}
                    className="w-full px-4 py-3 bg-white/80 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-4 focus:ring-[rgba(0,122,255,0.25)] focus:border-[#007AFF] transition-all duration-200 text-[#1D1D1F]"
                  >
                    <option value="">-- Select Source Document --</option>
                    {sourceRefs.map((ref) => (
                      <option key={ref.id} value={ref.id}>
                        {ref.label}{ref.amount ? ` — ETB ${ref.amount.toLocaleString('en-US')}` : ''}
                      </option>
                    ))}
                  </select>
                  {loadingRefs && <p className="text-xs text-slate-500 mt-1">Loading references...</p>}
                </div>
              )}

              {formData.sourceModule && sourceRefs.length === 0 && !loadingRefs && (
                <div>
                  <Input
                    label="Source Reference (Manual)"
                    name="sourceReference"
                    type="text"
                    placeholder="e.g., PO-0000001"
                    value={formData.sourceReference}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-slate-500 mt-1">No records found. Enter reference manually if needed.</p>
                </div>
              )}

              {formData.sourceReference && (() => {
                const selected = sourceRefs.find((r) => r.id === formData.sourceId || r.ref === formData.sourceReference);
                const isPartial = selected?.isPartial || selected?.status === 'Partial' || (selected?.paidAmount && selected.paidAmount > 0 && selected.remainingAmount && selected.remainingAmount > 0);

                return (
                  <div className={`p-4 rounded-xl border ${isPartial ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-blue-50 border-blue-200 text-blue-900'} space-y-1.5`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">
                        Selected Ref: {formData.sourceReference}
                      </span>
                      {isPartial ? (
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-200 text-amber-900 border border-amber-400">
                          🟡 Partial Payment
                        </span>
                      ) : selected?.status === 'Paid' ? (
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-green-200 text-green-900 border border-green-400">
                          🟢 Paid
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-200 text-blue-900 border border-blue-300">
                          🔴 Unpaid / Full Payment
                        </span>
                      )}
                    </div>

                    {selected && (selected.totalAmount !== undefined || selected.paidAmount !== undefined || selected.remainingAmount !== undefined) && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-current/10">
                        <div>
                          <span className="text-slate-500 block">Total Amount:</span>
                          <span className="font-bold">ETB {(selected.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Previously Paid:</span>
                          <span className="font-bold text-emerald-700">ETB {(selected.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Remaining Balance:</span>
                          <span className="font-bold text-amber-800">ETB {(selected.remainingAmount || selected.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardBody>
          </Card>
        )}

        {/* Payment Details */}
        {formData.payeeType && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[#1D1D1F]">Payment Details</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Amount / Subtotal (excl. VAT) *"
                    name="amount"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                  />
                  {formData.payeeId === 'ONE_TIME_SUPPLIER' && (
                    <p className="text-xs text-blue-600 mt-1 font-medium flex items-center gap-1">
                      <span>✓ Amount fetched from your manual entry:</span>
                      <strong>ETB {formData.amount ? parseFloat(formData.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</strong>
                    </p>
                  )}
                  {(applyVat || applyWithholding) && subtotal > 0 && (
                    <p className="text-xs text-emerald-700 mt-1 font-medium flex items-center gap-1">
                      <span>✓ Calculated Net Payable:</span>
                      <strong>ETB {netPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </p>
                  )}
                </div>

                <Select
                  label="Payment Method"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                    { value: 'check', label: 'Check' },
                  ]}
                  required
                />
              </div>

              {formData.paymentMethod === 'bank_transfer' && (
                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
                    Bank Account *
                  </label>
                  {bankAccounts.length > 0 ? (
                    <select
                      value={formData.bankAccountId}
                      onChange={handleBankSelect}
                      className="w-full px-4 py-3 bg-white/80 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-4 focus:ring-[rgba(0,122,255,0.25)] focus:border-[#007AFF] transition-all duration-200 text-[#1D1D1F]"
                      required
                    >
                      <option value="">-- Select Bank Account --</option>
                      {bankAccounts.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.bankName} — {bank.accountNo} ({bank.accountName})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      label="Bank Name"
                      name="bankName"
                      type="text"
                      placeholder="Enter bank name"
                      value={formData.bankName}
                      onChange={handleChange}
                      required
                    />
                  )}
                </div>
              )}

              {formData.paymentMethod === 'check' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Check Number"
                    name="checkNo"
                    type="text"
                    placeholder="Enter check number"
                    value={formData.checkNo}
                    onChange={handleChange}
                    required
                  />
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
                      Bank Account
                    </label>
                    {bankAccounts.length > 0 ? (
                      <select
                        value={formData.bankAccountId}
                        onChange={handleBankSelect}
                        className="w-full px-4 py-3 bg-white/80 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-4 focus:ring-[rgba(0,122,255,0.25)] focus:border-[#007AFF] transition-all duration-200 text-[#1D1D1F]"
                      >
                        <option value="">-- Select Bank Account --</option>
                        {bankAccounts.map((bank) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.bankName} — {bank.accountNo} ({bank.accountName})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        label=""
                        name="bankName"
                        type="text"
                        placeholder="Enter bank name"
                        value={formData.bankName}
                        onChange={handleChange}
                      />
                    )}
                  </div>
                </div>
              )}

              <Input
                label="Reference Number (Optional)"
                name="referenceNo"
                type="text"
                placeholder="e.g., transaction reference"
                value={formData.referenceNo}
                onChange={handleChange}
              />
            </CardBody>
          </Card>
        )}

        {/* Step 3: VAT & Totals */}
        {formData.payeeType && (
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#1D1D1F]">3. VAT & Totals</h2>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={applyVat}
                    onChange={(e) => setApplyVat(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Apply VAT ({vatRate}%)</span>
                </label>
                {applyVat && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">Rate:</span>
                    <select
                      value={vatRate}
                      onChange={(e) => setVatRate(Number(e.target.value) || 0)}
                      className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
                    >
                      <option value={15}>15% (Standard VAT)</option>
                      <option value={10}>10%</option>
                      <option value={5}>5%</option>
                      <option value={0}>0% (Exempt)</option>
                    </select>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardBody>
              <div className="max-w-md ml-auto space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal (excl. VAT):</span>
                  <span className="font-medium text-slate-900">
                    ETB {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {applyVat ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">VAT ({vatRate}%):</span>
                    <span className="font-medium text-blue-600">
                      + ETB {totalVAT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>VAT (0% - Not Applied):</span>
                    <span>+ ETB 0.00</span>
                  </div>
                )}

                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-slate-900 font-medium">Gross Total:</span>
                  <span className="font-semibold text-slate-900">
                    ETB {grossTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Withholding Tax */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyWithholding}
                        onChange={(e) => setApplyWithholding(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700 font-medium">
                        Apply Withholding Tax ({withholdRate}%)
                      </span>
                    </label>
                    {applyWithholding && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500">Rate:</span>
                        <select
                          value={withholdRate}
                          onChange={(e) => setWithholdRate(Number(e.target.value) || 0)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
                        >
                          <option value={3}>3% (Goods/Services)</option>
                          <option value={2}>2% (Standard Goods)</option>
                          <option value={5}>5%</option>
                          <option value={10}>10%</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {applyWithholding && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Withholding ({withholdRate}% of subtotal):</span>
                      <span className="font-medium text-red-600">
                        - ETB {withholdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-900 pt-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-lg font-bold text-slate-900">Net Payable:</span>
                    <span className="text-2xl font-bold text-[#007AFF]">
                      ETB {netPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* VAT Info Box */}
                {applyVat && totalVAT > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
                    <p className="text-xs text-amber-800 font-medium">VAT Note</p>
                    <p className="text-xs text-amber-700 mt-1">
                      This voucher VAT of ETB {totalVAT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} will be recorded
                      for the current filing period. View VAT reports under Finance &rarr; VAT Management.
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Description */}
        {formData.payeeType && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[#1D1D1F]">Additional Information</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  name="description"
                  placeholder="Enter any additional notes or description"
                  className="w-full px-4 py-3 bg-white/80 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-4 focus:ring-[rgba(0,122,255,0.25)] focus:border-[#007AFF] transition-all duration-200 text-[#1D1D1F] placeholder:text-[#86868B] min-h-24 resize-vertical"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>
            </CardBody>
          </Card>
        )}

        {/* Summary */}
        {formData.payeeName && formData.amount && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[#1D1D1F]">Voucher Summary</h2>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 uppercase">Type</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{formData.voucherType}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 uppercase">Payee</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1 truncate">{formData.payeeName}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-600 uppercase">
                    {applyVat || applyWithholding ? 'Net Payable' : 'Amount'}
                  </p>
                  <p className="text-lg font-bold text-blue-900 mt-1">
                    ETB {(applyVat || applyWithholding ? netPayable : parseFloat(formData.amount || '0')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {(applyVat || applyWithholding) && (
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Subtotal: ETB {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      {applyVat ? ` | VAT: +${totalVAT.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
                      {applyWithholding ? ` | WHT: -${withholdAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
                    </p>
                  )}
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 uppercase">Method</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1 capitalize">{formData.paymentMethod.replace('_', ' ')}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Action Buttons — always visible */}
        <Card>
          <CardBody>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/dashboard/finance/vouchers')}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                type="submit"
                disabled={loading}
                isLoading={loading}
              >
                Create Voucher
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}
