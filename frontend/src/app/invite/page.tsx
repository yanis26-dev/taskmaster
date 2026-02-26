'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

function InviteContent() {
  const params = useSearchParams();
  const token = params.get('token');

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-monday-text-secondary">This invitation link is invalid.</p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-monday-text mb-2">
          You have been invited to TaskMaster
        </h2>
        <p className="text-sm text-monday-text-secondary">
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

      <p className="text-xs text-monday-text-tertiary">
        Make sure to sign in with the Microsoft account that matches the email this invitation was sent to.
      </p>
    </div>
  );
}

export default function InvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-monday-surface-secondary to-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-monday-primary flex items-center justify-center">
              <Icon icon="solar:checkbox-bold" className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-monday-text">TaskMaster</h1>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-monday-border-light p-8">
          <Suspense fallback={<p className="text-center text-sm text-monday-text-tertiary">Loading...</p>}>
            <InviteContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
