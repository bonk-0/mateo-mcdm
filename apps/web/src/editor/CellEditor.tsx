import type { CellValue, LinguisticScale, ModelCriterion, TfnValue } from '@mateo/project';
import { useGridCellEditor, type CustomCellEditorProps } from 'ag-grid-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { isOrdered, parseCellText, type ParseFailure, type TermLabel } from './cellText';
import { formatEditNumber, parseNumber, type NumberSyntax } from './numbers';
import type { GridRow } from './rows';
import { useMessage } from './messages';

/** What an editor hands to the grid: a cell value, `null` to empty the cell, or a refusal. */
export type EditResult = CellValue | null | typeof REFUSED;
export const REFUSED = Symbol('refused');

export interface CellEditorContext {
  readonly criterion: ModelCriterion;
  readonly scale: LinguisticScale | undefined;
  readonly syntax: NumberSyntax;
  readonly label: TermLabel;
}

type Problem = ParseFailure | 'incomplete' | null;

interface Draft {
  readonly mode: 'text' | 'tfn' | 'term';
  readonly text: string;
  readonly parts: readonly [string, string, string];
  readonly termId: string;
}

function initialDraft(
  cell: CellValue | undefined,
  context: CellEditorContext,
  eventKey: string | null,
): Draft {
  const { criterion, scale, syntax } = context;
  const typed = eventKey !== null && eventKey.length === 1 ? eventKey : '';
  if (criterion.numberType === 'crisp') {
    return {
      mode: 'text',
      text: typed || (cell?.kind === 'crisp' ? formatEditNumber(cell.value, syntax) : ''),
      parts: ['', '', ''],
      termId: '',
    };
  }
  const tfn: TfnValue | undefined = cell?.kind === 'tfn' ? cell.value : undefined;
  const parts: [string, string, string] = tfn
    ? ([tfn.l, tfn.m, tfn.u].map((n) => formatEditNumber(n, syntax)) as [string, string, string])
    : ['', '', ''];
  const startsNumber = typed !== '' && /[\d.,+\-−]/u.test(typed);
  const termMode =
    scale !== undefined && (cell?.kind === 'term' || (cell === undefined && !startsNumber));
  if (startsNumber) parts[0] = typed;
  return {
    mode: termMode ? 'term' : 'tfn',
    text: '',
    parts,
    termId: cell?.kind === 'term' ? cell.termId : '',
  };
}

function evaluate(
  draft: Draft,
  context: CellEditorContext,
): { result: CellValue | null; problem: Problem } {
  const { criterion, scale, syntax, label } = context;
  if (draft.mode === 'text') {
    const parsed = parseCellText(draft.text, criterion, scale, syntax, label);
    return parsed.ok
      ? { result: parsed.value, problem: null }
      : { result: null, problem: parsed.reason };
  }
  if (draft.mode === 'term') {
    return draft.termId === ''
      ? { result: null, problem: null }
      : { result: { kind: 'term', termId: draft.termId }, problem: null };
  }
  const filled = draft.parts.map((part) => part.trim() !== '');
  if (filled.every((flag) => !flag)) return { result: null, problem: null };
  if (!filled.every(Boolean)) return { result: null, problem: 'incomplete' };
  const numbers = draft.parts.map((part) => parseNumber(part, syntax));
  const [l, m, u] = numbers;
  if (l === undefined || m === undefined || u === undefined) {
    return { result: null, problem: 'number' };
  }
  const value = { l, m, u };
  return isOrdered(value)
    ? { result: { kind: 'tfn', value }, problem: null }
    : { result: null, problem: 'tfnOrder' };
}

/**
 * The editor of one matrix cell, opened in a popup: one input for crisp values; for
 * triangular numbers three inputs (l, m, u) with the rule l ≤ m ≤ u checked as you type,
 * and, when the criterion has a linguistic scale, a drop-down of its terms.
 */
