'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, authApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { format } from 'date-fns';
import type { AdminUser, Invitation } from '@/types';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');

  const [linkEmail, setLinkEmail] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkError, setLinkError] = useState('');

  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<'user' | 'admin'>('user');
  const [addError, setAddError] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.getMe });

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
      setInviteError('');
      qc.invalidateQueries({ queryKey: ['admin-invitations'] });
    },
    onError: (err: Error) => setInviteError(err.message),
  });

  const { mutate: generateLink, isPending: generatingLink } = useMutation({
    mutationFn: (email: string) => adminApi.createInviteLink(email),
    onSuccess: (data) => {
      const link = data.inviteLink ?? '';
      setGeneratedLink(link);
      setLinkError('');
      navigator.clipboard.writeText(link).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      });
      qc.invalidateQueries({ queryKey: ['admin-invitations'] });
    },
    onError: (err: Error) => setLinkError(err.message),
  });

  const { mutate: createUser, isPending: creating } = useMutation({
    mutationFn: () => adminApi.createUser({ email: addEmail, name: addName, role: addRole }),
    onSuccess: () => {
      setAddName('');
      setAddEmail('');
      setAddRole('user');
      setAddError('');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: Error) => setAddError(err.message),
  });

  function copyLink(inv: Invitation) {
    const link = inv.inviteLink ?? `${window.location.origin}/invite?token=${inv.id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div>
      <PageHeader icon={<Icon icon="solar:shield-bold" className="h-5 w-5" />} title="Admin Portal" />

      <div className="space-y-8">

        {/* Add user manually */}
        <Section title="Add User" subtitle="Pre-register an account — the user signs in with their existing Microsoft account">
          <div className="flex gap-3 flex-wrap">
            <input
              placeholder="Full name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className="flex-1 min-w-32 text-sm bg-transparent border border-monday-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-monday-primary text-monday-text-secondary"
            />
            <input
              type="email"
              placeholder="colleague@company.com"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              className="flex-1 min-w-48 text-sm bg-transparent border border-monday-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-monday-primary text-monday-text-secondary"
            />
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as 'user' | 'admin')}
              className="text-sm bg-white border border-monday-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-monday-primary text-monday-text-secondary"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={() => addName && addEmail && createUser()}
              disabled={!addName || !addEmail || creating}
              className="flex items-center gap-2 px-4 py-2 bg-monday-primary hover:bg-monday-primary-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Icon icon="solar:user-plus-bold" className="h-4 w-4" />
              {creating ? 'Adding...' : 'Add User'}
            </button>
          </div>
          {addError && <p className="text-xs text-[#e2445c] mt-2">{addError}</p>}
        </Section>

        {/* Invite user */}
        <Section title="Invite User" subtitle="Send an invitation email or generate a link to share manually">
          <div className="space-y-3">
            <div className="flex gap-3 flex-wrap">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && inviteEmail && sendInvite(inviteEmail)}
                className="flex-1 text-sm bg-transparent border border-monday-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-monday-primary text-monday-text-secondary"
              />
              <button
                onClick={() => inviteEmail && sendInvite(inviteEmail)}
                disabled={!inviteEmail || inviting}
                className="flex items-center gap-2 px-4 py-2 bg-monday-primary hover:bg-monday-primary-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Icon icon="solar:letter-bold" className="h-4 w-4" />
                {inviting ? 'Sending...' : 'Send Email'}
              </button>
            </div>
            {inviteError && <p className="text-xs text-[#e2445c]">{inviteError}</p>}

            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-monday-border-light" />
              <span className="text-xs text-monday-text-tertiary">or generate a shareable link</span>
              <div className="h-px flex-1 bg-monday-border-light" />
            </div>

            <div className="flex gap-3 flex-wrap">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={linkEmail}
                onChange={(e) => { setLinkEmail(e.target.value); setLinkError(''); setGeneratedLink(''); }}
                className="flex-1 text-sm bg-transparent border border-monday-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-monday-primary text-monday-text-secondary"
              />
              <button
                onClick={() => linkEmail && generateLink(linkEmail)}
                disabled={!linkEmail || generatingLink}
                className="flex items-center gap-2 px-4 py-2 bg-monday-text hover:bg-monday-text/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Icon icon="solar:link-bold" className="h-4 w-4" />
                {generatingLink ? 'Generating...' : 'Generate Link'}
              </button>
            </div>
            {linkError && <p className="text-xs text-[#e2445c]">{linkError}</p>}
            {generatedLink && (
              <div className="flex items-center gap-2 p-2.5 bg-monday-surface-secondary rounded-lg border border-monday-border-light">
                {linkCopied
                  ? <Icon icon="solar:check-circle-bold" className="h-3.5 w-3.5 text-monday-status-done flex-shrink-0" />
                  : <Icon icon="solar:link-bold" className="h-3.5 w-3.5 text-monday-text-tertiary flex-shrink-0" />}
                <span className="text-xs text-monday-text-secondary truncate flex-1 font-mono">{generatedLink}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(generatedLink).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); })}
                  className="text-xs text-monday-primary hover:text-monday-primary-hover font-medium flex-shrink-0"
                >
                  {linkCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>
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
  const isPending = !user.microsoftId;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-monday-border-light">
      <div className="h-8 w-8 rounded-full bg-monday-primary-selected flex items-center justify-center text-monday-primary text-xs font-bold flex-shrink-0">
        {user.name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-monday-text truncate">{user.name}</p>
          {isMe && <span className="text-xs text-monday-text-tertiary">(you)</span>}
          {isPending && (
            <span className="text-xs bg-monday-status-working/15 text-monday-status-working px-1.5 py-0.5 rounded-full">
              pending sign-in
            </span>
          )}
        </div>
        <p className="text-xs text-monday-text-tertiary truncate">{user.email}</p>
      </div>

      <span className="text-xs text-monday-text-tertiary">{user._count.tasks} tasks</span>

      <button
        onClick={onRoleToggle}
        disabled={isMe}
        title={isMe ? 'Cannot change your own role' : `Make ${user.role === 'admin' ? 'user' : 'admin'}`}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-40 ${
          user.role === 'admin'
            ? 'bg-monday-primary-selected text-monday-primary hover:bg-monday-primary-selected/80'
            : 'bg-monday-surface-secondary text-monday-text-secondary hover:bg-monday-surface-secondary/80'
        }`}
      >
        {user.role === 'admin' ? <Icon icon="solar:shield-bold" className="h-3 w-3" /> : <Icon icon="solar:user-check-bold" className="h-3 w-3" />}
        {user.role}
      </button>

      <button
        onClick={onDelete}
        disabled={isMe}
        title={isMe ? 'Cannot delete yourself' : 'Delete user'}
        className="p-1.5 rounded-md text-monday-text-tertiary hover:text-[#e2445c] hover:bg-[#e2445c]/10 transition-colors disabled:opacity-30"
      >
        <Icon icon="solar:trash-bin-trash-bold" className="h-3.5 w-3.5" />
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
    <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-monday-border">
      <Icon icon="solar:letter-bold" className="h-4 w-4 text-monday-text-tertiary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-monday-text-secondary truncate">{inv.email}</p>
        <p className="text-xs text-monday-text-tertiary">
          Expires {format(new Date(inv.expiresAt), 'MMM d, HH:mm')} · invited by {inv.invitedBy.name}
        </p>
      </div>
      <button
        onClick={onCopy}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-monday-border text-monday-text-secondary hover:bg-monday-surface-secondary transition-colors"
      >
        {copied ? <Icon icon="solar:check-circle-bold" className="h-3 w-3 text-monday-status-done" /> : <Icon icon="solar:copy-bold" className="h-3 w-3" />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
      <button
        onClick={onRevoke}
        className="p-1.5 rounded-md text-monday-text-tertiary hover:text-[#e2445c] hover:bg-[#e2445c]/10 transition-colors"
      >
        <Icon icon="solar:user-cross-bold" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-monday-text">{title}</h2>
        {subtitle && <p className="text-sm text-monday-text-tertiary mt-0.5">{subtitle}</p>}
      </div>
      <div className="bg-white rounded-xl border border-monday-border-light p-4">
        {children}
      </div>
    </div>
  );
}
