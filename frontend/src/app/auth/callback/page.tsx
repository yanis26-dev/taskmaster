'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const success = params.get('success');

  useEffect(() => {
    if (success === 'true') {
      const t = setTimeout(() => router.replace('/today'), 800);
      return () => clearTimeout(t);
    } else {
      router.replace('/login?error=auth_failed');
    }
  }, [success, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="h-12 w-12 rounded-lg bg-monday-primary flex items-center justify-center mx-auto mb-3 animate-bounce">
          <Icon icon="solar:checkbox-bold" className="h-6 w-6 text-white" />
        </div>
        <p className="text-monday-text-secondary">Signing you in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackInner />
    </Suspense>
  );
}
