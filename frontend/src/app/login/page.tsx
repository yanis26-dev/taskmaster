import { Metadata } from 'next';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Sign in — TaskMaster' };

export default function LoginPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '/api';

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
          <p className="text-monday-text-secondary">
            Personal task management with Outlook integration
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-monday-border-light p-8">
          <h2 className="text-xl font-semibold text-monday-text mb-6 text-center">
            Sign in to continue
          </h2>

          <a
            href={`${apiUrl}/auth/microsoft`}
            className="flex items-center justify-center gap-3 w-full px-6 py-3 bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg font-medium transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 23 23" fill="none">
              <rect x="1" y="1" width="10" height="10" fill="#f25022" />
              <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
              <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
              <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
            </svg>
            Continue with Microsoft
          </a>

          <p className="mt-4 text-xs text-center text-monday-text-tertiary">
            You'll be redirected to Microsoft to sign in with your work or personal account.
          </p>
        </div>

        <p className="text-center text-xs text-monday-text-tertiary mt-6">
          Your data is stored securely and never shared.
        </p>
      </div>
    </div>
  );
}
