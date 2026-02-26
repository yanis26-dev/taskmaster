'use client';

import { useState, useEffect } from 'react';
import { useSettings, useUpdateSettings } from '@/hooks/useTasks';
import { useQuery } from '@tanstack/react-query';
import { authApi, outlookApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { format } from 'date-fns';

const TIMEZONES = [
  'Asia/Jerusalem',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney',
];

export default function SettingsPage() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: authApi.getMe });
  const { data: settings, isLoading } = useSettings();
  const { mutate: updateSettings, isPending } = useUpdateSettings();

  const { data: subscriptions, refetch: refetchSubs } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: outlookApi.getSubscriptions,
    enabled: !!user?.microsoftId,
  });

  const [timezone, setTimezone] = useState('Asia/Jerusalem');
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestTime, setDigestTime] = useState('07:30');
  const [autoEmail, setAutoEmail] = useState(true);
  const [autoCalendar, setAutoCalendar] = useState(true);
  const [autoFocusBlock, setAutoFocusBlock] = useState(false);

  useEffect(() => {
    if (settings) {
      setTimezone(settings.timezone);
      setDigestEnabled(settings.digestEnabled);
      setDigestTime(settings.digestTime);
      setAutoEmail(settings.autoEmailToTask);
      setAutoCalendar(settings.autoCalendarToTask);
      setAutoFocusBlock(settings.autoTaskToCalendar);
    }
  }, [settings]);

  function saveSettings() {
    updateSettings({
      timezone,
      digestEnabled,
      digestTime,
      autoEmailToTask: autoEmail,
      autoCalendarToTask: autoCalendar,
      autoTaskToCalendar: autoFocusBlock,
    });
  }

  async function handleCreateMailSub() {
    await outlookApi.createMailSub();
    refetchSubs();
  }

  async function handleCreateCalendarSub() {
    await outlookApi.createCalendarSub();
    refetchSubs();
  }

  async function handleDeleteSub(id: string) {
    await outlookApi.deleteSub(id);
    refetchSubs();
  }

  return (
    <div>
      <PageHeader icon={<Icon icon="solar:settings-bold" className="h-5 w-5" />} title="Settings" />

      <div className="space-y-8">
        {/* Account */}
        <Section title="Account">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-monday-primary-selected flex items-center justify-center text-monday-primary font-bold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-monday-text">{user?.name}</p>
              <p className="text-xs text-monday-text-tertiary">{user?.email}</p>
            </div>
            {user?.microsoftId && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-monday-status-done bg-[#00c875]/10 px-2 py-1 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-monday-status-done" />
                Microsoft Connected
              </span>
            )}
          </div>
        </Section>

        {/* General */}
        <Section title="General">
          <FormRow label="Timezone">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="text-sm bg-transparent border border-monday-border rounded-lg px-3 py-1.5 outline-none text-monday-text-secondary"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </FormRow>
        </Section>

        {/* Automations */}
        <Section title="Automations" subtitle="Control how TaskMaster interacts with Outlook">
          <div className="space-y-4">
            <Toggle
              label="Email → Task"
              description="Automatically create tasks from flagged emails or emails moved to 'Tasks' folder"
              icon={<Icon icon="solar:letter-bold" className="h-4 w-4" />}
              checked={autoEmail}
              onChange={setAutoEmail}
              disabled={!user?.microsoftId}
            />
            <Toggle
              label="Calendar → Task"
              description="Create tasks from calendar events with 'TODO:' prefix or 'Task' category"
              icon={<Icon icon="solar:calendar-bold" className="h-4 w-4" />}
              checked={autoCalendar}
              onChange={setAutoCalendar}
              disabled={!user?.microsoftId}
            />
            <Toggle
              label="Task → Calendar focus block"
              description="When scheduling a task, optionally create a calendar event for focus time"
              icon={<Icon icon="solar:calendar-bold" className="h-4 w-4" />}
              checked={autoFocusBlock}
              onChange={setAutoFocusBlock}
              disabled={!user?.microsoftId}
            />
          </div>
        </Section>

        {/* Daily Digest */}
        <Section title="Daily Digest">
          <div className="space-y-4">
            <Toggle
              label="Send daily digest email"
              description="Receive a morning summary of today's tasks, overdue items, and top priorities"
              icon={<Icon icon="solar:bell-bold" className="h-4 w-4" />}
              checked={digestEnabled}
              onChange={setDigestEnabled}
              disabled={!user?.microsoftId}
            />
            {digestEnabled && (
              <FormRow label="Digest time">
                <input
                  type="time"
                  value={digestTime}
                  onChange={(e) => setDigestTime(e.target.value)}
                  className="text-sm bg-transparent border border-monday-border rounded-lg px-3 py-1.5 outline-none text-monday-text-secondary"
                />
                <span className="text-xs text-monday-text-tertiary ml-2">({timezone})</span>
              </FormRow>
            )}
          </div>
        </Section>

        {/* Outlook Subscriptions */}
        {user?.microsoftId && (
          <Section
            title="Outlook Webhook Subscriptions"
            subtitle="Graph subscriptions that deliver real-time notifications"
          >
            <div className="space-y-3">
              {subscriptions?.map((sub) => (
                <div key={sub.id} className="flex items-center gap-3 p-3 rounded-lg border border-monday-border-light">
                  <div className={`h-2 w-2 rounded-full ${sub.active ? 'bg-monday-status-done' : 'bg-monday-text-tertiary'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-monday-text-secondary truncate">
                      {sub.resource.includes('messages') ? 'Mail' : 'Calendar'} notifications
                    </p>
                    <p className="text-xs text-monday-text-tertiary">
                      Expires {format(new Date(sub.expiresAt), 'MMM d, HH:mm')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => outlookApi.renewSub(sub.graphSubId).then(() => refetchSubs())}
                      className="text-xs text-monday-primary hover:underline flex items-center gap-1"
                    >
                      <Icon icon="solar:refresh-bold" className="h-3 w-3" /> Renew
                    </button>
                    <button
                      onClick={() => handleDeleteSub(sub.graphSubId)}
                      className="text-xs text-[#e2445c] hover:underline flex items-center gap-1"
                    >
                      <Icon icon="solar:link-broken-bold" className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCreateMailSub}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-monday-border rounded-lg hover:bg-monday-surface-secondary text-monday-text-secondary transition-colors"
                >
                  <Icon icon="solar:link-bold" className="h-3.5 w-3.5" /> Subscribe to Mail
                </button>
                <button
                  onClick={handleCreateCalendarSub}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-monday-border rounded-lg hover:bg-monday-surface-secondary text-monday-text-secondary transition-colors"
                >
                  <Icon icon="solar:link-bold" className="h-3.5 w-3.5" /> Subscribe to Calendar
                </button>
              </div>
            </div>
          </Section>
        )}

        {/* Save */}
        <div className="flex justify-end pt-4">
          <button
            onClick={saveSettings}
            disabled={isPending}
            className="px-6 py-2 bg-monday-primary hover:bg-monday-primary-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </div>
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

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-monday-text-secondary">{label}</label>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

function Toggle({
  label, description, icon, checked, onChange, disabled,
}: {
  label: string;
  description: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 ${disabled ? 'opacity-50' : ''}`}>
      {icon && <div className="mt-0.5 text-monday-text-tertiary">{icon}</div>}
      <div className="flex-1">
        <p className="text-sm font-medium text-monday-text-secondary">{label}</p>
        <p className="text-xs text-monday-text-tertiary mt-0.5">{description}</p>
        {disabled && <p className="text-xs text-monday-status-working mt-1">Requires Microsoft account</p>}
      </div>
      <button
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-monday-primary' : 'bg-monday-text-tertiary'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
