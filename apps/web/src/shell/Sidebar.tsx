import { cn, Tooltip, TooltipContent, TooltipTrigger } from '@mateo/ui';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { visibleNavigation, type NavItem } from '../navigation/navigation';
import { useSettings } from '../settings/store';
import { LogoMark } from './Logo';

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { t } = useTranslation('nav');
  const label = t(`items.${item.id}.title`);
  const Icon = item.icon;
  const link = (
    <NavLink
      to={item.path}
      end
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'relative flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors duration-(--duration-fast)',
          isActive
            ? 'font-medium text-accent-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          collapsed && 'justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-md bg-accent"
              transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
              aria-hidden
            />
          )}
          <Icon className="relative size-4 shrink-0" aria-hidden />
          {!collapsed && <span className="relative truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const { t } = useTranslation(['nav', 'shell']);
  const collapsed = useSettings((s) => s.sidebarCollapsed);
  const update = useSettings((s) => s.update);
  const sections = visibleNavigation();

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-(--duration-base) ease-(--ease-standard)',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div
        className={cn('flex h-14 items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}
      >
        <LogoMark />
        {!collapsed && (
          <span translate="no" className="text-[15px] font-semibold tracking-tight text-foreground">
            Mateo
          </span>
        )}
      </div>

      <nav aria-label={t('shell:mainNavigation')} className="flex-1 overflow-y-auto px-3 pb-3">
        {sections.map((section) => (
          <div key={section.id} className="mt-4 first:mt-2">
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-border" aria-hidden />
            ) : (
              <h2 className="mb-1 px-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {t(`nav:sections.${section.id}`)}
              </h2>
            )}
            <ul
              className="flex flex-col gap-0.5"
              aria-label={collapsed ? t(`nav:sections.${section.id}`) : undefined}
            >
              {section.items.map((item) => (
                <li key={item.id}>
                  <SidebarLink item={item} collapsed={collapsed} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn('border-t border-border p-3', collapsed && 'flex justify-center')}>
        <button
          type="button"
          onClick={() => update({ sidebarCollapsed: !collapsed })}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('shell:expandSidebar') : t('shell:collapseSidebar')}
          className={cn(
            'flex h-9 items-center gap-3 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            collapsed ? 'w-9 justify-center px-0' : 'w-full',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" aria-hidden />
          ) : (
            <>
              <PanelLeftClose className="size-4" aria-hidden />
              <span>{t('shell:collapseSidebar')}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