export function MatrixCellEditor(
  props: CustomCellEditorProps<GridRow, string | EditResult> & { matrixContext: CellEditorContext },
) {
  const { data, column, eventKey, onValueChange, onKeyDown } = props;
  const context = props.matrixContext;
  const { t } = useTranslation('matrix');
  const message = useMessage();
  const cell = data.cells[column.getColId()];
  const [draft, setDraft] = useState<Draft>(() => initialDraft(cell, context, eventKey));
  const { result, problem } = useMemo(() => evaluate(draft, context), [draft, context]);
  const lRef = useRef<HTMLInputElement>(null);
  const mRef = useRef<HTMLInputElement>(null);
  const uRef = useRef<HTMLInputElement>(null);
  const refs = [lRef, mRef, uRef] as const;
  const selectRef = useRef<HTMLSelectElement>(null);
  const errorId = useId();

  const text =
    problem === null
      ? null
      : problem === 'tfnOrder'
        ? message('validation.tfn.invalid-order', tfnParams(draft, context.syntax))
        : t(`editor.problem.${problem}`);

  useEffect(() => {
    onValueChange(problem === null ? result : REFUSED);
  }, [problem, result, onValueChange]);

  useGridCellEditor({
    getValidationErrors: () => (text === null ? null : [text]),
    getValidationElement: () => (draft.mode === 'term' ? selectRef.current : lRef.current),
  });

  useLayoutEffect(() => {
    const target = draft.mode === 'term' ? selectRef.current : lRef.current;
    target?.focus();
    if (target instanceof HTMLInputElement && (eventKey === null || eventKey.length !== 1)) {
      target.select();
    }
    // Focus once, when the editor opens.
  }, []);

  const keyDown = (event: KeyboardEvent<HTMLElement>) => {
    const index = refs.findIndex((ref) => ref.current === event.target);
    if (event.key === 'Tab' && draft.mode === 'tfn') {
      const next = index + (event.shiftKey ? -1 : 1);
      if (next >= 0 && next <= 2) {
        event.preventDefault();
        event.stopPropagation();
        refs[next]?.current?.focus();
        refs[next]?.current?.select();
        return;
      }
    }
    if ((event.key === 'Enter' || event.key === 'Tab') && text !== null) {
      // The cell stays open until the value is valid; Escape still cancels.
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (['Enter', 'Tab', 'Escape'].includes(event.key)) {
      onKeyDown(event.nativeEvent);
    }
  };

  const inputClass =
    'h-8 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-sm text-foreground aria-[invalid=true]:border-danger';
  const names = ['l', 'm', 'u'] as const;

  return (
    <div
      className="flex w-64 flex-col gap-2 rounded-lg border border-border bg-surface p-3 shadow-lg"
      onKeyDown={keyDown}
    >
      {draft.mode === 'text' && (
        <input
          ref={lRef}
          className={inputClass}
          inputMode="decimal"
          aria-label={t('editor.value')}
          aria-invalid={problem !== null}
          aria-describedby={text ? errorId : undefined}
          value={draft.text}
          onChange={(event) => setDraft({ ...draft, text: event.target.value })}
        />
      )}
      {draft.mode === 'tfn' && (
        <div className="flex gap-1.5" role="group" aria-label={t('editor.tfn')}>
          {names.map((name, index) => (
            <input
              key={name}
              ref={refs[index]}
              className={inputClass}
              inputMode="decimal"
              aria-label={t(`editor.part.${name}`)}
              placeholder={name}
              aria-invalid={problem !== null && problem !== 'incomplete'}
              aria-describedby={text ? errorId : undefined}
              value={draft.parts[index]}
              onChange={(event) => {
                const parts = [...draft.parts] as [string, string, string];
                parts[index] = event.target.value;
                setDraft({ ...draft, parts });
              }}
            />
          ))}
        </div>
      )}
      {draft.mode === 'term' && context.scale && (
        <select
          ref={selectRef}
          className={inputClass}
          aria-label={t('editor.term')}
          value={draft.termId}
          onChange={(event) => setDraft({ ...draft, termId: event.target.value })}
        >
          <option value="">{t('editor.noTerm')}</option>
          {context.scale.terms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.abbreviation} — {context.label(term)}
            </option>
          ))}
        </select>
      )}
      {text && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {text}
        </p>
      )}
      {context.criterion.numberType === 'tfn' && context.scale && (
        <button
          type="button"
          className="self-start text-xs text-primary underline-offset-2 hover:underline"
          onClick={() =>
            setDraft({
              ...draft,
              mode: draft.mode === 'term' ? 'tfn' : 'term',
            })
          }
        >
          {draft.mode === 'term' ? t('editor.useTfn') : t('editor.useTerm')}
        </button>
      )}
    </div>
  );
}

function tfnParams(draft: Draft, syntax: NumberSyntax): Record<string, number> {
  const [l, m, u] = draft.parts.map((part) => parseNumber(part, syntax) ?? 0);
  return { l: l ?? 0, m: m ?? 0, u: u ?? 0 };
}
