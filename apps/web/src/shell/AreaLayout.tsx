import { cn } from '@mateo/ui';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';
import { AREA_PAGES, pathOf } from '../navigation/navigation';

/** Learn and Settings: a row of tabs over the page. */
export function AreaLayout({ area }: { area: keyof typeof AREA_PAGES }) {
  const { t } = useTranslation('nav');
  return (
    <div className="flex flex-col gap-8">
      <nav aria-label={t(`areas.${area}`)} className="-mb-2 border-b border-border">
        <ul className="-mb-px flex flex-wrap gap-1">
          {AREA_PAGES[area].map((id) => (
            <li key={id}>
              <NavLink
                to={pathOf(id)}
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-10 items-center border-b-2 px-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {t(`items.${id}.title`)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
