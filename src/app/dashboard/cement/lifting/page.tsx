'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CementLiftingRedirect() {
  const router = useRouter();
  useEffect(() => {
    // Redirect to cement operations page with liftings tab active
    router.replace('/dashboard/cement?tab=liftings');
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-slate-500">Redirecting to Cement Liftings...</p>
    </div>
  );
}
