import type { ProjectSession } from '@mateo/project';
import { Button, cn } from '@mateo/ui';
import { ArrowRight, FilePlus2, FolderOpen, FlaskConical, History, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { runCommand } from '../commands/commands';
import type { ImportInput } from '../dataCenter/wizard';
import { mediaTypeOf } from '../dataCenter/wizard';
import { useMessage } from '../editor/messages';
import { useDocument, useSession } from '../editor/session';
import { useFormatters } from '../hooks/preferences';
import { fileNameOf } from '../project/platform';
import { isProjectFileName, readProjectFile } from '../project/ProjectFiles';
import { useProjectState } from '../project/store';

/** What to do once the project the person asked for is open. */
type Intent =
  | { readonly kind: 'data' }
  | { readonly kind: 'import'; readonly input: ImportInput | null }
  | { readonly kind: 'sample' };

/**
 * Remembers what the person wanted while the File dialog runs, and does it when a new
 * project is open. Cancelling the dialog forgets it.
 */
function useIntent(session: ProjectSession | null) {
  const { t } = useTranslation(['library']);
  const message = useMessage();
  const navigate = useNavigate();
  const { busy } = useProjectState();
  const pending = useRef<{ intent: Intent; from: ProjectSession | null; started: boolean } | null>(
    null,
  );

  useEffect(() => {
    const waiting = pending.current;
    if (!waiting) return;
    if (session && session !== waiting.from) {
      pending.current = null;
      void act(waiting.intent, session);
      return;
    }
    if (busy) waiting.started = true;
    // The dialog closed without a new project: nothing to do.
    else if (waiting.started) pending.current = null;
  });

  async function act(intent: Intent, open: ProjectSession) {
    switch (intent.kind) {
      case 'data':
        void navigate('/data');
        return;
      case 'import':
        void navigate('/data', {
          state: intent.input ? { importInput: intent.input } : { importFile: true },
        });
        return;
      case 'sample': {
        const { addSample } = await import('../library/SampleActions');
        const { sampleFixture } = await import('../library/samples');
        void navigate(
          addSample(open, 'marcos', {
            name: t('library:sample.datasetName', { method: message('methods.marcos.name') }),
            description: t('library:sample.datasetDescription', {
              doi: sampleFixture('marcos').source.doi,
            }),
          }),
        );
      }
    }
  }

  /** Runs `intent` in the open project, or after creating a new one. */
  return (intent: Intent, newProject: boolean) => {
    if (session && !newProject) {
      void act(intent, session);
      return;
    }
    pending.current = { intent, from: session, started: false };
    runCommand('file.new');
  };
}

async function readDropped(file: File): Promise<ImportInput> {
  return {
    name: file.name,
    bytes: new Uint8Array(await file.arrayBuffer()),
    mediaType: mediaTypeOf(file.name),
    pasted: false,
  };
}

function RecentProjects() {
  const { t } = useTranslation('home');
  const { project, recent } = useProjectState();
  const others = recent.filter((item) => item.location !== project?.location).slice(0, 6);
  return (
    <section
      aria-labelledby="recent-title"
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5"
    >
      <h2 id="recent-title" className="flex items-center gap-2 text-sm font-semibold">
        <History className="size-4 text-muted-foreground" aria-hidden />
        {t('recent.title')}
      </h2>
      {others.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">{t('recent.empty')}</p>
      ) : (
        <ul className="flex flex-col" data-testid="recent-projects">
          {others.map((item) => (
            <li key={item.location} className="border-b border-border last:border-b-0">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                title={item.location}
                onClick={() => runCommand('file.open', { location: item.location })}
              >
                <span className="truncate font-medium">{item.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {fileNameOf(item.location)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => runCommand('file.open')}
      >
        <FolderOpen aria-hidden />
        {t('recent.open')}
      </Button>
    </section>
  );
}

/**
 * The first screen: one question and the ways to answer it. With a project open, the way
 * back into it comes first.
 */
export function StartPage() {
  const { t } = useTranslation('home');
  const formatters = useFormatters();
  const session = useSession();
  const document = useDocument(session);
  const { project } = useProjectState();
  const navigate = useNavigate();
  const start = useIntent(session);
  const [dragging, setDragging] = useState(false);
  const datasets = document?.model.datasets ?? [];
  const first = datasets[0];

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (!file) return;
    // A project file is opened as a project; anything else is data to import.
    if (isProjectFileName(file.name)) {
      runCommand('file.import', { file: await readProjectFile(file) });
      return;
    }
    start({ kind: 'import', input: await readDropped(file) }, false);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {project ? project.name : t('title')}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          {project ? t('continue.lead') : t('lead')}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {project && first ? (
          <section className="flex flex-col justify-between gap-6 rounded-xl bg-navy p-6 text-navy-foreground">
            <div>
              <p className="text-sm opacity-75">{t('continue.label')}</p>
              <p className="mt-1 text-xl font-semibold">{first.name}</p>
              <p className="mt-1 text-sm opacity-75">
                {t('continue.size', {
                  alternatives: formatters.number(first.alternatives.length, 0),
                  criteria: formatters.number(first.criteria.length, 0),
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-primary text-primary-foreground"
                onClick={() => void navigate('/data')}
                data-testid="continue"
              >
                {t('continue.action')}
                <ArrowRight aria-hidden />
              </Button>
              <Button
                variant="ghost"
                className="text-navy-foreground hover:bg-white/10"
                onClick={() => start({ kind: 'data' }, true)}
              >
                <FilePlus2 aria-hidden />
                {t('newDecision')}
              </Button>
            </div>
          </section>
        ) : (
          <section
            aria-labelledby="start-title"
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => void onDrop(event)}
            className={cn(
              'flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed bg-surface p-8 text-center transition-colors',
              dragging ? 'border-primary bg-accent' : 'border-border',
            )}
            data-testid="start-drop"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Upload className="size-6" aria-hidden />
            </div>
            <div>
              <h2 id="start-title" className="font-semibold">
                {t('drop.title')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('drop.hint')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => start({ kind: 'import', input: null }, !session)}
                data-testid="start-import"
              >
                <Upload aria-hidden />
                {t('drop.choose')}
              </Button>
              <Button
                variant="outline"
                onClick={() => start({ kind: 'data' }, !session)}
                data-testid="start-blank"
              >
                <FilePlus2 aria-hidden />
                {t('drop.blank')}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => start({ kind: 'sample' }, !session)}
              data-testid="start-sample"
            >
              <FlaskConical aria-hidden />
              {t('drop.sample')}
            </Button>
          </section>
        )}
        <RecentProjects />
      </div>
    </div>
  );
}
