/**
 * Upload a file to the /api/documents endpoint
 * Returns the document record from the database
 */
export async function uploadDocument(
  file: File,
  module: string,
  recordId: string,
  docType: string,
  uploadedBy?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('module', module);
  formData.append('recordId', recordId);
  formData.append('docType', docType);
  if (uploadedBy) formData.append('uploadedBy', uploadedBy);

  const res = await fetch('/api/documents', {
    method: 'POST',
    body: formData,
  });

  return res.json();
}

/**
 * Upload multiple files for the same record
 */
export async function uploadDocuments(
  files: File[],
  module: string,
  recordId: string,
  docType: string,
  uploadedBy?: string
): Promise<{ success: boolean; data: any[]; errors: string[] }> {
  const results = await Promise.all(
    files.map((file) => uploadDocument(file, module, recordId, docType, uploadedBy))
  );

  return {
    success: results.every((r) => r.success),
    data: results.filter((r) => r.success).map((r) => r.data),
    errors: results.filter((r) => !r.success).map((r) => r.error || 'Upload failed'),
  };
}

/**
 * Fetch documents for a specific record
 */
export async function fetchDocuments(
  module: string,
  recordId: string
): Promise<any[]> {
  const params = new URLSearchParams({ module, recordId: recordId.toString() });
  const res = await fetch(`/api/documents?${params}`);
  const json = await res.json();
  return json.success ? json.data : [];
}
