'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select, Badge, Table } from '@/components/ui';
import { DollarSign } from 'lucide-react';

interface Delivery {
  id: string;
  dispatchNo: string;
  loadedVolume: number;
  deliveredVolume: number;
  transportRate: number;
  grossTruckFee: number;
  customer?: { companyName: string };
}

interface PurchaseOrder {
  id: string;
  poNo: string;
  totalAmount: number;
  supplierPayments: any[];
}

interface TransporterGroup {
  transporterId: string;
  transporterName: string;
  plates: string[];
  totalLoads: number;
  totalVolume: number;
  grossAmount: number;
}

export default function PaymentModulePage() {
  const [activeTab, setActiveTab] = useState<'credit' | 'cash' | 'transporter'>('credit');
  const [suppliers, setSuppliers] = useState<{ value: string; label: string }[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');

  // Credit state
  const [creditDeliveries, setCreditDeliveries] = useState<Delivery[]>([]);
  const [creditFormData, setCreditFormData] = useState({
    supplierId: '',
    aggregateDeliveryId: '',
    amount: '',
    paymentMethod: 'bank_transfer',
    bankName: '',
    refNo: '',
  });

  // Cash state
  const [cashPOs, setCashPOs] = useState<PurchaseOrder[]>([]);
  const [cashFormData, setCashFormData] = useState({
    supplierId: '',
    purchaseOrderId: '',
    amount: '',
    paymentMethod: 'bank_transfer',
    bankName: '',
    refNo: '',
  });

  // Transporter state
  const [transporterGroups, setTransporterGroups] = useState<TransporterGroup[]>([]);
  const [commissionRates, setCommissionRates] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Fetch suppliers
    fetch('/api/suppliers?limit=100')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setSuppliers(json.data.map((s: any) => ({ value: String(s.id), label: s.companyName })));
        }
      })
      .catch(console.error);

    // Fetch transporter loads
    fetchTransporterGroups();
  }, []);

  useEffect(() => {
    if (selectedSupplier && activeTab === 'credit') {
      fetchCreditDeliveries();
    } else if (selectedSupplier && activeTab === 'cash') {
      fetchCashPOs();
    }
  }, [selectedSupplier, activeTab]);

  const fetchCreditDeliveries = async () => {
    if (!selectedSupplier) return;
    try {
      const res = await fetch(`/api/purchasing/payment-module/credit?supplierId=${selectedSupplier}`);
      const data = await res.json();
      if (data.success) {
        setCreditDeliveries(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching credit deliveries:', error);
    }
  };

  const fetchCashPOs = async () => {
    if (!selectedSupplier) return;
    try {
      const res = await fetch(`/api/purchasing/payment-module/cash?supplierId=${selectedSupplier}`);
      const data = await res.json();
      if (data.success) {
        setCashPOs(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching cash POs:', error);
    }
  };

  const fetchTransporterGroups = async () => {
    try {
      const res = await fetch('/api/purchasing/payment-module/transporter');
      const data = await res.json();
      if (data.success) {
        setTransporterGroups(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching transporter groups:', error);
    }
  };

  const handleCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !creditFormData.amount || !creditFormData.paymentMethod) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/purchasing/payment-module/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...creditFormData,
          supplierId: selectedSupplier,
          amount: parseFloat(creditFormData.amount),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Credit payment recorded successfully!');
        setCreditFormData({ supplierId: '', aggregateDeliveryId: '', amount: '', paymentMethod: 'bank_transfer', bankName: '', refNo: '' });
        fetchCreditDeliveries();
      } else {
        alert(data.error || 'Failed to record payment');
      }
    } catch (error) {
      alert('Failed to record payment');
    }
    setSubmitting(false);
  };

  const handleCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !cashFormData.amount || !cashFormData.paymentMethod) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/purchasing/payment-module/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cashFormData,
          supplierId: selectedSupplier,
          amount: parseFloat(cashFormData.amount),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Cash payment recorded successfully!');
        setCashFormData({ supplierId: '', purchaseOrderId: '', amount: '', paymentMethod: 'bank_transfer', bankName: '', refNo: '' });
        fetchCashPOs();
      } else {
        alert(data.error || 'Failed to record payment');
      }
    } catch (error) {
      alert('Failed to record payment');
    }
    setSubmitting(false);
  };

  const handleTransporterPayment = async (transporterId: string) => {
    const group = transporterGroups.find((g) => g.transporterId === transporterId);
    if (!group) return;

    const commissionRate = commissionRates[transporterId] || 0;
    const commissionAmount = (group.grossAmount * commissionRate) / 100;

    setSubmitting(true);
    try {
      const res = await fetch('/api/purchasing/payment-module/transporter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transporterId,
          totalGrossFee: group.grossAmount,
          totalShortage: 0,
          commissionRate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Payment sheet ${data.data.paymentSheetNo} generated successfully!`);
        setCommissionRates({ ...commissionRates, [transporterId]: 0 });
      } else {
        alert(data.error || 'Failed to generate payment sheet');
      }
    } catch (error) {
      alert('Failed to generate payment sheet');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/purchasing" className="text-blue-600 hover:text-blue-800">Purchasing</Link>
        <span>/</span>
        <span>Payment Module</span>
      </div>

      <div className="flex items-center gap-3">
        <DollarSign className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900">Payment Module</h1>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('credit')}
          className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'credit' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Credit Payments
        </button>
        <button
          onClick={() => setActiveTab('cash')}
          className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'cash' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Cash Payments
        </button>
        <button
          onClick={() => setActiveTab('transporter')}
          className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'transporter' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Transporter Payments
        </button>
      </div>

      {/* Credit Payments Tab */}
      {activeTab === 'credit' && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-gray-900">Credit Payments</h2></CardHeader>
          <CardBody className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Supplier *</label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a supplier</option>
                {suppliers.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {creditDeliveries.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Verified Deliveries</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Dispatch No</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Loaded (m³)</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Delivered (m³)</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Rate</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Gross Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditDeliveries.map((delivery) => (
                        <tr key={delivery.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{delivery.dispatchNo}</td>
                          <td className="py-3 px-4 text-right">{(delivery.loadedVolume ?? 0).toLocaleString('en-US')}</td>
                          <td className="py-3 px-4 text-right">{(delivery.deliveredVolume ?? 0).toLocaleString('en-US')}</td>
                          <td className="py-3 px-4 text-right">ETB {(delivery.transportRate ?? 0).toLocaleString('en-US')}</td>
                          <td className="py-3 px-4 text-right font-medium">ETB {(delivery.grossTruckFee ?? 0).toLocaleString('en-US')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedSupplier && (
              <form onSubmit={handleCreditSubmit} className="border-t pt-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Record Credit Payment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (ETB) *</label>
                    <input type="number" step="0.01" min="0.01" required value={creditFormData.amount}
                      onChange={(e) => setCreditFormData({ ...creditFormData, amount: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                    <select value={creditFormData.paymentMethod}
                      onChange={(e) => setCreditFormData({ ...creditFormData, paymentMethod: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                    </select>
                  </div>
                  {(creditFormData.paymentMethod === 'bank_transfer' || creditFormData.paymentMethod === 'check') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
                      <select value={creditFormData.bankName}
                        onChange={(e) => setCreditFormData({ ...creditFormData, bankName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Select Bank</option>
                        <option value="CBE">Commercial Bank of Ethiopia (CBE)</option>
                        <option value="Awash">Awash Bank</option>
                        <option value="Dashen">Dashen Bank</option>
                        <option value="Abyssinia">Abyssinia Bank</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reference No</label>
                    <input type="text" value={creditFormData.refNo}
                      onChange={(e) => setCreditFormData({ ...creditFormData, refNo: e.target.value })}
                      placeholder="Bank ref or check no"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
                <Button variant="primary" size="lg" type="submit" isLoading={submitting} className="w-full">
                  Record Credit Payment
                </Button>
              </form>
            )}
          </CardBody>
        </Card>
      )}

      {/* Cash Payments Tab */}
      {activeTab === 'cash' && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-gray-900">Cash Payments</h2></CardHeader>
          <CardBody className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Supplier *</label>
              <select value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Choose a supplier</option>
                {suppliers.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {cashPOs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Approved Purchase Orders</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">PO No</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Total Amount</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Paid</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashPOs.map((po) => {
                        const paidAmount = po.supplierPayments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
                        const balance = po.totalAmount - paidAmount;
                        return (
                          <tr key={po.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{po.poNo}</td>
                            <td className="py-3 px-4 text-right font-medium">ETB {(po.totalAmount ?? 0).toLocaleString('en-US')}</td>
                            <td className="py-3 px-4 text-right">ETB {paidAmount.toLocaleString('en-US')}</td>
                            <td className="py-3 px-4 text-right font-medium text-blue-600">ETB {balance.toLocaleString('en-US')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedSupplier && (
              <form onSubmit={handleCashSubmit} className="border-t pt-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Record Cash Payment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Order</label>
                    <select value={cashFormData.purchaseOrderId}
                      onChange={(e) => setCashFormData({ ...cashFormData, purchaseOrderId: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Select PO (optional)</option>
                      {cashPOs.map((po) => (
                        <option key={po.id} value={po.id}>{po.poNo} - ETB {(po.totalAmount ?? 0).toLocaleString('en-US')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (ETB) *</label>
                    <input type="number" step="0.01" min="0.01" required value={cashFormData.amount}
                      onChange={(e) => setCashFormData({ ...cashFormData, amount: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                    <select value={cashFormData.paymentMethod}
                      onChange={(e) => setCashFormData({ ...cashFormData, paymentMethod: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                    </select>
                  </div>
                  {(cashFormData.paymentMethod === 'bank_transfer' || cashFormData.paymentMethod === 'check') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
                      <select value={cashFormData.bankName}
                        onChange={(e) => setCashFormData({ ...cashFormData, bankName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Select Bank</option>
                        <option value="CBE">Commercial Bank of Ethiopia (CBE)</option>
                        <option value="Awash">Awash Bank</option>
                        <option value="Dashen">Dashen Bank</option>
                        <option value="Abyssinia">Abyssinia Bank</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reference No</label>
                    <input type="text" value={cashFormData.refNo}
                      onChange={(e) => setCashFormData({ ...cashFormData, refNo: e.target.value })}
                      placeholder="Bank ref or check no"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
                <Button variant="primary" size="lg" type="submit" isLoading={submitting} className="w-full">
                  Record Cash Payment
                </Button>
              </form>
            )}
          </CardBody>
        </Card>
      )}

      {/* Transporter Payments Tab */}
      {activeTab === 'transporter' && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-gray-900">Transporter Payments</h2></CardHeader>
          <CardBody>
            {transporterGroups.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Transporter</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Plates</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Loads</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Volume (m³)</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Gross Amount</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Commission %</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Commission Amt</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Net Payable</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transporterGroups.map((group) => {
                      const commissionRate = commissionRates[group.transporterId] || 0;
                      const commissionAmount = (group.grossAmount * commissionRate) / 100;
                      const netPayable = group.grossAmount - commissionAmount;
                      return (
                        <tr key={group.transporterId} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{group.transporterName}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{group.plates?.join(', ') || 'N/A'}</td>
                          <td className="py-3 px-4 text-right">{group.totalLoads}</td>
                          <td className="py-3 px-4 text-right">{(group.totalVolume ?? 0).toLocaleString('en-US')}</td>
                          <td className="py-3 px-4 text-right font-medium">ETB {(group.grossAmount ?? 0).toLocaleString('en-US')}</td>
                          <td className="py-3 px-4 text-right">
                            <input type="number" step="0.01" min="0" max="100" value={commissionRate}
                              onChange={(e) => setCommissionRates({ ...commissionRates, [group.transporterId]: parseFloat(e.target.value) || 0 })}
                              className="w-20 px-2 py-1 rounded border border-gray-300 text-right" />
                          </td>
                          <td className="py-3 px-4 text-right">ETB {commissionAmount.toLocaleString('en-US')}</td>
                          <td className="py-3 px-4 text-right font-medium text-blue-600">ETB {netPayable.toLocaleString('en-US')}</td>
                          <td className="py-3 px-4 text-center">
                            <Button variant="primary" size="sm"
                              onClick={() => handleTransporterPayment(group.transporterId)} isLoading={submitting}>
                              Generate Sheet
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No transported loads available
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
