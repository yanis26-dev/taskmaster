import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface ViewTabProps {
  icon: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
}

function ViewTab({ icon, label, active, disabled }: ViewTabProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
        active
          ? 'text-monday-primary bg-monday-primary-selected font-medium'
          : disabled
            ? 'text-monday-text-tertiary cursor-not-allowed'
            : 'text-monday-text-secondary hover:bg-monday-surface-secondary',
      )}
      title={disabled ? 'Coming soon' : undefined}
    >
      <Icon icon={icon} className="h-4 w-4" />
      {label}
    </button>
  );
}

interface PageHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
  showViewSwitcher?: boolean;
}

export function PageHeader({ icon, title, subtitle, badge, actions, showViewSwitcher }: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-monday-border px-6 py-4">
      {/* Top row: title + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="text-monday-primary">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-monday-text">{title}</h1>
              {badge && (
                <span className="text-xs text-monday-text-secondary bg-monday-surface-secondary px-2 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-sm text-monday-text-secondary mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* View switcher bar */}
      {showViewSwitcher && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-monday-border-light">
          <ViewTab icon="solar:list-bold" label="Table" active />
          <ViewTab icon="solar:widget-5-bold" label="Kanban" disabled />
          <ViewTab icon="solar:calendar-bold" label="Timeline" disabled />
        </div>
      )}
    </div>
  );
}
