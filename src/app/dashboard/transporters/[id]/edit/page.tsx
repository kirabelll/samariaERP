'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

interface TruckRow {
  id?: string;
  plateNo: string;
  truckType: string;
  customTruckType?: string;
  ownerName: string;
  driverName: string;
  capacity: string;
  capacityUnit: string;
  isNew?: boolean;
}

interface FormErrors { [key: string]: string; }

const TRANSPORTER_TYPE_OPTIONS = [
  { value: 'company', label: 'Company' },
  { value: 'individual', label: 'Individual' },
];
const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];
const WITHHOLDING_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];
const TRUCK_TYPE_OPTIONS = [
  { value: 'Isuzu', label: 'Isuzu' },
  { value: 'Hino', label: 'Hino' },
  { value: 'Sinotruk', label: 'Sinotruk' },
  { value: 'Shacman', label: 'Shacman' },
  { value: 'FAW', label: 'FAW' },
  { value: 'Volvo', label: 'Volvo' },
  { value: 'Other', label: 'Other' },
];
const CAPACITY_UNIT_OPTIONS = [
  { value: 'm3', label: 'm\u00B3' },
  { value: 'quintal', label: 'Quintal' },
  { value: 'ton', label: 'Ton' },
];

export default function EditTransporterPage() {
  const router = useRouter();
  const params = useParams();
  const transporterId = params?.id as string;

  const [formData, setFormData] = useState({
    transporterType: 'company', companyName: '', firstName: '', lastName: '',
    tin: '', phone: '', email: '', contactPerson: '', location: '',
    withholding: 'false', withholdRate: '2', status: 'Active',
  });
  const [trucks, setTrucks] = useState<TruckRow[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransporter = async () => {
      try {
        const response = await fetch(`/api/transporters/${transporterId}`);
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Failed to fetch');
        const t = result.data;
        setFormData({
          transporterType: t.transporterType || 'company', companyName: t.companyName || '',
          firstName: t.firstName || '', lastName: t.lastName || '', tin: t.tin || '',
          phone: t.phone || '', email: t.email || '', contactPerson: t.contactPerson || '',
          location: t.location || '', withholding: String(t.withholding || false),
          withholdRate: String(t.withholdRate || 2), status: t.status || 'Active',
        });
        if (t.trucks && t.trucks.length > 0) {
          setTrucks(t.trucks.map((tr: any) => ({
            id: tr.id, plateNo: tr.plateNo || '', truckType: tr.truckType || 'Isuzu',
            customTruckType: tr.customTruckType || '', ownerName: tr.ownerName || '',
            driverName: tr.driverName || '',
            capacity: String(tr.capacity || ''), capacityUnit: tr.capacityUnit || 'm3',
          })));
        }
      } catch (err) {
        console.error('Error:', err);
        setErrors({ fetch: 'Failed to load transporter data' });
      } finally { setLoading(false); }
    };
    if (transporterId) fetchTransporter();
  }, [transporterId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) { setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; }); }
  };

  const handleTruckChange = (index: number, field: keyof TruckRow, value: string) => {
    setTrucks((prev) => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u; });
  };

  const addTruck = () => {
    setTrucks((prev) => [...prev, { plateNo: '', truckType: 'Isuzu', customTruckType: '', ownerName: '', driverName: '', capacity: '', capacityUnit: 'm3', isNew: true }]);
  };

  const removeTruck = (index: number) => {
    setTrucks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: FormErrors = {};
    if (!formData.companyName.trim() && formData.transporterType === 'company') newErrors.companyName = 'Company name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    trucks.forEach((truck, i) => {
      if (!truck.plateNo.trim()) newErrors[`truck_${i}_plateNo`] = 'Plate number is required';
    });
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        withholding: formData.withholding === 'true',
        withholdRate: parseFloat(formData.withholdRate) || 2,
        trucks: trucks.map((t) => ({
          id: t.id, plateNo: t.plateNo, truckType: t.truckType === 'Other' ? t.customTruckType : t.truckType,
          ownerName: t.ownerName, driverName: t.driverName,
          capacity: parseFloat(t.capacity) || 0, capacityUnit: t.capacityUnit,
        })),
      };
      const res = await fetch(`/api/transporters/${transporterId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update');
      alert('Transporter updated successfully!');
      router.push(`/dashboard/transporters/${transporterId}`);
    } catch (error) {
      console.error('Error:', error);
      setErrors({ submit: 'Failed to update transporter' });
    } finally { setIsSubmitting(false); }
  };

  const handleCancel = () => router.push(`/dashboard/transporters/${transporterId}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button onClick={() => router.push('/dashboard/transporters')} className="text-blue-600 hover:text-blue-700 font-medium">Transporters</button>
        <span>/</span>
        <button onClick={handleCancel} className="text-blue-600 hover:text-blue-700 font-medium">
          {formData.companyName || `${formData.firstName} ${formData.lastName}`}
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">Edit</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Edit Transporter</h1>
        <p className="text-slate-600 mt-2">Update transporter details and fleet information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><h2 className="text-xl font-bold text-slate-900">Basic Information</h2></CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select label="Transporter Type" name="transporterType" value={formData.transporterType} onChange={handleInputChange} options={TRANSPORTER_TYPE_OPTIONS} />
              <Input label="Company Name" name="companyName" value={formData.companyName} onChange={handleInputChange} error={errors.companyName} />
              {formData.transporterType === 'individual' && (
                <>
                  <Input label="First Name" name="firstName" value={formData.firstName} onChange={handleInputChange} />
                  <Input label="Last Name" name="lastName" value={formData.lastName} onChange={handleInputChange} />
                </>
              )}
              <Input label="TIN" name="tin" value={formData.tin} onChange={handleInputChange} />
              <Select label="Status" name="status" value={formData.status} onChange={handleInputChange} options={STATUS_OPTIONS} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="text-xl font-bold text-slate-900">Contact Information</h2></CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Phone" name="phone" value={formData.phone} onChange={handleInputChange} error={errors.phone} required />
              <Input label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
              <Input label="Contact Person" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} />
              <Input label="Location" name="location" value={formData.location} onChange={handleInputChange} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="text-xl font-bold text-slate-900">Tax Information</h2></CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select label="Withholding" name="withholding" value={formData.withholding} onChange={handleInputChange} options={WITHHOLDING_OPTIONS} />
              {formData.withholding === 'true' && (
                <Input label="Withhold Rate (%)" name="withholdRate" type="number" value={formData.withholdRate} onChange={handleInputChange} />
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Fleet Management</h2>
            <Button type="button" variant="outline" size="sm" onClick={addTruck}>+ Add Truck</Button>
          </CardHeader>
          <CardBody className="space-y-4">
            {trucks.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No trucks registered. Click &quot;Add Truck&quot; to add one.</p>
            ) : (
              trucks.map((truck, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-700">
                      Truck #{index + 1} {truck.isNew && <span className="text-green-600">(New)</span>}
                    </h4>
                    <button type="button" onClick={() => removeTruck(index)} className="text-red-600 hover:text-red-800 text-sm font-medium">Remove</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Plate Number" value={truck.plateNo} onChange={(e) => handleTruckChange(index, 'plateNo', e.target.value)} error={errors[`truck_${index}_plateNo`]} placeholder="e.g., AA-12345" required />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Truck Type</label>
                      <select value={truck.truckType} onChange={(e) => handleTruckChange(index, 'truckType', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        {TRUCK_TYPE_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                      </select>
                    </div>
                  </div>
                  {truck.truckType === 'Other' && (
                    <Input label="Custom Truck Type" value={truck.customTruckType || ''} onChange={(e) => handleTruckChange(index, 'customTruckType', e.target.value)} placeholder="e.g., Mercedes, DAF" />
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Owner Name" value={truck.ownerName} onChange={(e) => handleTruckChange(index, 'ownerName', e.target.value)} placeholder="e.g., John Doe" />
                    <Input label="Driver Name" value={truck.driverName} onChange={(e) => handleTruckChange(index, 'driverName', e.target.value)} placeholder="e.g., Ali Ahmed" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Capacity" type="number" value={truck.capacity} onChange={(e) => handleTruckChange(index, 'capacity', e.target.value)} placeholder="e.g., 12" />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                      <select value={truck.capacityUnit} onChange={(e) => handleTruckChange(index, 'capacityUnit', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        {CAPACITY_UNIT_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardFooter>
            <div className="flex gap-4">
              <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting}>Save Changes</Button>
              <Button type="button" variant="outline" size="lg" onClick={handleCancel}>Cancel</Button>
            </div>
          </CardFooter>
        </Card>

        {errors.submit && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{errors.submit}</div>}
        {errors.fetch && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{errors.fetch}</div>}
      </form>
    </div>
  );
}
