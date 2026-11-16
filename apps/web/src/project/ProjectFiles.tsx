import { isProjectError } from '@mateo/project';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mateo/ui';
import type { TFunction } from 'i18next';
import { FileText } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { registerCommand, type AppCommand, type CommandPayload } from '../commands/commands';
import { isDesktop } from '../platform/runtime';
import type { BrowserFileDialogs } from './browser';
import {
  createProjectController,
  type ProjectController,
  type ProjectNotice,
  type UnsavedChoice,
} from './controller';
import type { DialogLabels } from './desktop';
import { autosaveSettings } from './autosaveSettings';
import { fileNameOf, type ProjectPlatform } from './platform';
import { getProjectController, setProjectController } from './store';

/** What a platform needs from the UI: texts for native dialogs, in-app dialogs for the browser. */
export interface PlatformContext {
  readonly dialogLabels: () => DialogLabels;
  readonly browserDialogs: BrowserFileDialogs;
}

export type PlatformLoader = (context: PlatformContext) => Promise<ProjectPlatform>;

/** Desktop: files on disk through Tauri. Browser: SQLite WebAssembly and browser storage. */
export const loadPlatform: PlatformLoader = async ({ dialogLabels, browserDialogs }) => {
  if (isDesktop()) {
    const { createDesktopPlatform } = await import('./desktop');
    return createDesktopPlatform(dialogLabels);
  }
  const { browserFileStore, createBrowserPlatform } = await import('./browser');
  return createBrowserPlatform({ files: await browserFileStore(), dialogs: browserDialogs });
};

type Prompt =
  | { readonly kind: 'unsaved'; readonly name: string; answer(choice: UnsavedChoice): void }
  | {
      readonly kind: 'name';
      readonly purpose: 'new' | 'saveAs';
      readonly suggested: string;
      answer(name: string | null): void;
    }
  | {
      readonly kind: 'pick';
      readonly locations: readonly string[];
      answer(location: string | null): void;
    }
  | { readonly kind: 'replace'; readonly location: string; answer(replace: boolean): void };

function describeError(t: TFunction<'project'>, error: unknown): string {
  if (isProjectError(error)) return t(`errors.${error.code}`, error.details);
  const detail = error instanceof Error ? error.message : String(error);
  return t('errors.UNKNOWN', { detail });
}

function showNotice(t: TFunction<'project'>, notice: ProjectNotice): void {
  switch (notice.kind) {
    case 'created':
    case 'opened':
    case 'saved':
      toast.success(t(`notices.${notice.kind}`, { name: notice.name }), {
        description: fileNameOf(notice.location),
      });
      return;
    case 'alreadyOpen':
      toast.info(t('notices.alreadyOpen', { name: notice.name }));
      return;
    case 'noProject':
      toast.info(t('notices.noProject'));
      return;
    case 'failed': {
      const message = describeError(t, notice.error);
      toast.error(t(`failed.${notice.action}`), {
        description: notice.location ? `${fileNameOf(notice.location)}: ${message}` : message,
      });
      console.error(notice.error);
    }
  }
}

/**
 * Connects the File commands (menu, buttons, files opened through the OS) to project
 * storage, and shows the questions and dialogs that go with them. Rendered once, in the
 * app shell.
 */
export function ProjectFiles({ load = loadPlatform }: { load?: PlatformLoader }) {
  const { t } = useTranslation('project');
  const translate = useRef(t);
  translate.current = t;
  const [prompt, setPrompt] = useState<Prompt | null>(null);

  useEffect(() => {
    let disposed = false;

    /** Shows a prompt and resolves with its first answer. */
    function ask<T>(build: (answer: (value: T) => void) => Prompt): Promise<T> {
      return new Promise<T>((resolve) => {
        let answered = false;
        setPrompt(
          build((value) => {
            if (answered) return;
            answered = true;
            setPrompt(null);
            resolve(value);
          }),
        );
      });
    }

    const context: PlatformContext = {
      dialogLabels: () => ({
        newTitle: translate.current('dialogs.newTitle'),
        openTitle: translate.current('dialogs.openTitle'),
        saveAsTitle: translate.current('dialogs.saveAsTitle'),
        filterName: translate.current('dialogs.filterName'),
      }),
      browserDialogs: {
        askName: (purpose, suggested) =>
          ask<string | null>((answer) => ({ kind: 'name', purpose, suggested, answer })),
        pickProject: (locations) =>
          ask<string | null>((answer) => ({ kind: 'pick', locations, answer })),
        confirmReplace: (location) =>
          ask<boolean>((answer) => ({ kind: 'replace', location, answer })),
      },
    };

    const ready: Promise<ProjectController | null> = load(context).then(
      (platform) => {
        if (disposed) return null;
        const controller = createProjectController({
          platform,
          appVersion: __APP_VERSION__,
          confirmUnsaved: (name) =>
            ask<UnsavedChoice>((answer) => ({ kind: 'unsaved', name, answer })),
          notify: (notice) => showNotice(translate.current, notice),
          untitledName: () => translate.current('untitled'),
          autosaveDelayMs: autosaveSettings.delayMs,
        });
        setProjectController(controller);
        return controller;
      },
      (error: unknown) => {
        console.error('Could not set up project storage', error);
        toast.error(translate.current('failed.open'), {
          description: describeError(translate.current, error),
        });
        return null;
      },
    );

    // Registered right away, so commands that arrive while storage loads (such as files
    // opened at launch) wait for it instead of getting lost.
    const handle =
      (run: (controller: ProjectController, payload: CommandPayload) => Promise<unknown> | void) =>
      (payload: CommandPayload) => {
        void ready.then((controller) => (controller ? run(controller, payload) : undefined));
      };
    const handlers: Record<Exclude<AppCommand, 'app.quit'>, (payload: CommandPayload) => void> = {
      'file.new': handle((c) => c.newProject()),
      'file.open': handle(async (c, { paths }) => {
        // One project at a time: the OS may pass several files, the first one is opened.
        await c.openProject(paths?.[0]);
      }),
      'file.save': handle((c) => c.save()),
      'file.saveAs': handle((c) => c.saveAs()),
      'file.clearRecent': handle((c) => c.clearRecent()),
    };
    const unregister = Object.entries(handlers).map(([command, handler]) =>
      registerCommand(command as AppCommand, handler),
    );

    return () => {
      disposed = true;
      for (const stop of unregister) stop();
      void ready.then((controller) => {
        if (controller && getProjectController() === controller) setProjectController(null);
      });
    };
  }, [load]);

  return <ProjectPrompt prompt={prompt} />;
}

