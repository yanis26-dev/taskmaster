import { Metadata } from 'next';
import Link from 'next/link';
import { CheckSquare } from 'lucide-react';

export const metadata: Metadata = { title: 'Sign in — TaskMaster' };

export default function LoginPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '/api';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <CheckSquare className="h-10 w-10 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">TaskMaster</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Personal task management with Outlook integration
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
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

          <p className="mt-4 text-xs text-center text-gray-400">
            You'll be redirected to Microsoft to sign in with your work or personal account.
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Your data is stored securely and never shared.
        </p>
      </div>
    </div>
  );
}
