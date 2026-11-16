import { checkLinguisticScale, PREDEFINED_SCALES } from '@mateo/fuzzy';
import {
  putScale,
  randomId,
  removeScale,
  type LinguisticScale,
  type ProjectSession,
  type ScaleTerm,
} from '@mateo/project';
import { Button } from '@mateo/ui';
import { ArrowDown, ArrowUp, FilePlus2, FolderOpen, Plus, Ruler, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { runCommand } from '../commands/commands';
import { useFormatters } from '../hooks/preferences';
import { PageHeader } from '../routes/PageHeader';
import { EmptyState } from './EditorPage';
import { projectScaleFrom, uniqueScaleId } from './projectScale';
import { MembershipChart } from './MembershipChart';
import { useMessage, useTextRef } from './messages';
import { formatEditNumber, parseNumber, syntaxForLocale, type NumberSyntax } from './numbers';
import { useDocument, useSession } from './session';
import { fieldClass, labelClass, toolbarButtonClass } from './ui';

export function ScaleManagerPage() {
  const { t } = useTranslation(['matrix', 'nav']);
  const session = useSession();
  const document = useDocument(session);
  return (
    <div className="flex flex-col">
      <PageHeader
        title={t('nav:items.scales.title')}
        description={t('matrix:scales.description')}
      />
      {session && document ? (
        <ScaleManager
          session={session}
          scales={document.model.scales}
          datasets={document.model.datasets}
        />
      ) : (
        <EmptyState
          icon={<Ruler className="size-8" aria-hidden />}
          title={t('matrix:page.noProject.title')}
          description={t('matrix:page.noProject.description')}
        >
          <Button onClick={() => runCommand('file.new')}>
            <FilePlus2 aria-hidden />
            {t('matrix:page.new')}
          </Button>
          <Button variant="outline" onClick={() => runCommand('file.open')}>
            <FolderOpen aria-hidden />
            {t('matrix:page.open')}
          </Button>
        </EmptyState>
      )}
    </div>
  );
}

function ScaleManager({
  session,
  scales,
  datasets,
}: {
  session: ProjectSession;
  scales: readonly LinguisticScale[];
  datasets: readonly { criteria: readonly { scaleId: string | null }[] }[];
}) {
  const { t } = useTranslation('matrix');
  const textOf = useTextRef();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [predefinedId, setPredefinedId] = useState(PREDEFINED_SCALES[0]?.id ?? '');
  const selected = scales.find((scale) => scale.id === selectedId) ?? scales[0];
  const predefinedSelectId = useId();

  const alreadyAdded = scales.some((scale) => scale.sourceId === predefinedId);

  const addPredefined = () => {
    const source = PREDEFINED_SCALES.find((item) => item.id === predefinedId);
    if (!source) return;
    const scale = projectScaleFrom(source, uniqueScaleId(source.id, scales));
    session.execute(putScale(scale));
    session.history.sealMerge();
    setSelectedId(scale.id);
  };

  const addCustom = () => {
    const terms: ScaleTerm[] = [1, 2, 3].map((n) => ({
      id: `term-${n}`,
      label: { text: t('scales.defaultTerm', { n }) },
      abbreviation: `T${n}`,
      value: { l: n, m: n + 1, u: n + 2 },
    }));
    const scale: LinguisticScale = {
      id: randomId(),
      name: { text: t('scales.defaultName') },
      sourceId: null,
      numberType: 'tfn',
      terms,
    };
    session.execute(putScale(scale));
    session.history.sealMerge();
    setSelectedId(scale.id);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <div className="flex flex-col gap-4">
        <section aria-labelledby="scale-list" className="flex flex-col gap-2">
          <h2 id="scale-list" className="text-sm font-semibold">
            {t('scales.list')}
          </h2>
          {scales.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('scales.empty')}</p>
          ) : (
            <ul className="rounded-md border border-border bg-surface">
              {scales.map((scale) => (
                <li key={scale.id}>
                  <button
                    type="button"
                    aria-current={scale.id === selected?.id}
                    onClick={() => setSelectedId(scale.id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted aria-[current=true]:bg-accent aria-[current=true]:text-accent-foreground"
                  >
                    <span className="truncate">{textOf(scale.name)}</span>
                    <span className="text-xs text-muted-foreground">
                      {scale.sourceId ? t('scales.predefined') : t('scales.custom')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
          <label htmlFor={predefinedSelectId} className={labelClass}>
            {t('scales.pickPredefined')}
          </label>
          <select
            id={predefinedSelectId}
            className={fieldClass}
            value={predefinedId}
            onChange={(event) => setPredefinedId(event.target.value)}
          >
            {PREDEFINED_SCALES.map((scale) => (
              <option key={scale.id} value={scale.id}>
                {textOf(scale.name)}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPredefined}
            disabled={alreadyAdded}
          >
            <Plus aria-hidden />
            {alreadyAdded ? t('scales.alreadyAdded') : t('scales.addPredefined')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={addCustom}>
            <Plus aria-hidden />
            {t('scales.create')}
          </Button>
        </section>
      </div>
      {selected ? (
        <ScaleEditor
          key={selected.id}
          session={session}
          scale={selected}
          usedBy={datasets.reduce(
            (count, dataset) =>
              count +
              dataset.criteria.filter((criterion) => criterion.scaleId === selected.id).length,
            0,
          )}
          onRemoved={() => setSelectedId(null)}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t('scales.empty')}</p>
      )}
    </div>
  );
}

/** A number input that keeps what you type until it is a valid number. */
function NumberField({
  label,
  value,
  syntax,
  onCommit,
}: {
  label: string;
  value: number;
  syntax: NumberSyntax;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(() => formatEditNumber(value, syntax));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(formatEditNumber(value, syntax));
  }, [value, syntax, focused]);
  const parsed = parseNumber(text, syntax);
  return (
    <input
      className={`${fieldClass} h-8 w-16! px-1.5 text-right`}
      inputMode="decimal"
      aria-label={label}
      aria-invalid={parsed === undefined}
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(event) => {
        setText(event.target.value);
        const next = parseNumber(event.target.value, syntax);
        if (next !== undefined) onCommit(next);
      }}
    />
  );
}

function ScaleEditor({
  session,
  scale,
  usedBy,
  onRemoved,
}: {
  session: ProjectSession;
  scale: LinguisticScale;
  usedBy: number;
  onRemoved: () => void;
}) {
  const { t } = useTranslation('matrix');
  const message = useMessage();
  const textOf = useTextRef();
  const formatters = useFormatters();
  const syntax = useMemo(() => syntaxForLocale(formatters.numberLocale), [formatters.numberLocale]);
  const nameId = useId();

  const issues = useMemo(() => {
    const result = checkLinguisticScale({ ...scale, kind: 'rating' });
    return [...result.errors, ...result.warnings];
  }, [scale]);

  const update = (next: LinguisticScale) => session.execute(putScale(next));
  const seal = () => session.history.sealMerge();
  const setTerm = (index: number, patch: Partial<ScaleTerm>) =>
    update({
      ...scale,
      terms: scale.terms.map((term, i) => (i === index ? { ...term, ...patch } : term)),
    });
  const moveTerm = (from: number, to: number) => {
    if (to < 0 || to >= scale.terms.length) return;
    const terms = [...scale.terms];
    const [moved] = terms.splice(from, 1);
    terms.splice(to, 0, moved as ScaleTerm);
    update({ ...scale, terms });
    seal();
  };

  return (
    <section className="flex min-w-0 flex-col gap-5" aria-label={textOf(scale.name)}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-60 flex-1 flex-col gap-1">
          <label htmlFor={nameId} className={labelClass}>
            {t('scales.name')}
          </label>
          <input
            id={nameId}
            className={fieldClass}
            value={textOf(scale.name)}
            onChange={(event) => update({ ...scale, name: { text: event.target.value } })}
            onBlur={seal}
          />
        </div>
        <p className="pb-2 text-xs text-muted-foreground">
          {t('scales.usedBy', { count: usedBy })}
        </p>
        <button
          type="button"
          className={toolbarButtonClass}
          aria-label={t('scales.remove')}
          title={t('scales.remove')}
          onClick={() => {
            const name = textOf(scale.name);
            session.execute(removeScale(scale.id));
            seal();
            onRemoved();
            toast(t('scales.removed', { name }), {
              action: { label: t('toast.undo'), onClick: () => session.undo() },
            });
          }}
        >
          <Trash2 aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">{t('scales.terms')}</h2>
        <p className="text-xs text-muted-foreground">{t('scales.termsHint')}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-1 pr-2 font-medium">{t('scales.term.abbreviation')}</th>
                <th className="py-1 pr-2 font-medium">{t('scales.term.label')}</th>
                <th className="py-1 pr-1 text-right font-medium">{t('scales.term.l')}</th>
                <th className="py-1 pr-1 text-right font-medium">{t('scales.term.m')}</th>
                <th className="py-1 pr-2 text-right font-medium">{t('scales.term.u')}</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {scale.terms.map((term, index) => (
                <tr key={term.id} className="align-middle">
                  <td className="py-1 pr-2">
                    <input
                      className={`${fieldClass} h-8 w-20! px-1.5`}
                      aria-label={`${t('scales.term.abbreviation')} ${index + 1}`}
                      value={term.abbreviation}
                      onChange={(event) => setTerm(index, { abbreviation: event.target.value })}
                      onBlur={seal}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      className={`${fieldClass} h-8 px-1.5`}
                      aria-label={`${t('scales.term.label')} ${index + 1}`}
                      value={textOf(term.label)}
                      onChange={(event) => setTerm(index, { label: { text: event.target.value } })}
                      onBlur={seal}
                    />
                  </td>
                  {(['l', 'm', 'u'] as const).map((part) => (
                    <td key={part} className="py-1 pr-1">
                      <NumberField
                        label={`${t(`scales.term.${part}`)} ${index + 1}`}
                        value={term.value[part]}
                        syntax={syntax}
                        onCommit={(value) =>
                          setTerm(index, { value: { ...term.value, [part]: value } })
                        }
                      />
                    </td>
                  ))}
                  <td className="py-1">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className={toolbarButtonClass}
                        aria-label={`${t('scales.term.moveUp')} ${index + 1}`}
                        title={t('scales.term.moveUp')}
                        disabled={index === 0}
                        onClick={() => moveTerm(index, index - 1)}
                      >
                        <ArrowUp aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={toolbarButtonClass}
                        aria-label={`${t('scales.term.moveDown')} ${index + 1}`}
                        title={t('scales.term.moveDown')}
                        disabled={index === scale.terms.length - 1}
                        onClick={() => moveTerm(index, index + 1)}
                      >
                        <ArrowDown aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={toolbarButtonClass}
                        aria-label={`${t('scales.term.remove')} ${index + 1}`}
                        title={t('scales.term.remove')}
                        onClick={() => {
                          update({ ...scale, terms: scale.terms.filter((_, i) => i !== index) });
                          seal();
                        }}
                      >
                        <Trash2 aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => {
            let n = scale.terms.length + 1;
            while (scale.terms.some((term) => term.id === `term-${n}`)) n += 1;
            const last = scale.terms.at(-1)?.value ?? { l: 0, m: 0, u: 1 };
            const term: ScaleTerm = {
              id: `term-${n}`,
              label: { text: t('scales.defaultTerm', { n }) },
              abbreviation: `T${n}`,
              value: { l: last.m, m: last.u, u: last.u + (last.u - last.m || 1) },
            };
            update({ ...scale, terms: [...scale.terms, term] });
            seal();
          }}
        >
          <Plus aria-hidden />
          {t('scales.term.add')}
        </Button>
      </div>

      <div role="status" className="flex flex-col gap-1 text-sm" data-testid="scale-status">
        {issues.length === 0 ? (
          <p className="text-success">{t('scales.valid')}</p>
        ) : (
          <>
            <p className="font-medium text-danger">{t('scales.problems')}</p>
            <ul className="list-disc pl-5 text-danger">
              {issues.map((issue, index) => (
                <li key={`${issue.code}-${index}`}>{message(issue.messageKey, issue.params)}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">{t('scales.preview')}</h2>
        <p className="text-xs text-muted-foreground">{t('scales.chart.description')}</p>
        <MembershipChart scale={scale} numberFormat={(value) => formatters.number(value)} />
      </div>
    </section>
  );
}
