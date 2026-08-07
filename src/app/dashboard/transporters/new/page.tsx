'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

interface Truck {
  id?: string;
  plateNo: string;
  ownerName: string;
  driverName: string;
  capacity: string;
  capacityUnit: string;
}

interface Association {
  id: string;
  name: string;
}

interface FormData {
  companyName: string;
  phone: string;
  email: string;
  tin: string;
  location: string;
  contactPerson: string;
  driverName: string;
  associationId: string;
  trucks: Truck[];
  status: 'Active' | 'Inactive';
}

interface FormErrors {
  [key: string]: string;
}

export default function NewTransporterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    phone: '',
    email: '',
    tin: '',
    location: '',
    contactPerson: '',
    driverName: '',
    associationId: '',
    trucks: [],
    status: 'Active',
  });
  const [associations, setAssociations] = useState<Association[]>([]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingAssociations, setLoadingAssociations] = useState(false);
  const [currentTruck, setCurrentTruck] = useState<Truck>({
    plateNo: '',
    ownerName: '',
    driverName: '',
    capacity: '',
    capacityUnit: 'm³',
  });

  // Fetch associations on mount
  React.useEffect(() => {
    const fetchAssociations = async () => {
      setLoadingAssociations(true);
      try {
        const res = await fetch('/api/transport-associations?limit=1000');
        const data = await res.json();
        if (data.success) {
          setAssociations(data.data);
        }
      } catch (error) {
        console.error('Error fetching associations:', error);
      } finally {
        setLoadingAssociations(false);
      }
    };
    fetchAssociations();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }
    if (formData.trucks.length === 0) {
      newErrors.trucks = 'At least one truck is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox' && e.target instanceof HTMLInputElement;
    const finalValue = isCheckbox ? (e.target as HTMLInputElement).checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: finalValue,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleTruckInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setCurrentTruck((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addTruck = () => {
    if (!currentTruck.plateNo.trim()) {
      alert('Please enter plate number');
      return;
    }


    setFormData((prev) => ({
      ...prev,
      trucks: [...prev.trucks, { ...currentTruck, id: Date.now().toString() }],
    }));

    setCurrentTruck({
      plateNo: '',
      ownerName: '',
      driverName: '',
      capacity: '',
      capacityUnit: 'm³',
    });

    if (errors.trucks) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.trucks;
        return newErrors;
      });
    }
  };

  const removeTruck = (id?: string) => {
    setFormData((prev) => ({
      ...prev,
      trucks: prev.trucks.filter((truck) => truck.id !== id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        companyName: formData.companyName,
        phone: formData.phone,
        email: formData.email || null,
        tin: formData.tin || null,
        location: formData.location || null,
        contactPerson: formData.contactPerson || null,
        driverName: formData.driverName || null,
        associationId: formData.associationId || null,
        status: formData.status,
        trucks: formData.trucks.map(({ id, ...truck }) => ({
          ...truck,
          capacity: truck.capacity ? parseFloat(truck.capacity) : null,
        })),
      };

      const res = await fetch('/api/transporters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create transporter');
      alert('Transporter created successfully!');
      router.push('/dashboard/transporters');
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to create transporter' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/transporters');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleCancel}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Transporters
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">New Transporter</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
          Create New Transporter
        </h1>
        <p className="text-slate-600 mt-2">Fill in the details below to add a new transporter</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
              Basic Information
            </h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <Input
              label="Company Name"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              error={errors.companyName}
              placeholder="e.g., Addis Transport Services"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                error={errors.phone}
                placeholder="+251911223344"
                required
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="contact@transport.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="TIN"
                name="tin"
                value={formData.tin}
                onChange={handleInputChange}
                placeholder="e.g., 100123456"
              />
              <Input
                label="Contact Person"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleInputChange}
                placeholder="e.g., Ali Ahmed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Transport Association"
                name="associationId"
                value={formData.associationId}
                onChange={handleInputChange}
                options={[
                  { value: '', label: 'Select association (optional)' },
                  ...associations.map((assoc) => ({
                    value: assoc.id,
                    label: assoc.name,
                  })),
                ]}
                disabled={loadingAssociations}
              />
              <Input
                label="Driver Name"
                name="driverName"
                value={formData.driverName}
                onChange={handleInputChange}
                placeholder="e.g., Ahmed Hassan"
              />
            </div>

            <Input
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g., Addis Ababa, Bole"
            />
          </CardBody>
        </Card>

        {/* Fleet Information Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
              Fleet Information
            </h2>
          </CardHeader>
          <CardBody className="space-y-6">
            {/* Add Truck Form */}
            <div className="border border-slate-200 rounded-lg p-6 bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Truck</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Input
                  label="Plate Number"
                  name="plateNo"
                  value={currentTruck.plateNo}
                  onChange={handleTruckInputChange}
                  placeholder="e.g., AA-123-456"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Input
                  label="Owner Name"
                  name="ownerName"
                  value={currentTruck.ownerName}
                  onChange={handleTruckInputChange}
                  placeholder="e.g., John Doe"
                />
                <Input
                  label="Driver Name"
                  name="driverName"
                  value={currentTruck.driverName}
                  onChange={handleTruckInputChange}
                  placeholder="e.g., Ali Ahmed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Input
                  label="Capacity"
                  name="capacity"
                  type="number"
                  value={currentTruck.capacity}
                  onChange={handleTruckInputChange}
                  placeholder="e.g., 10"
                  step="0.01"
                />
                <Select
                  label="Capacity Unit"
                  name="capacityUnit"
                  value={currentTruck.capacityUnit}
                  onChange={handleTruckInputChange}
                  options={[
                    { value: 'm³', label: 'm³' },
                    { value: 'Quintal', label: 'Quintal' },
                    { value: 'Ton', label: 'Ton' },
                  ]}
                />
              </div>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={addTruck}
              >
                Add Truck
              </Button>
            </div>

            {/* Trucks List */}
            {formData.trucks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-900">Registered Trucks</h3>
                {formData.trucks.map((truck) => (
                  <div
                    key={truck.id}
                    className="border border-slate-200 rounded-lg p-4 bg-white"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-slate-900">{truck.plateNo}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeTruck(truck.id)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Owner</p>
                        <p className="text-slate-900 font-medium">{truck.ownerName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Driver</p>
                        <p className="text-slate-900 font-medium">{truck.driverName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Capacity</p>
                        <p className="text-slate-900 font-medium">{truck.capacity ? `${truck.capacity} ${truck.capacityUnit}` : '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {errors.trucks && (
              <div className="text-red-600 text-sm">{errors.trucks}</div>
            )}
          </CardBody>
        </Card>

        {/* Status Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
              Status
            </h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          </CardBody>
        </Card>

        {/* Buttons */}
        <Card>
          <CardFooter>
            <div className="flex gap-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
              >
                Save Transporter
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>
          </CardFooter>
        </Card>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {errors.submit}
          </div>
        )}
      </form>
    </div>
  );
}
