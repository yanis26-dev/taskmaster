'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckSquare } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const success = params.get('success');

  useEffect(() => {
    if (success === 'true') {
      // Short delay for smooth UX, then redirect to app
      const t = setTimeout(() => router.replace('/today'), 800);
      return () => clearTimeout(t);
    } else {
      router.replace('/login?error=auth_failed');
    }
  }, [success, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <CheckSquare className="h-12 w-12 text-indigo-600 mx-auto mb-3 animate-bounce" />
        <p className="text-gray-600 dark:text-gray-400">Signing you in…</p>
      </div>
    </div>
  );
}
