import type { Dataset, ProjectDocument, ProjectSession } from '@mateo/project';
import { Button } from '@mateo/ui';
import { ArrowLeft, ArrowRight, Table2 } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { useDocument, useSession } from '../editor/session';
import { fieldClass } from '../editor/ui';
import { DATASET_PARAM } from '../library/preset';
import { activeDataset, useFlowState } from './state';

export interface FlowContext {
  readonly session: ProjectSession;
  readonly document: ProjectDocument;
  readonly dataset: Dataset;
}

/** A calm, centred message with one way forward. */
export function Notice({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Table2 className="size-6" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
    </section>
  );
}

/** The decision problem the steps work on, set from a link (`?dataset=`) once. */
export function useActiveDataset(document: ProjectDocument | null): Dataset | undefined {
  const [search] = useSearchParams();
  const requested = search.get(DATASET_PARAM);
  const datasetId = useFlowState((state) => state.datasetId);
  const setDataset = useFlowState((state) => state.setDataset);
  useEffect(() => {
    if (requested) setDataset(requested);
  }, [requested, setDataset]);
  return document ? activeDataset(document.model.datasets, requested ?? datasetId) : undefined;
}

/** Switches the decision problem when the project has more than one. */
export function DatasetSwitcher({
  document,
  dataset,
}: {
  document: ProjectDocument;
  dataset: Dataset;
}) {
  const { t } = useTranslation('flow');
  const setDataset = useFlowState((state) => state.setDataset);
  if (document.model.datasets.length < 2) return null;
  return (
    <select
      className={`${fieldClass} w-auto! max-w-64`}
      aria-label={t('dataset')}
      value={dataset.id}
      onChange={(event) => setDataset(event.target.value)}
    >
      {document.model.datasets.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  );
}

export function StepHeader({
  title,
  description,
  aside,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {aside}
    </div>
  );
}

/** Back and next, at the end of a step. */
export function StepFooter({
  back,
  next,
}: {
  back?: { to: string; label: string };
  next?: { to: string; label: string; disabled?: boolean };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
      {back ? (
        <Button asChild variant="ghost">
          <Link to={back.to}>
            <ArrowLeft aria-hidden />
            {back.label}
          </Link>
        </Button>
      ) : (
        <span />
      )}
      {next &&
        (next.disabled ? (
          <Button disabled data-testid="step-next">
            {next.label}
            <ArrowRight aria-hidden />
          </Button>
        ) : (
          <Button asChild>
            <Link to={next.to} data-testid="step-next">
              {next.label}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        ))}
    </div>
  );
}

/**
 * The frame of the weights and result steps: the "no project" and "no data yet" states, and
 * the decision problem the step works on.
 */
export function FlowPage({
  title,
  description,
  children,
  needsAlternatives = true,
}: {
  title: string;
  description: string;
  children: (context: FlowContext) => ReactNode;
  /** False where criteria alone are enough, as when weights come from an order of importance. */
  needsAlternatives?: boolean;
}) {
  const { t } = useTranslation('flow');
  const session = useSession();
  const document = useDocument(session);
  const dataset = useActiveDataset(document);

  let body: ReactNode;
  if (!session || !document) {
    body = (
      <Notice title={t('gate.noProject.title')} description={t('gate.noProject.description')}>
        <Button asChild>
          <Link to="/">{t('gate.noProject.action')}</Link>
        </Button>
      </Notice>
    );
  } else if (
    !dataset ||
    dataset.criteria.length === 0 ||
    (needsAlternatives && dataset.alternatives.length === 0)
  ) {
    body = (
      <Notice title={t('gate.noData.title')} description={t('gate.noData.description')}>
        <Button asChild>
          <Link to="/data">{t('gate.noData.action')}</Link>
        </Button>
      </Notice>
    );
  } else {
    // A changed decision problem starts with fresh state.
    body = <div key={dataset.id}>{children({ session, document, dataset })}</div>;
  }
  return (
    <div className="flex flex-col gap-8">
      <StepHeader
        title={title}
        description={description}
        aside={
          document && dataset ? <DatasetSwitcher document={document} dataset={dataset} /> : null
        }
      />
      {body}
    </div>
  );
}
