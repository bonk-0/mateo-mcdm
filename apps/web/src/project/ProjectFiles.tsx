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
import { FileText, Upload } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  registerCommand,
  runCommand,
  type AppCommand,
  type CommandPayload,
} from '../commands/commands';
import type { BrowserFileDialogs, NamePurpose } from './browser';
import {
  createProjectController,
  type ProjectController,
  type ProjectNotice,
  type UnsavedChoice,
} from './controller';
import { autosaveSettings } from './autosaveSettings';
import { fileNameOf, PROJECT_EXTENSION, type ProjectPlatform } from './platform';
import { getProjectController, setProjectController } from './store';

/** What the platform needs from the UI: the in-app dialogs and translated texts. */
export interface PlatformContext {
  readonly dialogs: BrowserFileDialogs;
  /** Name of the `.mateo` file type, for example "Mateo project". */
  readonly fileTypeLabel: () => string;
}

export type PlatformLoader = (context: PlatformContext) => Promise<ProjectPlatform>;

/** SQLite WebAssembly over the browser's project storage. */
export const loadPlatform: PlatformLoader = async ({ dialogs, fileTypeLabel }) => {
  const { browserFileStore, createBrowserPlatform } = await import('./browser');
  return createBrowserPlatform({
    files: await browserFileStore(),
    dialogs,
    fileTypeLabel,
    appVersion: __APP_VERSION__,
  });
};

/** Reads a file the user picked or dropped. */
export async function readProjectFile(file: File) {
  return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
}

/** Whether a file the user dropped or picked is a Mateo project, judged by its name. */
export function isProjectFileName(name: string): boolean {
  return name.toLowerCase().endsWith(`.${PROJECT_EXTENSION}`);
}

type Prompt =
  | { readonly kind: 'unsaved'; readonly name: string; answer(choice: UnsavedChoice): void }
  | {
      readonly kind: 'name';
      readonly purpose: NamePurpose;
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
    case 'imported':
    case 'exported':
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
 * Connects the File commands (menu, buttons, shortcuts, dropped files) to project storage,
 * and shows the questions and dialogs that go with them. Also keeps work from being lost
 * when the page goes away: a pending autosave runs when the page is hidden, and the
 * browser asks before a page with unsaved changes is closed. Rendered once, in the app
 * shell.
 */
export function ProjectFiles({ load = loadPlatform }: { load?: PlatformLoader }) {
  const { t } = useTranslation('project');
  const translate = useRef(t);
  translate.current = t;
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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
      fileTypeLabel: () => translate.current('fileType'),
      dialogs: {
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

    // Registered right away, so commands that arrive while storage loads wait for it
    // instead of getting lost.
    const handle =
      (run: (controller: ProjectController, payload: CommandPayload) => Promise<unknown> | void) =>
      (payload: CommandPayload) => {
        void ready.then((controller) => (controller ? run(controller, payload) : undefined));
      };
    const handlers: Record<AppCommand, (payload: CommandPayload) => void> = {
      'file.new': handle((c) => c.newProject()),
      'file.open': handle((c, { location }) => c.openProject(location)),
      'file.save': handle((c) => c.save()),
      'file.saveAs': handle((c) => c.saveAs()),
      'file.import': ({ file }) => {
        // Without a file, the file chooser of the browser picks one (see the input below).
        // It opens right away: browsers allow that only while the click is being handled.
        if (!file) fileInput.current?.click();
        else void ready.then((controller) => controller?.importProject(file));
      },
      'file.export': handle((c) => c.exportProject()),
      'file.clearRecent': handle((c) => c.clearRecent()),
    };
    const unregister = Object.entries(handlers).map(([command, handler]) =>
      registerCommand(command as AppCommand, handler),
    );

    // Ctrl+S (Cmd+S) saves the project instead of the web page.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 's' || !(event.ctrlKey || event.metaKey) || event.altKey) {
        return;
      }
      event.preventDefault();
      runCommand(event.shiftKey ? 'file.saveAs' : 'file.save');
    };
    // A pending autosave runs while the page can still finish it: hiding comes before
    // closing, and also covers a phone switching apps.
    const onHidden = () => {
      if (document.visibilityState === 'hidden') void getProjectController()?.flush();
    };
    // The browser asks before closing a page whose changes are not stored yet.
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!getProjectController()?.hasUnsavedChanges()) return;
      event.preventDefault();
      // Older browsers still need a return value to ask.
      event.returnValue = '';
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      disposed = true;
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('beforeunload', onBeforeUnload);
      for (const stop of unregister) stop();
      void ready.then((controller) => {
        if (controller && getProjectController() === controller) setProjectController(null);
      });
    };
  }, [load]);

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept={`.${PROJECT_EXTENSION}`}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        data-testid="project-file-input"
        onChange={(event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          // Cleared, so that choosing the same file again fires a change.
          input.value = '';
          if (file) {
            void readProjectFile(file).then((read) => runCommand('file.import', { file: read }));
          }
        }}
      />
      <ProjectPrompt prompt={prompt} />
    </>
  );
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
          <DialogTitle>{t(`browser.${prompt.purpose}Title`)}</DialogTitle>
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
            {t(prompt.purpose === 'saveAs' ? 'browser.save' : 'browser.create')}
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
      <DialogFooter className="sm:justify-between">
        <Button
          variant="ghost"
          onClick={() => {
            prompt.answer(null);
            // Still inside the click, which the browser's file chooser requires.
            runCommand('file.import');
          }}
          data-testid="open-from-computer"
        >
          <Upload aria-hidden />
          {t('browser.fromComputer')}
        </Button>
        <DialogClose asChild>
          <Button variant="outline">{t('browser.cancel')}</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
