'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, authApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Shield, Trash2, UserCheck, Mail, Copy, Check, UserX } from 'lucide-react';
import { format } from 'date-fns';
import type { AdminUser, Invitation } from '@/types';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.getMe });

  // Redirect non-admins
  if (me && me.role !== 'admin') {
    router.push('/today');
    return null;
  }

  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: adminApi.listUsers });
  const { data: invitations = [] } = useQuery({ queryKey: ['admin-invitations'], queryFn: adminApi.listInvitations });

  const { mutate: changeRole } = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'user' | 'admin' }) => adminApi.changeRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const { mutate: deleteUser } = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const { mutate: revoke } = useMutation({
    mutationFn: (id: string) => adminApi.revokeInvitation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-invitations'] }),
  });

  const { mutate: sendInvite, isPending: inviting } = useMutation({
    mutationFn: (email: string) => adminApi.invite(email),
    onSuccess: () => {
      setInviteEmail('');
      setError('');
      qc.invalidateQueries({ queryKey: ['admin-invitations'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  function copyLink(inv: Invitation) {
    const link = inv.inviteLink ?? `${window.location.origin}/invite?token=${inv.id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div>
      <PageHeader icon={<Shield className="h-5 w-5" />} title="Admin Portal" />

      <div className="space-y-8">
        {/* Invite user */}
        <Section title="Invite User" subtitle="Send an invitation link to grant access to the system">
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && inviteEmail && sendInvite(inviteEmail)}
              className="flex-1 text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-300"
            />
            <button
              onClick={() => inviteEmail && sendInvite(inviteEmail)}
              disabled={!inviteEmail || inviting}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              {inviting ? 'Inviting…' : 'Send Invite'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </Section>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <Section title="Pending Invitations">
            <div className="space-y-2">
              {invitations.map((inv) => (
                <InvitationRow
                  key={inv.id}
                  inv={inv}
                  copied={copiedId === inv.id}
                  onCopy={() => copyLink(inv)}
                  onRevoke={() => revoke(inv.id)}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Users table */}
        <Section title="Users" subtitle={`${users.length} total`}>
          <div className="space-y-2">
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isMe={u.id === me?.id}
                onRoleToggle={() =>
                  changeRole({ id: u.id, role: u.role === 'admin' ? 'user' : 'admin' })
                }
                onDelete={() => {
                  if (confirm(`Delete ${u.name}? This removes all their tasks.`)) deleteUser(u.id);
                }}
              />
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function UserRow({
  user, isMe, onRoleToggle, onDelete,
}: {
  user: AdminUser;
  isMe: boolean;
  onRoleToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
      <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold flex-shrink-0">
        {user.name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{user.name}</p>
          {isMe && <span className="text-xs text-gray-400">(you)</span>}
        </div>
        <p className="text-xs text-gray-400 truncate">{user.email}</p>
      </div>

      <span className="text-xs text-gray-400">{user._count.tasks} tasks</span>

      <button
        onClick={onRoleToggle}
        disabled={isMe}
        title={isMe ? 'Cannot change your own role' : `Make ${user.role === 'admin' ? 'user' : 'admin'}`}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-40 ${
          user.role === 'admin'
            ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
        }`}
      >
        {user.role === 'admin' ? <Shield className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
        {user.role}
      </button>

      <button
        onClick={onDelete}
        disabled={isMe}
        title={isMe ? 'Cannot delete yourself' : 'Delete user'}
        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-30"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function InvitationRow({
  inv, copied, onCopy, onRevoke,
}: {
  inv: Invitation;
  copied: boolean;
  onCopy: () => void;
  onRevoke: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
      <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{inv.email}</p>
        <p className="text-xs text-gray-400">
          Expires {format(new Date(inv.expiresAt), 'MMM d, HH:mm')} · invited by {inv.invitedBy.name}
        </p>
      </div>
      <button
        onClick={onCopy}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
      <button
        onClick={onRevoke}
        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
      >
        <UserX className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
        {children}
      </div>
    </div>
  );
}
