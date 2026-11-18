import type { Trace } from '@mateo/engine';
import { symbolicLatex } from '@mateo/explain';
import { Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@mateo/ui';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { useMessage, useTextRef } from '../editor/messages';
import { explanationOf, ExplainPanel } from '../explain/ExplainPanel';
import { Disclosure } from '../flow/parts';
import { Formula } from '../explain/Formula';
import { NotFoundPage } from '../routes/NotFoundPage';
import { PageHeader } from '../routes/PageHeader';
import { TraceTables } from '../workspace/TraceTables';
import {
  findLibraryPage,
  libraryPath,
  type LibraryPage,
  type LibraryVariant,
  type Reference,
} from './methods';
import { runLessonExample } from './lessonExamples';
import { runSample, sampleFixture } from './samples';
import { SampleActions } from './SampleActions';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={`section-${id}`}
      aria-labelledby={`heading-${id}`}
      className="scroll-mt-20 space-y-3"
    >
      <h2 id={`heading-${id}`} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** The formulas of every step, read from the trace so that they are the implemented ones. */
function StepsAndFormulas({ trace }: { trace: Trace }) {
  const { t } = useTranslation('library');
  const message = useMessage();
  const textOf = useTextRef();
  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-muted-foreground">{t('page.stepsText')}</p>
      <ol className="space-y-4" data-testid="library-steps">
        {trace.steps.map((step) => (
          <li
            key={step.id}
            className="space-y-2 rounded-lg border border-border bg-surface p-4"
            data-testid={`library-step-${step.id}`}
          >
            <h3 className="text-sm font-semibold">
              <span className="mr-2 text-muted-foreground tabular-nums">{step.index + 1}.</span>
              {message(step.nameKey)}
            </h3>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {message(step.explanationKey, step.explanationParams)}
            </p>
            {step.formulas.map((formula) => (
              <div
                key={formula.id}
                className="space-y-1"
                data-testid={`library-formula-${step.id}`}
              >
                {formula.condition && (
                  <p className="text-xs text-muted-foreground">
                    {t('page.formulaWhen', { condition: textOf(formula.condition) })}
                  </p>
                )}
                <Formula display latex={symbolicLatex(formula)} />
                {formula.terms.some((term) => term.description) && (
                  <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                    {formula.terms
                      .filter((term) => term.description)
                      .map((term) => (
                        <div key={term.name} className="flex items-baseline gap-1.5">
                          <dt>
                            <Formula latex={term.latex} />
                          </dt>
                          <dd>{textOf(term.description!)}</dd>
                        </div>
                      ))}
                  </dl>
                )}
              </div>
            ))}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The paper's worked example: every table of its run, with the source it was taken from. */
function PaperExample({ sampleId, trace }: { sampleId: LibraryVariant['sampleId']; trace: Trace }) {
  const { t } = useTranslation('library');
  const fixture = sampleFixture(sampleId);
  return (
    <div className="space-y-3">
      <p className="max-w-3xl text-sm text-muted-foreground">
        {t('example.text', {
          citation: `${fixture.source.citation} (${fixture.source.doi}). ${t(
            `example.source.${fixture.source.role === 'original' ? 'original' : 'substitute'}`,
          )}`,
        })}{' '}
        {t('example.location', { location: fixture.source.location })}
      </p>
      <TraceTables trace={trace} />
    </div>
  );
}

function ReferenceList({ references }: { references: readonly Reference[] }) {
  const { t } = useTranslation('library');
  return (
    <ul className="space-y-3" data-testid="library-references">
      {references.map((reference) => (
        <li key={reference.doi} className="max-w-3xl text-sm">
          <Badge variant="outline" className="mr-2">
            {t(`role.${reference.role}`)}
          </Badge>
          <span translate="no">{reference.citation}</span>{' '}
          <a
            href={`https://doi.org/${reference.doi}`}
            target="_blank"
            rel="noreferrer noopener"
            translate="no"
            className="inline-flex items-center gap-1 font-medium text-primary underline"
          >
            DOI {reference.doi}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Inputs, formulas, the paper's example, sample data, edge cases and references. */
function Reference({ page, variant }: { page: LibraryPage; variant: LibraryVariant }) {
  const { t } = useTranslation('library');
  const { sampleId } = variant;
  // The paper's example runs with the real method whenever the reference is opened.
  const record = useMemo(() => runSample(sampleId), [sampleId]);
  // The entries of a variant are named by `methods.ts`, so their keys are built from data.
  const text = t as unknown as (key: string) => string;
  const key = `variants.${sampleId}`;
  return (
    <div className="space-y-10" data-testid={`library-reference-${sampleId}`}>
      <Section id={`introduction-${sampleId}`} title={t('page.section.introduction')}>
        <p className="max-w-3xl text-sm">{t(`pages.${page.id}.introduction`)}</p>
      </Section>
      <Section id={`inputs-${sampleId}`} title={t('page.section.inputs')}>
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {variant.inputs.map((input) => (
            <li key={input} className="max-w-3xl">
              {text(`${key}.inputs.${input}`)}
            </li>
          ))}
        </ul>
      </Section>
      <Section id={`numberTypes-${sampleId}`} title={t('page.section.numberTypes')}>
        <p className="max-w-3xl text-sm">{text(`${key}.numberTypes`)}</p>
      </Section>
      <Section id={`steps-${sampleId}`} title={t('page.section.steps')}>
        <StepsAndFormulas trace={record.trace} />
      </Section>
      <Section id={`example-${sampleId}`} title={t('page.section.example')}>
        <PaperExample sampleId={sampleId} trace={record.trace} />
      </Section>
      <Section id={`sample-${sampleId}`} title={t('page.section.sample')}>
        <SampleActions sampleId={sampleId} />
      </Section>
      <Section id={`notes-${sampleId}`} title={t('page.section.notes')}>
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {variant.notes.map((note) => (
            <li key={note} className="max-w-3xl">
              {text(`${key}.notes.${note}`)}
            </li>
          ))}
        </ul>
      </Section>
      <Section id={`references-${sampleId}`} title={t('page.section.references')}>
        <ReferenceList references={variant.references} />
      </Section>
    </div>
  );
}

/** One variant of a method: its lesson on the phone example, then the reference on request. */
function VariantBody({ page, variant }: { page: LibraryPage; variant: LibraryVariant }) {
  const { t } = useTranslation('library');
  const { sampleId } = variant;
  const record = useMemo(() => runLessonExample(sampleId), [sampleId]);
  const explanation = useMemo(() => explanationOf(record.trace), [record]);
  return (
    <div className="space-y-8" data-testid={`library-variant-${sampleId}`}>
      <Section id={`lesson-${sampleId}`} title={t('page.section.lesson')}>
        <p className="max-w-3xl text-sm text-muted-foreground" data-testid="lesson-example">
          {t(`lessonExample.${sampleId}`)}
        </p>
        {explanation && (
          <div className="rounded-xl border border-border bg-surface/60 p-4 sm:p-5">
            <ExplainPanel
              trace={record.trace}
              explanation={explanation}
              finish={
                <>
                  <Button variant="outline" asChild>
                    <Link to={libraryPath()}>{t('lesson.moreLessons')}</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/" data-testid="lesson-own-data">
                      {t('lesson.ownData')}
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </>
              }
            />
          </div>
        )}
      </Section>
      <Disclosure
        title={t('page.reference')}
        hint={t('page.referenceHint')}
        testId={`library-reference-toggle-${sampleId}`}
      >
        <Reference page={page} variant={variant} />
      </Disclosure>
    </div>
  );
}

function PageBody({ page }: { page: LibraryPage }) {
  const { t } = useTranslation('library');
  const [selected, setSelected] = useState<string>(page.variants[0]!.sampleId);
  const variants = page.variants;
  return (
    <div className="space-y-8">
      <p className="max-w-3xl text-sm" data-testid="library-purpose">
        {t(`pages.${page.id}.purpose`)}
      </p>
      {variants.length > 1 ? (
        <Tabs value={selected} onValueChange={setSelected} className="space-y-6">
          <TabsList aria-label={t('page.variant')}>
            {variants.map((variant) => (
              <TabsTrigger key={variant.sampleId} value={variant.sampleId}>
                {t(`variants.${variant.sampleId}.label`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {variants.map((variant) => (
            <TabsContent key={variant.sampleId} value={variant.sampleId}>
              <VariantBody page={page} variant={variant} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <VariantBody page={page} variant={variants[0]!} />
      )}
      <Section id="related" title={t('page.section.related')}>
        <ul className="flex flex-wrap gap-2" data-testid="library-related">
          {page.related.map((id) => (
            <li key={id}>
              <Link
                to={libraryPath(id)}
                className="inline-flex rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-primary hover:border-primary"
              >
                {t(`pages.${id}.title`)}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

/**
 * One method of the library: what it is for, a lesson on a small example, and the reference
 * of docs/phases/phase-1.md (P1.17) behind a fold.
 */
export function MethodPage() {
  const { t } = useTranslation('library');
  const { pageId } = useParams();
  const page = findLibraryPage(pageId);
  if (!page) return <NotFoundPage />;
  const numberTypes = [
    ...new Set(page.variants.map((variant) => (variant.fuzzy ? 'tfn' : 'crisp'))),
  ];
  return (
    <div className="flex flex-col" data-testid={`library-page-${page.id}`}>
      <Link
        to={libraryPath()}
        className="mb-4 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('page.back')}
      </Link>
      <PageHeader
        title={t(`pages.${page.id}.title`)}
        description={t(`pages.${page.id}.summary`)}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant="accent">{t(`family.${page.family}`)}</Badge>
            {numberTypes.map((type) => (
              <Badge key={type} variant="outline">
                {t(`numberType.${type}`)}
              </Badge>
            ))}
          </div>
        }
      />
      <PageBody key={page.id} page={page} />
    </div>
  );
}
