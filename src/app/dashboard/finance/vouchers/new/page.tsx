'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, Button, Input, Select } from '@/components/ui';
import { Search, Truck, X, CheckSquare, Square, Users } from 'lucide-react';

interface EntityOption {
  id: string;
  name: string;
  code?: string;
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
  const [employees, setEmployees] = useState<EntityOption[]>([]);
  const [transporters, setTransporters] = useState<EntityOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [sourceRefs, setSourceRefs] = useState<SourceRefOption[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  
  // Multi-select for Transporters
  const [selectedTransporterIds, setSelectedTransporterIds] = useState<Set<string>>(new Set());
  const [transporterSearch, setTransporterSearch] = useState('');

  // Multi-select for AGGREGATE/TRANSPORTER deliveries
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<string>>(new Set());

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

  // Fetch all entity lists on mount
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoadingEntities(true);
        const [custRes, suppRes, empRes, transRes, bankRes, allCustRes] = await Promise.all([
          fetch('/api/sales/agreements/customers').then((r) => r.json()).catch(() => ({ success: false })),
          fetch('/api/suppliers?limit=1000').then((r) => r.json()).catch(() => ({ success: false })),
          fetch('/api/employees?limit=1000').then((r) => r.json()).catch(() => ({ success: false })),
          fetch('/api/transporters?limit=1000').then((r) => r.json()).catch(() => ({ success: false })),
          fetch('/api/finance/bank?limit=100').then((r) => r.json()).catch(() => ({ success: false })),
          fetch('/api/customers?limit=1000').then((r) => r.json()).catch(() => ({ success: false })),
        ]);

        const customerMap = new Map<string, EntityOption>();

        if (allCustRes.success && Array.isArray(allCustRes.data)) {
          allCustRes.data.forEach((c: any) => {
            if (c.id) {
              customerMap.set(c.id, {
                id: c.id,
                name: c.companyName || c.name || 'Customer',
                code: c.code || '',
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
          }));
          setSuppliers([
            { id: 'ONE_TIME_SUPPLIER', name: '⚡ One-Time Supplier (Ad-Hoc / Manual)', code: 'ONE-TIME' },
            ...fetchedSuppliers,
          ]);
        } else {
          setSuppliers([
            { id: 'ONE_TIME_SUPPLIER', name: '⚡ One-Time Supplier (Ad-Hoc / Manual)', code: 'ONE-TIME' },
          ]);
        }
        if (empRes.success) {
          setEmployees(
            (empRes.data || []).map((e: any) => ({
              id: e.id,
              name: e.fullName || e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim(),
              code: e.employeeId || e.code,
            }))
          );
        }
        if (transRes.success) {
          setTransporters(
            (transRes.data || []).map((t: any) => ({
              id: t.id,
              name: t.companyName || t.name || '',
              code: t.code,
            }))
          );
        }
        if (bankRes.success) {
          setBankAccounts(bankRes.data || []);
        }
      } catch (err) {
        console.error('Error loading entities:', err);
      } finally {
        setLoadingEntities(false);
      }
    };
    fetchAll();
  }, []);

  const getPayeeOptions = (): EntityOption[] => {
    switch (formData.payeeType) {
      case 'CUSTOMER':
        return customers;
      case 'SUPPLIER':
        return suppliers;
      case 'ONE_TIME_SUPPLIER':
        return [{ id: 'ONE_TIME_SUPPLIER', name: '⚡ One-Time Supplier (Ad-Hoc / Manual)', code: 'ONE-TIME' }];
      case 'EMPLOYEE':
        return employees;
      case 'TRANSPORTER':
        return transporters;
      default:
        return [];
    }
  };

  // Multi-select handlers for transporters
  const handleTransporterToggle = (transporterId: string) => {
    setSelectedTransporterIds((prev) => {
      const next = new Set(prev);
      if (next.has(transporterId)) {
        next.delete(transporterId);
      } else {
        next.add(transporterId);
      }

      const selected = transporters.filter((t) => next.has(t.id));
      let names = '';
      if (selected.length === 1) {
        names = `${selected[0].name}${selected[0].code ? ` (${selected[0].code})` : ''}`;
      } else if (selected.length > 1) {
        names = selected.map((t) => t.name).join(', ');
      }

      const ids = Array.from(next).join(',');

      setFormData((prevForm) => ({
        ...prevForm,
        payeeId: ids,
        payeeName: names,
      }));
      return next;
    });
  };

  const handleSelectAllTransporters = () => {
    const filteredTransporters = transporters.filter(
      (t) =>
        t.name.toLowerCase().includes(transporterSearch.toLowerCase()) ||
        (t.code && t.code.toLowerCase().includes(transporterSearch.toLowerCase()))
    );

    const isAllFilteredSelected =
      filteredTransporters.length > 0 &&
      filteredTransporters.every((t) => selectedTransporterIds.has(t.id));

    if (isAllFilteredSelected) {
      // Uncheck all filtered
      setSelectedTransporterIds((prev) => {
        const next = new Set(prev);
        filteredTransporters.forEach((t) => next.delete(t.id));
        const selected = transporters.filter((t) => next.has(t.id));
        let names = '';
        if (selected.length === 1) {
          names = `${selected[0].name}${selected[0].code ? ` (${selected[0].code})` : ''}`;
        } else if (selected.length > 1) {
          names = selected.map((t) => t.name).join(', ');
        }

        setFormData((prevForm) => ({
          ...prevForm,
          payeeId: Array.from(next).join(','),
          payeeName: names,
        }));
        return next;
      });
    } else {
      // Check all filtered
      setSelectedTransporterIds((prev) => {
        const next = new Set(prev);
        filteredTransporters.forEach((t) => next.add(t.id));
        const selected = transporters.filter((t) => next.has(t.id));
        let names = '';
        if (selected.length === 1) {
          names = `${selected[0].name}${selected[0].code ? ` (${selected[0].code})` : ''}`;
        } else if (selected.length > 1) {
          names = selected.map((t) => t.name).join(', ');
        }

        setFormData((prevForm) => ({
          ...prevForm,
          payeeId: Array.from(next).join(','),
          payeeName: names,
        }));
        return next;
      });
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
              const approvedOnly = poRes.data.filter(
                (po: any) => po.status === 'Approved' || po.status === 'Active' || po.status === 'Received'
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
          case 'TRANSPORTER':
          case 'AGGREGATE': {
            const aggParams = new URLSearchParams({ limit: '1000' });
            if (formData.payeeType === 'CUSTOMER' && formData.payeeId && formData.payeeId !== 'ONE_TIME_SUPPLIER') {
              aggParams.set('customerId', formData.payeeId);
            } else if (formData.payeeType === 'SUPPLIER' && formData.payeeId && formData.payeeId !== 'ONE_TIME_SUPPLIER') {
              aggParams.set('supplierId', formData.payeeId);
            } else if (formData.payeeType === 'TRANSPORTER' && formData.payeeId && formData.payeeId !== 'ONE_TIME_SUPPLIER') {
              if (!formData.payeeId.includes(',')) {
                aggParams.set('transporterId', formData.payeeId);
              }
            }

            let res = await fetch(`/api/aggregate?${aggParams.toString()}`);
            let data = await res.json();
            let deliveryList = data.success && Array.isArray(data.data) ? data.data : [];

            // Fallback: if filtered query returned empty, fetch all dispatches and filter client-side
            if (deliveryList.length === 0 && (formData.payeeId || selectedTransporterIds.size > 0)) {
              const allRes = await fetch('/api/aggregate?limit=1000');
              const allData = await allRes.json();
              if (allData.success && Array.isArray(allData.data)) {
                deliveryList = allData.data;
              }
            }

            // Filter for Customer if selected
            if (formData.payeeType === 'CUSTOMER' && formData.payeeId) {
              const custMatches = deliveryList.filter(
                (d: any) =>
                  d.customerId === formData.payeeId ||
                  d.customer?.id === formData.payeeId ||
                  (d.customer?.companyName &&
                    formData.payeeName &&
                    d.customer.companyName.toLowerCase().includes(formData.payeeName.toLowerCase()))
              );
              if (custMatches.length > 0) {
                deliveryList = custMatches;
              }
            }

            // Filter for Supplier if selected
            if (
              (formData.payeeType === 'SUPPLIER' || formData.payeeType === 'ONE_TIME_SUPPLIER') &&
              formData.payeeId &&
              formData.payeeId !== 'ONE_TIME_SUPPLIER'
            ) {
              const suppMatches = deliveryList.filter(
                (d: any) =>
                  d.supplierId === formData.payeeId ||
                  d.supplier?.id === formData.payeeId ||
                  (d.supplier?.companyName &&
                    formData.payeeName &&
                    d.supplier.companyName.toLowerCase().includes(formData.payeeName.toLowerCase()))
              );
              if (suppMatches.length > 0) {
                deliveryList = suppMatches;
              }
            }

            // Filter for Transporter if selected
            if (formData.payeeType === 'TRANSPORTER' && selectedTransporterIds.size > 0) {
              deliveryList = deliveryList.filter(
                (d: any) =>
                  selectedTransporterIds.has(d.transporterId) ||
                  (d.transporter && selectedTransporterIds.has(d.transporter.id))
              );
            }

            refs = deliveryList.map((d: any) => {
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
              const partyStr =
                d.customer?.companyName ||
                d.supplier?.companyName ||
                d.transporter?.companyName ||
                d.transporter?.name ||
                '';

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
              };
            });
            break;
          }
          case 'CEMENT': {
            const [purchasesRes, liftingsRes] = await Promise.all([
              fetch('/api/cement/purchases?limit=200').then((r) => r.json()).catch(() => ({ success: false })),
              fetch('/api/cement/liftings?limit=200').then((r) => r.json()).catch(() => ({ success: false })),
            ]);

            const cementRefs: SourceRefOption[] = [];

            // Customer cement liftings
            if (liftingsRes.success && Array.isArray(liftingsRes.data)) {
              let liftingList = liftingsRes.data;
              if (formData.payeeType === 'CUSTOMER' && formData.payeeId) {
                const custLiftings = liftingList.filter(
                  (l: any) =>
                    l.customerId === formData.payeeId ||
                    l.customer?.id === formData.payeeId ||
                    (l.customer?.companyName &&
                      formData.payeeName &&
                      l.customer.companyName.toLowerCase().includes(formData.payeeName.toLowerCase()))
                );
                if (custLiftings.length > 0) {
                  liftingList = custLiftings;
                }
              }

              liftingList.forEach((l: any) => {
                const total = Number(l.totalAmount || 0);
                cementRefs.push({
                  id: l.id,
                  dispatchNo: l.liftingNo,
                  padNumber: l.couponNo || l.padNumber || 'N/A',
                  label: `Cement Lifting: ${l.liftingNo} — ${l.customer?.companyName || l.factory?.name || 'Customer'} — ${l.cementType || 'Cement'} — ETB ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${l.status || 'Active'})`,
                  ref: l.liftingNo,
                  amount: total,
                  totalAmount: total,
                  status: l.status || 'Active',
                });
              });
            }

            // Supplier/Factory cement purchases
            if (purchasesRes.success && Array.isArray(purchasesRes.data)) {
              let purchaseList = purchasesRes.data;
              if (
                (formData.payeeType === 'SUPPLIER' || formData.payeeType === 'ONE_TIME_SUPPLIER') &&
                formData.payeeId &&
                formData.payeeId !== 'ONE_TIME_SUPPLIER'
              ) {
                const suppPurchases = purchaseList.filter(
                  (p: any) =>
                    p.factoryId === formData.payeeId ||
                    p.factory?.id === formData.payeeId ||
                    (p.factory?.name &&
                      formData.payeeName &&
                      p.factory.name.toLowerCase().includes(formData.payeeName.toLowerCase()))
                );
                if (suppPurchases.length > 0) {
                  purchaseList = suppPurchases;
                }
              }

              purchaseList.forEach((p: any) => {
                const total = Number(p.totalAmount) || 0;
                const paid = Number(p.paidAmount) || 0;
                const remaining = Math.max(0, total - paid);
                const isPartial = p.paymentStatus === 'Partial' || (paid > 0 && remaining > 0);
                const statusStr = isPartial ? 'Partial' : remaining <= 0 ? 'Paid' : 'Unpaid';
                const badge = isPartial ? '🟡 Partial Payment' : statusStr === 'Paid' ? '🟢 Paid' : '🔴 Unpaid';

                cementRefs.push({
                  id: p.id,
                  dispatchNo: p.purchaseNo,
                  padNumber: p.orderNo || 'N/A',
                  label: `Cement Purchase: ${p.purchaseNo} — ${p.factory?.name || 'Factory'} — Total: ETB ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Paid: ETB ${paid.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Rem: ETB ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${badge})`,
                  ref: p.purchaseNo,
                  amount: remaining > 0 ? remaining : total,
                  totalAmount: total,
                  paidAmount: paid,
                  remainingAmount: remaining,
                  isPartial,
                  status: statusStr,
                });
              });
            }

            refs = cementRefs;
            break;
          }
          case 'PAYROLL': {
            const res = await fetch('/api/hr/payroll?limit=50');
            const data = await res.json();
            if (data.success) {
              const approvedOnly = (data.data || []).filter(
                (pr: any) => pr.status === 'Approved' || pr.status === 'Active' || pr.status === 'Finalized'
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
            const res = await fetch('/api/medical/purchase-requests?limit=100');
            const data = await res.json();
            if (data.success) {
              const approvedOnly = (data.data || []).filter(
                (r: any) => r.status === 'Approved' || r.status === 'Active'
              );
              refs = approvedOnly.map((r: any) => ({
                id: r.id,
                label: `${r.requestNo || r.id} — ${r.customer?.companyName || 'Unknown'}`,
                ref: r.requestNo || r.id,
                amount: r.totalAmount,
              }));
            }
            break;
          }
          case 'SALES': {
            const invoiceParams = new URLSearchParams({ limit: '200' });
            if (formData.payeeId && formData.payeeId !== 'ONE_TIME_SUPPLIER') {
              invoiceParams.set('customerId', formData.payeeId);
            }

            let invRes = await fetch(`/api/sales/invoices?${invoiceParams.toString()}&status=Unpaid,Partial`);
            let invData = await invRes.json();
            let invoiceList = invData.success && Array.isArray(invData.data) ? invData.data : [];

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
              const remainingAmount =
                inv.remainingAmount !== undefined
                  ? Number(inv.remainingAmount)
                  : Math.max(0, totalAmount - paidAmount);
              const isPartial = inv.isPartial || (paidAmount > 0 && remainingAmount > 0);
              const statusStr = isPartial
                ? 'Partial'
                : paidAmount >= totalAmount && totalAmount > 0
                ? 'Paid'
                : inv.status || 'Unpaid';
              const dateStr = inv.dueDate
                ? `Due: ${new Date(inv.dueDate).toLocaleDateString()}`
                : inv.createdAt
                ? new Date(inv.createdAt).toLocaleDateString()
                : 'N/A';

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
          default: {
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
  }, [formData.sourceModule, formData.payeeId, selectedTransporterIds]);

  // When payee type changes, reset payee selection and transporter multi-select state
  useEffect(() => {
    setSelectedTransporterIds(new Set());
    setTransporterSearch('');
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
      SUPPLIER: 'PURCHASE',
      ONE_TIME_SUPPLIER: 'PURCHASE',
      CUSTOMER: 'SALES',
      TRANSPORTER: 'TRANSPORTER',
      EMPLOYEE: 'PAYROLL',
      ASSOCIATION: 'ASSOCIATION',
      GOVERNMENT: 'VAT',
    };
    const suggested = moduleMap[formData.payeeType];
    if (suggested) {
      setFormData((prev) => ({
        ...prev,
        sourceModule: suggested,
        payeeId: formData.payeeType === 'ONE_TIME_SUPPLIER' ? 'ONE_TIME_SUPPLIER' : prev.payeeId,
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
        payeeName:
          prev.payeeName && prev.payeeName !== '⚡ One-Time Supplier (Ad-Hoc / Manual)' ? prev.payeeName : '',
        sourceModule: prev.sourceModule || 'PURCHASE',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        payeeId: selectedId,
        payeeName: selected ? `${selected.name}${selected.code ? ` (${selected.code})` : ''}` : '',
      }));
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
      const labelParts = selected.label ? selected.label.split(' — ') : [];
      const extractedParty =
        selected.supplierName || (labelParts.length > 1 ? labelParts[1].split(' (')[0].trim() : '');

      const targetAmount =
        selected.amount !== undefined && selected.amount !== null && selected.amount > 0
          ? String(selected.amount)
          : prev.amount;

      return {
        ...prev,
        sourceId: selected.id,
        sourceReference: selected.ref || '',
        amount: targetAmount,
        payeeName:
          (prev.payeeId === 'ONE_TIME_SUPPLIER' || !prev.payeeName) && extractedParty
            ? extractedParty
            : prev.payeeName,
        paymentMethod: selected.paymentMethod || prev.paymentMethod,
        bankName: selected.bankName || prev.bankName,
        description:
          prev.description ||
          (selected.ref ? `Voucher settlement for ref: ${selected.ref}` : prev.description),
      };
    });
  };

  // Toggle delivery selection (multi-select)
  const handleDeliveryToggle = (deliveryId: string) => {
    setSelectedDeliveryIds((prev) => {
      const next = new Set(prev);
      if (next.has(deliveryId)) {
        next.delete(deliveryId);
      } else {
        next.add(deliveryId);
      }
      const selectedRefs = sourceRefs.filter((r) => next.has(r.id));
      const totalAmount = selectedRefs.reduce((sum, r) => sum + (r.amount || 0), 0);
      setFormData((prevForm) => ({
        ...prevForm,
        sourceId: Array.from(next).join(','),
        sourceReference: selectedRefs.map((r) => r.ref).join(', '),
        amount: totalAmount > 0 ? String(Math.round(totalAmount * 100) / 100) : prevForm.amount,
      }));
      return next;
    });
  };

  const handleSelectAllDeliveries = () => {
    if (selectedDeliveryIds.size === sourceRefs.length) {
      setSelectedDeliveryIds(new Set());
      setFormData((prev) => ({ ...prev, sourceId: '', sourceReference: '', amount: '' }));
    } else {
      const allIds = new Set(sourceRefs.map((r) => r.id));
      const totalAmount = sourceRefs.reduce((sum, r) => sum + (r.amount || 0), 0);
      setSelectedDeliveryIds(allIds);
      setFormData((prev) => ({
        ...prev,
        sourceId: Array.from(allIds).join(','),
        sourceReference: sourceRefs.map((r) => r.ref).join(', '),
        amount: String(Math.round(totalAmount * 100) / 100),
      }));
    }
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
        throw new Error(
          formData.payeeType === 'TRANSPORTER'
            ? 'Please select at least one transporter'
            : 'Please select or enter a payee name'
        );
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

      const payload = {
        voucherType: formData.voucherType,
        sourceModule: formData.sourceModule || 'PURCHASE',
        sourceId: formData.sourceId || null,
        sourceRef: formData.sourceReference || null,
        payeeType: formData.payeeType === 'ONE_TIME_SUPPLIER' ? 'SUPPLIER' : formData.payeeType,
        payeeId: formData.payeeId === 'ONE_TIME_SUPPLIER' ? null : formData.payeeId || null,
        payeeName: formData.payeeName,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        bankAccountId: formData.bankAccountId || null,
        bankName: formData.bankName || null,
        checkNo: formData.checkNo || null,
        refNo: formData.referenceNo || null,
        description:
          formData.description ||
          (formData.payeeId === 'ONE_TIME_SUPPLIER'
            ? `One-Time Supplier payment to ${formData.payeeName}`
            : null),
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
        <Button variant="secondary" onClick={() => router.push('/dashboard/finance/vouchers')}>
          Cancel
        </Button>
      </div>

      {error && (
        <div className="bg-[#FF3B30]/10 border border-[#FF3B30] rounded-2xl p-4 text-[#D70015]">{error}</div>
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
                  { value: 'ONE_TIME_SUPPLIER', label: 'One-Time Supplier' },
                  { value: 'TRANSPORTER', label: 'Transporter (Multi-Select Available)' },
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
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#1D1D1F]">
                  Select{' '}
                  {formData.payeeType === 'CUSTOMER'
                    ? 'Customer'
                    : formData.payeeType === 'SUPPLIER'
                    ? 'Supplier'
                    : formData.payeeType === 'ONE_TIME_SUPPLIER'
                    ? 'One-Time Supplier'
                    : formData.payeeType === 'TRANSPORTER'
                    ? 'Transporter(s)'
                    : formData.payeeType === 'EMPLOYEE'
                    ? 'Employee'
                    : 'Payee'}
                </h2>
                {formData.payeeType === 'TRANSPORTER' && (
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5" /> Checkbox Multi-Select
                  </span>
                )}
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {formData.payeeType === 'TRANSPORTER' ? (
                /* Transporter Multi-Select Checkbox UI */
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider">
                      Select Transporters ({selectedTransporterIds.size} of {transporters.length} selected) *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllTransporters}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {transporters.length > 0 &&
                        transporters
                          .filter(
                            (t) =>
                              t.name.toLowerCase().includes(transporterSearch.toLowerCase()) ||
                              (t.code && t.code.toLowerCase().includes(transporterSearch.toLowerCase()))
                          )
                          .every((t) => selectedTransporterIds.has(t.id))
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                      {selectedTransporterIds.size > 0 && (
                        <>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransporterIds(new Set());
                              setFormData((prev) => ({ ...prev, payeeId: '', payeeName: '' }));
                            }}
                            className="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
                          >
                            Clear Selection
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search transporters by name or code..."
                      value={transporterSearch}
                      onChange={(e) => setTransporterSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 bg-white/80 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-4 focus:ring-[rgba(0,122,255,0.25)] focus:border-[#007AFF] transition-all text-sm text-[#1D1D1F]"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    {transporterSearch && (
                      <button
                        type="button"
                        onClick={() => setTransporterSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Transporters Multi-Select Checklist */}
                  <div className="border border-[#D2D2D7] rounded-xl overflow-hidden bg-white/80 shadow-inner">
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                      {transporters
                        .filter(
                          (t) =>
                            t.name.toLowerCase().includes(transporterSearch.toLowerCase()) ||
                            (t.code && t.code.toLowerCase().includes(transporterSearch.toLowerCase()))
                        )
                        .map((transporter) => {
                          const isChecked = selectedTransporterIds.has(transporter.id);
                          return (
                            <label
                              key={transporter.id}
                              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                                isChecked ? 'bg-blue-50/80' : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTransporterToggle(transporter.id)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Truck className={`w-4 h-4 ${isChecked ? 'text-blue-600' : 'text-gray-400'}`} />
                                  <span
                                    className={`text-sm font-medium ${
                                      isChecked ? 'text-blue-900 font-semibold' : 'text-gray-900'
                                    }`}
                                  >
                                    {transporter.name}
                                  </span>
                                </div>
                                {transporter.code && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-md border border-gray-200">
                                    {transporter.code}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      {transporters.filter(
                        (t) =>
                          t.name.toLowerCase().includes(transporterSearch.toLowerCase()) ||
                          (t.code && t.code.toLowerCase().includes(transporterSearch.toLowerCase()))
                      ).length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                          {loadingEntities ? 'Loading transporters...' : `No transporters matching "${transporterSearch}"`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Transporters Tags */}
                  {selectedTransporterIds.size > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-xs text-gray-500 font-medium mr-1">Selected:</span>
                      {transporters
                        .filter((t) => selectedTransporterIds.has(t.id))
                        .map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 shadow-xs"
                          >
                            <span>{t.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTransporterToggle(t.id);
                              }}
                              className="hover:text-blue-950 p-0.5 rounded-full hover:bg-blue-200 transition-colors"
                              title="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Standard dropdown for other payee types */
                payeeOptions.length > 0 && (
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
                      {formData.payeeType === 'CUSTOMER'
                        ? 'Customer'
                        : formData.payeeType === 'SUPPLIER'
                        ? 'Supplier'
                        : formData.payeeType === 'ONE_TIME_SUPPLIER'
                        ? 'One-Time Supplier'
                        : formData.payeeType === 'EMPLOYEE'
                        ? 'Employee'
                        : 'Payee'}{' '}
                      *
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
                          {opt.name}
                          {opt.code && opt.id !== 'ONE_TIME_SUPPLIER' ? ` (${opt.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              )}

              {/* Show manual Payee Name input if ONE_TIME_SUPPLIER is selected or if no dropdown options exist */}
              {(formData.payeeId === 'ONE_TIME_SUPPLIER' ||
                (formData.payeeType !== 'TRANSPORTER' && payeeOptions.length === 0)) && (
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

              {formData.payeeName &&
                formData.payeeId !== 'ONE_TIME_SUPPLIER' &&
                formData.payeeType !== 'TRANSPORTER' && (
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
                  { value: 'TRANSPORTER', label: 'Transporter Freight Dispatches' },
                  { value: 'CEMENT', label: 'Cement Purchases' },
                  { value: 'PAYROLL', label: 'Payroll' },
                  { value: 'MEDICAL', label: 'Medical' },
                  { value: 'ASSOCIATION', label: 'Association' },
                  { value: 'VAT', label: 'VAT / Tax' },
                ]}
              />

              {formData.sourceModule &&
                sourceRefs.length > 0 &&
                (formData.sourceModule === 'AGGREGATE' ||
                  formData.sourceModule === 'TRANSPORTER' ||
                  formData.sourceModule === 'CEMENT') && (
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
                      {formData.sourceModule === 'CEMENT'
                        ? 'Select Cement Records to Settle'
                        : 'Select Deliveries to Settle'}{' '}
                      ({selectedDeliveryIds.size} selected)
                    </label>
                    <div className="border border-[#D2D2D7] rounded-xl overflow-hidden bg-white/80">
                      <div className="px-4 py-2 bg-gray-50 border-b border-[#D2D2D7] flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={selectedDeliveryIds.size === sourceRefs.length && sourceRefs.length > 0}
                            onChange={handleSelectAllDeliveries}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium">
                            {formData.sourceModule === 'CEMENT' ? 'Select All Records' : 'Select All Deliveries'}
                          </span>
                        </label>
                        {selectedDeliveryIds.size > 0 && (
                          <span className="text-sm text-blue-600 font-medium">
                            Total: ETB{' '}
                            {sourceRefs
                              .filter((r) => selectedDeliveryIds.has(r.id))
                              .reduce((s, r) => s + (r.amount || 0), 0)
                              .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {sourceRefs.map((ref) => (
                          <label
                            key={ref.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                          >
                            <input
                              type="checkbox"
                              checked={selectedDeliveryIds.has(ref.id)}
                              onChange={() => handleDeliveryToggle(ref.id)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900">
                                  {formData.sourceModule === 'CEMENT'
                                    ? ref.ref || ref.dispatchNo
                                    : `Dispatch: ${ref.dispatchNo || ref.ref}`}
                                </span>
                                {ref.padNumber && ref.padNumber !== 'N/A' && (
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-200">
                                    {formData.sourceModule === 'CEMENT' ? `Order/Coupon: ${ref.padNumber}` : `POD: ${ref.padNumber}`}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{ref.label}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-slate-900">
                                ETB{' '}
                                {(ref.amount || 0).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                              <p className="text-[11px] font-medium text-slate-500">
                                {formData.sourceModule === 'CEMENT'
                                  ? 'Cement Settlement'
                                  : formData.payeeType === 'CUSTOMER'
                                  ? 'Customer Receivable'
                                  : formData.payeeType === 'TRANSPORTER'
                                  ? 'Transporter Freight'
                                  : formData.payeeType === 'SUPPLIER'
                                  ? 'Supplier Material'
                                  : 'Payable'}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    {loadingRefs && <p className="text-xs text-slate-500 mt-1">Loading references...</p>}
                  </div>
                )}

              {formData.sourceModule &&
                sourceRefs.length > 0 &&
                formData.sourceModule !== 'AGGREGATE' &&
                formData.sourceModule !== 'TRANSPORTER' &&
                formData.sourceModule !== 'CEMENT' && (
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
                          {ref.label}
                          {ref.amount ? ` — ETB ${ref.amount.toLocaleString('en-US')}` : ''}
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

              {formData.sourceReference &&
                (() => {
                  const selected = sourceRefs.find(
                    (r) => r.id === formData.sourceId || r.ref === formData.sourceReference
                  );
                  const isPartial =
                    selected?.isPartial ||
                    selected?.status === 'Partial' ||
                    (selected?.paidAmount &&
                      selected.paidAmount > 0 &&
                      selected.remainingAmount &&
                      selected.remainingAmount > 0);

                  return (
                    <div
                      className={`p-4 rounded-xl border ${
                        isPartial
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : 'bg-blue-50 border-blue-200 text-blue-900'
                      } space-y-1.5`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">Selected Ref: {formData.sourceReference}</span>
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

                      {selected &&
                        (selected.totalAmount !== undefined ||
                          selected.paidAmount !== undefined ||
                          selected.remainingAmount !== undefined) && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-current/10">
                            <div>
                              <span className="text-slate-500 block">Total Amount:</span>
                              <span className="font-bold">
                                ETB{' '}
                                {(selected.totalAmount || 0).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Previously Paid:</span>
                              <span className="font-bold text-emerald-700">
                                ETB{' '}
                                {(selected.paidAmount || 0).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Remaining Balance:</span>
                              <span className="font-bold text-amber-800">
                                ETB{' '}
                                {(selected.remainingAmount || selected.amount || 0).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
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
                    label="Amount (ETB) *"
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
                      <strong>
                        ETB{' '}
                        {formData.amount
                          ? parseFloat(formData.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })
                          : '0.00'}
                      </strong>
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
                  <p className="text-sm font-semibold text-slate-900 mt-1 truncate" title={formData.payeeName}>
                    {formData.payeeName}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-600 uppercase">Amount</p>
                  <p className="text-lg font-bold text-blue-900 mt-1">
                    ETB{' '}
                    {parseFloat(formData.amount || '0').toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 uppercase">Method</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1 capitalize">
                    {formData.paymentMethod.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Action Buttons */}
        <Card>
          <CardBody>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" size="lg" onClick={() => router.push('/dashboard/finance/vouchers')}>
                Cancel
              </Button>
              <Button variant="primary" size="lg" type="submit" disabled={loading} isLoading={loading}>
                Create Voucher
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}
