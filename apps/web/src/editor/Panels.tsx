import { Button } from '@mateo/ui';
import {
  addAlternative,
  addCriterion,
  composeCommands,
  moveAlternative,
  moveCriterion,
  randomId,
  removeAlternatives,
  removeCriteria,
  setCells,
  updateAlternative,
  updateCriterion,
  type CellEdit,
  type Dataset,
  type LinguisticScale,
  type ModelAlternative,
  type ModelCommand,
  type ModelCriterion,
  type ProjectSession,
} from '@mateo/project';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useTextRef } from './messages';
import { makeAlternative, makeCriterion } from './plan';
import { fieldClass, labelClass, toolbarButtonClass } from './ui';

interface PanelProps {
  readonly session: ProjectSession;
  readonly dataset: Dataset;
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
}

function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children(id)}
    </div>
  );
}

/** A text input that edits the project as you type and ends the undo step on blur. */
function TextField({
  label,
  value,
  onChange,
  session,
  multiline,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  session: ProjectSession;
  multiline?: boolean;
  invalid?: boolean;
}) {
  return (
    <Field label={label}>
      {(id) =>
        multiline ? (
          <textarea
            id={id}
            rows={2}
            className={`${fieldClass} h-auto py-1.5`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={() => session.history.sealMerge()}
          />
        ) : (
          <input
            id={id}
            className={fieldClass}
            value={value}
            aria-invalid={invalid}
            onChange={(event) => onChange(event.target.value)}
            onBlur={() => session.history.sealMerge()}
          />
        )
      }
    </Field>
  );
}

function ItemList<T extends { id: string; code: string; name: string }>({
  items,
  selectedId,
  onSelect,
  label,
  empty,
}: {
  items: readonly T[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  label: string;
  empty: string;
}) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul
      aria-label={label}
      className="max-h-52 overflow-y-auto rounded-md border border-border bg-surface"
    >
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            aria-current={item.id === selectedId}
            onClick={() => onSelect(item.id)}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted aria-[current=true]:bg-accent aria-[current=true]:text-accent-foreground"
          >
            <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
              {item.code}
            </span>
            <span className="truncate">{item.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ItemActions({
  index,
  count,
  onMove,
  onRemove,
  removeLabel,
}: {
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  const { t } = useTranslation('matrix');
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        className={toolbarButtonClass}
        aria-label={t('panels.moveUp')}
        title={t('panels.moveUp')}
        disabled={index <= 0}
        onClick={() => onMove(index - 1)}
      >
        <ArrowUp aria-hidden />
      </button>
      <button
        type="button"
        className={toolbarButtonClass}
        aria-label={t('panels.moveDown')}
        title={t('panels.moveDown')}
        disabled={index < 0 || index >= count - 1}
        onClick={() => onMove(index + 1)}
      >
        <ArrowDown aria-hidden />
      </button>
      <button
        type="button"
        className={toolbarButtonClass}
        aria-label={removeLabel}
        title={removeLabel}
        onClick={onRemove}
      >
        <Trash2 aria-hidden />
      </button>
    </div>
  );
}

export function CriteriaPanel({
  session,
  dataset,
  scales,
  selectedId,
  onSelect,
}: PanelProps & { scales: readonly LinguisticScale[] }) {
  const { t } = useTranslation('matrix');
  const textOf = useTextRef();
  const index = dataset.criteria.findIndex((item) => item.id === selectedId);
  const criterion: ModelCriterion | undefined = dataset.criteria[index];

  const patch = (changes: Partial<Omit<ModelCriterion, 'id'>>) => {
    if (!criterion) return;
    session.execute(updateCriterion(dataset.id, criterion.id, changes));
  };

  /** Switching to fuzzy numbers turns the existing numbers into (x, x, x), as one step. */
  const changeNumberType = (numberType: 'crisp' | 'tfn') => {
    if (!criterion || criterion.numberType === numberType) return;
    const commands: ModelCommand[] = [updateCriterion(dataset.id, criterion.id, { numberType })];
    const matrix = dataset.matrices[0];
    if (numberType === 'tfn' && matrix) {
      const edits: CellEdit[] = [];
      for (const [alternativeId, row] of Object.entries(matrix.cells)) {
        const cell = row[criterion.id];
        if (cell?.kind === 'crisp') {
          const x = cell.value;
          edits.push({
            alternativeId,
            criterionId: criterion.id,
            value: { kind: 'tfn', value: { l: x, m: x, u: x } },
          });
        }
      }
      if (edits.length > 0) {
        commands.push(setCells(dataset.id, matrix.id, edits));
        toast.info(t('criteria.crispToFuzzy'));
      }
    }
    session.execute(
      commands.length === 1
        ? (commands[0] as ModelCommand)
        : composeCommands(commands, {
            type: 'criterion.numberType',
            labelKey: 'project.command.criterion.update',
          }),
    );
    session.history.sealMerge();
  };

  const remove = () => {
    if (!criterion) return;
    session.execute(removeCriteria(dataset.id, [criterion.id]));
    toast(t('toast.removedColumns', { count: 1 }), {
      action: { label: t('toast.undo'), onClick: () => session.undo() },
    });
    onSelect(dataset.criteria[index + 1]?.id ?? dataset.criteria[index - 1]?.id ?? null);
  };

  return (
    <div className="flex flex-col gap-3">
      <ItemList
        items={dataset.criteria}
        selectedId={selectedId}
        onSelect={onSelect}
        label={t('panels.criteria')}
        empty={t('criteria.empty')}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => {
          const added = makeCriterion(dataset, randomId());
          session.execute(addCriterion(dataset.id, added));
          session.history.sealMerge();
          onSelect(added.id);
        }}
      >
        <Plus aria-hidden />
        {t('criteria.add')}
      </Button>
      {criterion && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <div className="grid grid-cols-[6rem_1fr] gap-2">
            <TextField
              label={t('criteria.code')}
              value={criterion.code}
              session={session}
              onChange={(code) => patch({ code })}
            />
            <TextField
              label={t('criteria.name')}
              value={criterion.name}
              session={session}
              onChange={(name) => patch({ name })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('criteria.direction')}>
              {(id) => (
                <select
                  id={id}
                  className={fieldClass}
                  value={criterion.direction}
                  onChange={(event) => {
                    patch({ direction: event.target.value as 'benefit' | 'cost' });
                    session.history.sealMerge();
                  }}
                >
                  <option value="benefit">{t('criteria.benefit')}</option>
                  <option value="cost">{t('criteria.cost')}</option>
                </select>
              )}
            </Field>
            <TextField
              label={t('criteria.unit')}
              value={criterion.unit}
              session={session}
              onChange={(unit) => patch({ unit })}
            />
          </div>
          <Field label={t('criteria.numberType')}>
            {(id) => (
              <select
                id={id}
                className={fieldClass}
                value={criterion.numberType === 'tfn' ? 'tfn' : 'crisp'}
                onChange={(event) => changeNumberType(event.target.value as 'crisp' | 'tfn')}
              >
                <option value="crisp">{t('grid.crisp')}</option>
                <option value="tfn">{t('grid.fuzzy')}</option>
              </select>
            )}
          </Field>
          <Field label={t('criteria.scale')}>
            {(id) => (
              <select
                id={id}
                className={fieldClass}
                disabled={criterion.numberType !== 'tfn'}
                value={criterion.scaleId ?? ''}
                onChange={(event) => {
                  patch({ scaleId: event.target.value === '' ? null : event.target.value });
                  session.history.sealMerge();
                }}
              >
                <option value="">{t('criteria.noScale')}</option>
                {scales.map((scale) => (
                  <option key={scale.id} value={scale.id}>
                    {textOf(scale.name)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Link
            to="/settings/scales"
            className="self-start text-xs text-primary underline-offset-2 hover:underline"
          >
            {t('criteria.manageScales')}
          </Link>
          <TextField
            label={t('criteria.description')}
            value={criterion.description}
            session={session}
            multiline
            onChange={(description) => patch({ description })}
          />
          <ItemActions
            index={index}
            count={dataset.criteria.length}
            onMove={(to) => {
              session.execute(moveCriterion(dataset.id, criterion.id, to));
              session.history.sealMerge();
            }}
            onRemove={remove}
            removeLabel={t('criteria.remove')}
          />
        </div>
      )}
    </div>
  );
}

export function AlternativesPanel({ session, dataset, selectedId, onSelect }: PanelProps) {
  const { t } = useTranslation('matrix');
  const index = dataset.alternatives.findIndex((item) => item.id === selectedId);
  const alternative: ModelAlternative | undefined = dataset.alternatives[index];

  const patch = (changes: Partial<Omit<ModelAlternative, 'id'>>) => {
    if (!alternative) return;
    session.execute(updateAlternative(dataset.id, alternative.id, changes));
  };

  const remove = () => {
    if (!alternative) return;
    session.execute(removeAlternatives(dataset.id, [alternative.id]));
    toast(t('toast.removedRows', { count: 1 }), {
      action: { label: t('toast.undo'), onClick: () => session.undo() },
    });
    onSelect(dataset.alternatives[index + 1]?.id ?? dataset.alternatives[index - 1]?.id ?? null);
  };

  return (
    <div className="flex flex-col gap-3">
      <ItemList
        items={dataset.alternatives}
        selectedId={selectedId}
        onSelect={onSelect}
        label={t('panels.alternatives')}
        empty={t('alternatives.empty')}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => {
          const added = makeAlternative(dataset, randomId());
          session.execute(addAlternative(dataset.id, added));
          session.history.sealMerge();
          onSelect(added.id);
        }}
      >
        <Plus aria-hidden />
        {t('alternatives.add')}
      </Button>
      {alternative && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <div className="grid grid-cols-[6rem_1fr] gap-2">
            <TextField
              label={t('alternatives.code')}
              value={alternative.code}
              session={session}
              onChange={(code) => patch({ code })}
            />
            <TextField
              label={t('alternatives.name')}
              value={alternative.name}
              session={session}
              onChange={(name) => patch({ name })}
            />
          </div>
          <TextField
            label={t('alternatives.group')}
            value={alternative.group}
            session={session}
            onChange={(group) => patch({ group })}
          />
          <TextField
            label={t('alternatives.description')}
            value={alternative.description}
            session={session}
            multiline
            onChange={(description) => patch({ description })}
          />
          <ItemActions
            index={index}
            count={dataset.alternatives.length}
            onMove={(to) => {
              session.execute(moveAlternative(dataset.id, alternative.id, to));
              session.history.sealMerge();
            }}
            onRemove={remove}
            removeLabel={t('alternatives.remove')}
          />
        </div>
      )}
    </div>
  );
}
