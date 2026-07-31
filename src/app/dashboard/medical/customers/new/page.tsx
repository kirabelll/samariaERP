'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FileUpload from '@/components/ui/FileUpload';
import { uploadDocument } from '@/lib/upload-helper';

export default function NewMedicalCustomerPage() {
  const router = useRouter();
  const [licenseFiles, setLicenseFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    tin: '',
    location: '',
    licenseType: 'Pharmacy',
    licenseNo: '',
    licenseExpiry: '',
    division: 'MEDICAL',
    customerType: 'COMPANY',
    creditLimit: '0',
    status: 'Active',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          creditLimit: parseFloat(formData.creditLimit) || 0,
          licenseExpiry: formData.licenseExpiry || null,
          medicalApproved: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Upload license documents if any
        if (licenseFiles.length > 0) {
          const recordId = data.data?.id?.toString() || 'new';
          for (const file of licenseFiles) {
            await uploadDocument(file, 'MEDICAL', recordId, 'license');
          }
        }
        alert('Licensed customer created successfully!');
        router.push('/dashboard/medical/customers');
      } else {
        alert(data.error || 'Failed to create customer');
      }
    } catch {
      alert('Failed to create customer');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/medical/customers" className="text-blue-600 hover:text-blue-800">Licensed Customers</Link>
        <span>/</span>
        <span>New Customer</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900">Register Licensed Medical Customer</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Customer Information</h2>
        </div>
        <div className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Company / Institution Name *</label>
              <input name="companyName" value={formData.companyName} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Contact Person</label>
              <input name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Phone *</label>
              <input name="phone" value={formData.phone} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Email</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">TIN</label>
              <input name="tin" value={formData.tin} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Location</label>
              <input name="location" value={formData.location} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>

          <hr className="border-slate-200" />
          <h3 className="text-lg font-semibold text-slate-900">License Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">License Type *</label>
              <select name="licenseType" value={formData.licenseType} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="Pharmacy">Pharmacy</option>
                <option value="Hospital">Hospital</option>
                <option value="Clinic">Clinic</option>
                <option value="Drug Store">Drug Store</option>
                <option value="Wholesaler">Wholesaler</option>
                <option value="Institution">Institution</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">License Number *</label>
              <input name="licenseNo" value={formData.licenseNo} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">License Expiry Date *</label>
              <input name="licenseExpiry" type="date" value={formData.licenseExpiry} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Credit Limit (ETB)</label>
              <input name="creditLimit" type="number" value={formData.creditLimit} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>

          <hr className="border-slate-200" />
          <h3 className="text-lg font-semibold text-slate-900">License Document Upload</h3>
          <p className="text-sm text-slate-500">Upload a scanned copy of the medical license or certificate for verification.</p>

          <FileUpload
            onFilesSelected={(files) => setLicenseFiles(files)}
            label="License Certificate / Document"
            maxFiles={3}
            maxFileSize={10 * 1024 * 1024}
            acceptedFileTypes={['image/*', 'application/pdf']}
            helperText="Upload scanned license (PDF or image, max 10MB)"
          />
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.push('/dashboard/medical/customers')} className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium">Cancel</button>
          <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50">
            {submitting ? 'Registering...' : 'Register Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
