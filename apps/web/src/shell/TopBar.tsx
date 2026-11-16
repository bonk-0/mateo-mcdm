import { Badge } from '@mateo/ui';
import { ChevronRight, FileQuestion, FileText, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NavMatch } from '../navigation/navigation';
import { isDesktop } from '../platform/runtime';
import { useProjectState } from '../project/store';
import { LanguageMenu, ThemeMenu } from './QuickSettings';

export function TopBar({ match }: { match: NavMatch | undefined }) {
  const { t } = useTranslation(['nav', 'shell', 'project']);
  const { project } = useProjectState();
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/80 px-5 backdrop-blur">
      <nav aria-label={t('shell:breadcrumb')} className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-sm">
          {match ? (
            <>
              {/* Skip the section when it repeats the page name (Home › Home). */}
              {t(`nav:sections.${match.section.id}`) !== t(`nav:items.${match.item.id}.title`) && (
                <>
                  <li className="text-muted-foreground">{t(`nav:sections.${match.section.id}`)}</li>
                  <li aria-hidden>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </li>
                </>
              )}
              <li className="truncate font-medium text-foreground" aria-current="page">
                {t(`nav:items.${match.item.id}.title`)}
              </li>
            </>
          ) : (
            <li className="font-medium text-foreground">{t('shell:notFound.title')}</li>
          )}
        </ol>
      </nav>

      {project ? (
        <Badge
          variant="outline"
          className="hidden max-w-64 sm:inline-flex"
          title={project.location}
          data-testid="open-project"
        >
          <FileText className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{project.name}</span>
          {project.isDirty && (
            <span
              className="size-1.5 shrink-0 rounded-full bg-primary"
              role="img"
              aria-label={t('project:unsavedChanges')}
              title={t('project:unsavedChanges')}
            />
          )}
        </Badge>
      ) : (
        <Badge variant="outline" className="hidden sm:inline-flex">
          <FileQuestion className="size-3.5" aria-hidden />
          {t('shell:noProject')}
        </Badge>
      )}
      {!isDesktop() && (
        <Badge variant="neutral" className="hidden md:inline-flex">
          <Monitor className="size-3.5" aria-hidden />
          {t('shell:browserBuild')}
        </Badge>
      )}
      <div className="flex items-center gap-1">
        <LanguageMenu />
        <ThemeMenu />
      </div>
    </header>
  );
}
