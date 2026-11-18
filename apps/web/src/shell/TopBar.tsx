import { cn } from '@mateo/ui';
import { BookOpen, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useLocation } from 'react-router';
import { findPage, pathOf } from '../navigation/navigation';
import { useSession } from '../editor/session';
import { LogoMark } from './Logo';
import { ProjectMenu } from './ProjectMenu';
import { Stepper } from './Stepper';

function AreaLink({
  to,
  active,
  label,
  icon,
}: {
  to: string;
  active: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </NavLink>
  );
}

/**
 * The only bar of the app: the project on the left, the steps of the decision in the
 * middle, Learn and Settings on the right.
 */
export function TopBar() {
  const { t } = useTranslation(['nav', 'shell']);
  const { pathname } = useLocation();
  const area = findPage(pathname)?.area;
  const session = useSession();
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 rounded-md"
          aria-label={t('shell:home')}
        >
          <LogoMark className="size-7" />
        </Link>
        <ProjectMenu />
      </div>
      <nav aria-label={t('shell:mainNavigation')} className="flex items-center gap-1">
        {session && <Stepper />}
        <span className="mx-2 hidden h-5 w-px bg-border md:block" aria-hidden />
        <AreaLink
          to={pathOf('library')}
          active={area === 'learn'}
          label={t('nav:areas.learn')}
          icon={<BookOpen className="size-4" aria-hidden />}
        />
        <AreaLink
          to={pathOf('languageFormats')}
          active={area === 'settings'}
          label={t('nav:areas.settings')}
          icon={<Settings className="size-4" aria-hidden />}
        />
      </nav>
      {/* Keeps the steps centred between the project name and the side links. */}
      <div className="hidden flex-1 lg:block" aria-hidden />
    </header>
  );
}
