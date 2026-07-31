'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge, Input } from '@/components/ui';

interface Proof {
  id: string;
  deliveryId: string;
  dispatchNo: string;
  proofType: 'telegram' | 'signed_invoice' | 'weighbridge' | 'photo';
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedDate: string;
  verified: boolean;
  verifiedBy?: string;
}

export default function ProofRegisterPage() {
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [filteredProofs, setFilteredProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDispatch, setSearchDispatch] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    deliveryId: '',
    proofType: 'telegram' as const,
    file: null as File | null,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProofs();
  }, []);

  useEffect(() => {
    const filtered = proofs.filter(
      (proof) =>
        !searchDispatch ||
        proof.dispatchNo.toLowerCase().includes(searchDispatch.toLowerCase())
    );
    setFilteredProofs(filtered);
  }, [proofs, searchDispatch]);

  const fetchProofs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/aggregate/proofs');
      if (!response.ok) throw new Error('Failed to fetch proofs');
      const data = await response.json();
      setProofs(data.data || []);
    } catch (error) {
      console.error('Error fetching proofs:', error);
      setProofs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields are populated
    if (!uploadForm.deliveryId || uploadForm.deliveryId.trim() === '') {
      alert('Delivery ID is required. Please enter or select a delivery.');
      return;
    }
    if (!uploadForm.file) {
      alert('Please select a file to upload');
      return;
    }
    if (!uploadForm.proofType) {
      alert('Please select a proof type');
      return;
    }

    const formData = new FormData();
    formData.append('deliveryId', uploadForm.deliveryId.trim());
    formData.append('proofType', uploadForm.proofType);
    formData.append('file', uploadForm.file);

    try {
      setUploading(true);
      const response = await fetch('/api/aggregate/proofs', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Better error messaging based on status code
        if (response.status === 400) {
          throw new Error(responseData.error || 'Invalid request - please check delivery ID and try again');
        } else if (response.status === 404) {
          throw new Error('Delivery not found - please verify the delivery ID');
        }
        throw new Error(responseData.error || 'Upload failed');
      }

      alert('Proof uploaded successfully!');
      await fetchProofs();
      setShowUploadForm(false);
      setUploadForm({ deliveryId: '', proofType: 'telegram', file: null });
    } catch (error) {
      console.error('Error uploading proof:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload proof');
    } finally {
      setUploading(false);
    }
  };

  const handleVerify = async (proofId: string) => {
    try {
      const response = await fetch(`/api/aggregate/proofs/${proofId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: true }),
      });

      if (!response.ok) throw new Error('Verification failed');
      await fetchProofs();
    } catch (error) {
      console.error('Error verifying proof:', error);
      alert('Failed to verify proof');
    }
  };

  const getProofTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      telegram: 'Telegram',
      signed_invoice: 'Signed Invoice',
      weighbridge: 'Weighbridge',
      photo: 'Photo',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F5F5F7' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#1D1D1F' }}>
            Proof Register
          </h1>
          <Button
            onClick={() => setShowUploadForm(!showUploadForm)}
            style={{
              backgroundColor: '#007AFF',
              color: 'white',
            }}
            className="px-6 py-2 rounded-2xl font-semibold"
          >
            {showUploadForm ? 'Cancel' : 'Upload New Proof'}
          </Button>
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <Card className="mb-8 rounded-2xl bg-white">
            <CardBody className="p-6">
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1D1D1F' }}>
                    Delivery
                  </label>
                  <Input
                    type="text"
                    placeholder="Delivery ID"
                    value={uploadForm.deliveryId}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, deliveryId: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1D1D1F' }}>
                    Proof Type
                  </label>
                  <select
                    value={uploadForm.proofType}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        proofType: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="telegram">Telegram</option>
                    <option value="signed_invoice">Signed Invoice</option>
                    <option value="weighbridge">Weighbridge</option>
                    <option value="photo">Photo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1D1D1F' }}>
                    File
                  </label>
                  <input
                    type="file"
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={uploading}
                  style={{
                    backgroundColor: uploading ? '#ccc' : '#007AFF',
                    color: 'white',
                  }}
                  className="w-full py-2 rounded-lg font-semibold"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Search */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="Search by Dispatch No..."
            value={searchDispatch}
            onChange={(e) => setSearchDispatch(e.target.value)}
            className="w-full px-4 py-2 border rounded-2xl"
            style={{ backgroundColor: 'white' }}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ color: '#1D1D1F' }}>Loading...</div>
        ) : (
          <Card className="rounded-2xl bg-white">
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E5E7', backgroundColor: '#F5F5F7' }}>
                      <th className="px-6 py-4 text-left font-semibold" style={{ color: '#1D1D1F' }}>
                        Dispatch No
                      </th>
                      <th className="px-6 py-4 text-left font-semibold" style={{ color: '#1D1D1F' }}>
                        Proof Type
                      </th>
                      <th className="px-6 py-4 text-left font-semibold" style={{ color: '#1D1D1F' }}>
                        File
                      </th>
                      <th className="px-6 py-4 text-left font-semibold" style={{ color: '#1D1D1F' }}>
                        Uploaded By
                      </th>
                      <th className="px-6 py-4 text-left font-semibold" style={{ color: '#1D1D1F' }}>
                        Date
                      </th>
                      <th className="px-6 py-4 text-left font-semibold" style={{ color: '#1D1D1F' }}>
                        Verified
                      </th>
                      <th className="px-6 py-4 text-left font-semibold" style={{ color: '#1D1D1F' }}>
                        Verified By
                      </th>
                      <th className="px-6 py-4 text-left font-semibold" style={{ color: '#1D1D1F' }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProofs.map((proof) => (
                      <tr key={proof.id} style={{ borderBottom: '1px solid #E5E5E7' }}>
                        <td className="px-6 py-4" style={{ color: '#1D1D1F' }}>
                          {proof.dispatchNo}
                        </td>
                        <td className="px-6 py-4" style={{ color: '#1D1D1F' }}>
                          {getProofTypeLabel(proof.proofType)}
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={proof.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#007AFF' }}
                            className="underline"
                          >
                            {proof.fileName}
                          </a>
                        </td>
                        <td className="px-6 py-4" style={{ color: '#1D1D1F' }}>
                          {proof.uploadedBy}
                        </td>
                        <td className="px-6 py-4" style={{ color: '#1D1D1F' }}>
                          {new Date(proof.uploadedDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            status={proof.verified ? 'Completed' : 'Pending'}
                            className="px-3 py-1 rounded-full text-xs font-semibold"
                          >
                            {proof.verified ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4" style={{ color: '#1D1D1F' }}>
                          {proof.verifiedBy || '-'}
                        </td>
                        <td className="px-6 py-4">
                          {!proof.verified && (
                            <Button
                              onClick={() => handleVerify(proof.id)}
                              style={{ backgroundColor: '#007AFF', color: 'white' }}
                              className="px-4 py-1 rounded-lg text-xs font-semibold"
                            >
                              Verify
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
