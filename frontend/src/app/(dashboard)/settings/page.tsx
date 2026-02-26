'use client';

import { useState, useEffect } from 'react';
import { useSettings, useUpdateSettings } from '@/hooks/useTasks';
import { useQuery } from '@tanstack/react-query';
import { authApi, outlookApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Settings, Mail, Calendar, Bell, Link, Unlink, RefreshCw } from 'lucide-react';
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

  // Local form state (mirrors settings)
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
      <PageHeader icon={<Settings className="h-5 w-5" />} title="Settings" />

      <div className="space-y-8">
        {/* Account */}
        <Section title="Account">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
            {user?.microsoftId && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-1 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
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
              className="text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 outline-none text-gray-700 dark:text-gray-300"
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
              icon={<Mail className="h-4 w-4" />}
              checked={autoEmail}
              onChange={setAutoEmail}
              disabled={!user?.microsoftId}
            />
            <Toggle
              label="Calendar → Task"
              description="Create tasks from calendar events with 'TODO:' prefix or 'Task' category"
              icon={<Calendar className="h-4 w-4" />}
              checked={autoCalendar}
              onChange={setAutoCalendar}
              disabled={!user?.microsoftId}
            />
            <Toggle
              label="Task → Calendar focus block"
              description="When scheduling a task, optionally create a calendar event for focus time"
              icon={<Calendar className="h-4 w-4" />}
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
              icon={<Bell className="h-4 w-4" />}
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
                  className="text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 outline-none text-gray-700 dark:text-gray-300"
                />
                <span className="text-xs text-gray-400 ml-2">({timezone})</span>
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
                <div key={sub.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className={`h-2 w-2 rounded-full ${sub.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {sub.resource.includes('messages') ? '📧 Mail' : '📅 Calendar'} notifications
                    </p>
                    <p className="text-xs text-gray-400">
                      Expires {format(new Date(sub.expiresAt), 'MMM d, HH:mm')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => outlookApi.renewSub(sub.graphSubId).then(() => refetchSubs())}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" /> Renew
                    </button>
                    <button
                      onClick={() => handleDeleteSub(sub.graphSubId)}
                      className="text-xs text-red-500 hover:underline flex items-center gap-1"
                    >
                      <Unlink className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCreateMailSub}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                >
                  <Link className="h-3.5 w-3.5" /> Subscribe to Mail
                </button>
                <button
                  onClick={handleCreateCalendarSub}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                >
                  <Link className="h-3.5 w-3.5" /> Subscribe to Calendar
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
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save settings'}
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
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
        {children}
      </div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-600 dark:text-gray-400">{label}</label>
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
      {icon && <div className="mt-0.5 text-gray-400">{icon}</div>}
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        {disabled && <p className="text-xs text-orange-400 mt-1">Requires Microsoft account</p>}
      </div>
      <button
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
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
