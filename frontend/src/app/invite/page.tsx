'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckSquare } from 'lucide-react';

function InviteContent() {
  const params = useSearchParams();
  const token = params.get('token');

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-gray-500 dark:text-gray-400">This invitation link is invalid.</p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          You have been invited to TaskMaster
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Sign in with your Microsoft account to accept the invitation and get access.
        </p>
      </div>

      <a
        href="/api/auth/microsoft"
        className="inline-flex items-center justify-center gap-3 w-full px-6 py-3 bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg font-medium transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 23 23" fill="none">
          <rect x="1" y="1" width="10" height="10" fill="#f25022" />
          <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
          <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
          <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
        </svg>
        Continue with Microsoft
      </a>

      <p className="text-xs text-gray-400">
        Make sure to sign in with the Microsoft account that matches the email this invitation was sent to.
      </p>
    </div>
  );
}

export default function InvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <CheckSquare className="h-10 w-10 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">TaskMaster</h1>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8">
          <Suspense fallback={<p className="text-center text-sm text-gray-400">Loading…</p>}>
            <InviteContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
