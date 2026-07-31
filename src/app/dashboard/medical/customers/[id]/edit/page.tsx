'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

interface FormErrors { [key: string]: string; }

const CUSTOMER_TYPE_OPTIONS = [
  { value: 'COMPANY', label: 'Company' },
  { value: 'INDIVIDUAL', label: 'Individual' },
];
const DIVISION_OPTIONS = [
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'BOTH', label: 'Both' },
];
const LICENSE_TYPE_OPTIONS = [
  { value: '', label: 'Select Type' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'institution', label: 'Institution' },
  { value: 'hospital', label: 'Hospital' },
];
const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];
const WITHHOLDING_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

export default function EditMedicalCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params?.id as string;

  const [formData, setFormData] = useState({
    companyName: '', customerType: 'COMPANY', phone: '', email: '', tin: '',
    contactPerson: '', location: '', division: 'MEDICAL', creditLimit: '0',
    creditTermDays: '0', withholding: 'false', withholdRate: '2',
    licenseNo: '', licenseExpiry: '', licenseType: '', status: 'Active',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await fetch(`/api/customers/${customerId}`);
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Failed to fetch');
        const c = result.data;
        setFormData({
          companyName: c.companyName || '', customerType: c.customerType || 'COMPANY',
          phone: c.phone || '', email: c.email || '', tin: c.tin || '',
          contactPerson: c.contactPerson || '', location: c.location || '',
          division: c.division || 'MEDICAL', creditLimit: String(c.creditLimit || 0),
          creditTermDays: String(c.creditTermDays || 0), withholding: String(c.withholding || false),
          withholdRate: String(c.withholdRate || 2), licenseNo: c.licenseNo || '',
          licenseExpiry: c.licenseExpiry ? c.licenseExpiry.split('T')[0] : '',
          licenseType: c.licenseType || '', status: c.status || 'Active',
        });
      } catch (err) {
        console.error('Error:', err);
        setErrors({ fetch: 'Failed to load customer data' });
      } finally { setLoading(false); }
    };
    if (customerId) fetchCustomer();
  }, [customerId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) { setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; }); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: FormErrors = {};
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        creditLimit: parseFloat(formData.creditLimit) || 0,
        creditTermDays: parseInt(formData.creditTermDays) || 0,
        withholding: formData.withholding === 'true',
        withholdRate: parseFloat(formData.withholdRate) || 2,
        licenseExpiry: formData.licenseExpiry ? new Date(formData.licenseExpiry).toISOString() : null,
      };
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update');
      alert('Customer updated successfully!');
      router.push(`/dashboard/medical/customers/${customerId}`);
    } catch (error) {
      console.error('Error:', error);
      setErrors({ submit: 'Failed to update customer' });
    } finally { setIsSubmitting(false); }
  };

  const handleCancel = () => router.push(`/dashboard/medical/customers/${customerId}`);

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
        <button onClick={() => router.push('/dashboard/medical/customers')} className="text-blue-600 hover:text-blue-700 font-medium">Medical Customers</button>
        <span>/</span>
        <button onClick={handleCancel} className="text-blue-600 hover:text-blue-700 font-medium">{formData.companyName}</button>
        <span>/</span>
        <span className="text-slate-900 font-medium">Edit</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Edit Medical Customer</h1>
        <p className="text-slate-600 mt-2">Update customer and medical license information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><h2 className="text-xl font-bold text-slate-900">Basic Information</h2></CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Company Name" name="companyName" value={formData.companyName} onChange={handleInputChange} error={errors.companyName} required />
              <Select label="Customer Type" name="customerType" value={formData.customerType} onChange={handleInputChange} options={CUSTOMER_TYPE_OPTIONS} />
              <Select label="Division" name="division" value={formData.division} onChange={handleInputChange} options={DIVISION_OPTIONS} />
              <Input label="TIN" name="tin" value={formData.tin} onChange={handleInputChange} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="text-xl font-bold text-slate-900">Medical License</h2></CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="License Number" name="licenseNo" value={formData.licenseNo} onChange={handleInputChange} />
              <Select label="License Type" name="licenseType" value={formData.licenseType} onChange={handleInputChange} options={LICENSE_TYPE_OPTIONS} />
              <Input label="License Expiry" name="licenseExpiry" type="date" value={formData.licenseExpiry} onChange={handleInputChange} />
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
          <CardHeader><h2 className="text-xl font-bold text-slate-900">Financial Information</h2></CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Credit Limit (ETB)" name="creditLimit" type="number" value={formData.creditLimit} onChange={handleInputChange} />
              <Input label="Credit Terms (Days)" name="creditTermDays" type="number" value={formData.creditTermDays} onChange={handleInputChange} />
              <Select label="Withholding" name="withholding" value={formData.withholding} onChange={handleInputChange} options={WITHHOLDING_OPTIONS} />
              {formData.withholding === 'true' && (
                <Input label="Withhold Rate (%)" name="withholdRate" type="number" value={formData.withholdRate} onChange={handleInputChange} />
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="text-xl font-bold text-slate-900">Status</h2></CardHeader>
          <CardBody>
            <Select label="Status" name="status" value={formData.status} onChange={handleInputChange} options={STATUS_OPTIONS} />
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
