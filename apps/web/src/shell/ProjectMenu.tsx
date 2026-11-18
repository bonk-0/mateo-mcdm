import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@mateo/ui';
import { ChevronDown, FilePlus2, FolderOpen, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { runCommand } from '../commands/commands';
import { useProjectState } from '../project/store';

/** The open project's name, with the File commands behind it. */
export function ProjectMenu() {
  const { t } = useTranslation(['shell', 'project']);
  const { project, recent } = useProjectState();
  const others = recent.filter((item) => item.location !== project?.location).slice(0, 5);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 min-w-0 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-foreground hover:bg-muted"
        data-testid="open-project"
        title={project?.location}
      >
        <span className="truncate">{project ? project.name : t('shell:appName')}</span>
        {project?.isDirty && (
          <span
            className="size-1.5 shrink-0 rounded-full bg-primary"
            role="img"
            aria-label={t('project:unsavedChanges')}
            title={t('project:unsavedChanges')}
          />
        )}
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="sr-only">{t('shell:projectMenu')}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuItem onSelect={() => runCommand('file.new')}>
          <FilePlus2 aria-hidden />
          {t('shell:menu.newProject')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => runCommand('file.open')}>
          <FolderOpen aria-hidden />
          {t('shell:menu.open')}
        </DropdownMenuItem>
        {project && (
          <>
            <DropdownMenuItem onSelect={() => runCommand('file.save')}>
              <Save aria-hidden />
              {t('shell:menu.save')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => runCommand('file.saveAs')}>
              <span className="size-4" aria-hidden />
              {t('shell:menu.saveAs')}
            </DropdownMenuItem>
          </>
        )}
        {others.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('shell:menu.recent')}</DropdownMenuLabel>
            {others.map((item) => (
              <DropdownMenuItem
                key={item.location}
                title={item.location}
                onSelect={() => runCommand('file.open', { paths: [item.location] })}
              >
                <span className="truncate">{item.name}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
