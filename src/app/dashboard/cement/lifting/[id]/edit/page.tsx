'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function CementLiftingEditRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/dashboard/cement/liftings/${id}/edit`);
    } else {
      router.replace('/dashboard/cement?tab=liftings');
    }
  }, [id, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-slate-500">Redirecting to Cement Lifting edit page...</p>
    </div>
  );
}