function ProjectPrompt({ prompt }: { prompt: Prompt | null }) {
  const { t } = useTranslation('project');

  return (
    <>
      <AlertDialog
        open={prompt?.kind === 'unsaved'}
        onOpenChange={(open) => {
          if (!open && prompt?.kind === 'unsaved') prompt.answer('cancel');
        }}
      >
        {prompt?.kind === 'unsaved' && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('unsaved.title', { name: prompt.name })}</AlertDialogTitle>
              <AlertDialogDescription>{t('unsaved.description')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => prompt.answer('cancel')}>
                {t('unsaved.cancel')}
              </AlertDialogCancel>
              <Button variant="outline" onClick={() => prompt.answer('discard')}>
                {t('unsaved.discard')}
              </Button>
              <AlertDialogAction onClick={() => prompt.answer('save')}>
                {t('unsaved.save')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      <AlertDialog
        open={prompt?.kind === 'replace'}
        onOpenChange={(open) => {
          if (!open && prompt?.kind === 'replace') prompt.answer(false);
        }}
      >
        {prompt?.kind === 'replace' && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('browser.replaceTitle', { name: fileNameOf(prompt.location) })}
              </AlertDialogTitle>
              <AlertDialogDescription>{t('browser.replaceDescription')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => prompt.answer(false)}>
                {t('browser.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => prompt.answer(true)}>
                {t('browser.replace')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      <Dialog
        open={prompt?.kind === 'name'}
        onOpenChange={(open) => {
          if (!open && prompt?.kind === 'name') prompt.answer(null);
        }}
      >
        {prompt?.kind === 'name' && <NameDialog prompt={prompt} />}
      </Dialog>

      <Dialog
        open={prompt?.kind === 'pick'}
        onOpenChange={(open) => {
          if (!open && prompt?.kind === 'pick') prompt.answer(null);
        }}
      >
        {prompt?.kind === 'pick' && <PickDialog prompt={prompt} />}
      </Dialog>
    </>
  );
}

function NameDialog({ prompt }: { prompt: Extract<Prompt, { kind: 'name' }> }) {
  const { t } = useTranslation('project');
  const [name, setName] = useState(prompt.suggested);
  const inputId = useId();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length > 0) prompt.answer(name);
  };
  return (
    <DialogContent>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>
            {t(prompt.purpose === 'new' ? 'browser.newTitle' : 'browser.saveAsTitle')}
          </DialogTitle>
          <DialogDescription>{t('browser.nameDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="text-sm font-medium">
            {t('browser.nameLabel')}
          </label>
          <input
            id={inputId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onFocus={(event) => event.target.select()}
            autoComplete="off"
            spellCheck={false}
            className="h-9 rounded-md border border-border bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t('browser.cancel')}
            </Button>
          </DialogClose>
          <Button type="submit" disabled={name.trim().length === 0}>
            {t(prompt.purpose === 'new' ? 'browser.create' : 'browser.save')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function PickDialog({ prompt }: { prompt: Extract<Prompt, { kind: 'pick' }> }) {
  const { t } = useTranslation('project');
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('browser.openTitle')}</DialogTitle>
        <DialogDescription>
          {prompt.locations.length > 0 ? t('browser.openDescription') : t('browser.openEmpty')}
        </DialogDescription>
      </DialogHeader>
      {prompt.locations.length > 0 && (
        <ul className="-mx-2 flex max-h-72 flex-col overflow-y-auto">
          {prompt.locations.map((location) => (
            <li key={location}>
              <button
                type="button"
                onClick={() => prompt.answer(location)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">{location.replace(/\.mateo$/i, '')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">{t('browser.cancel')}</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
