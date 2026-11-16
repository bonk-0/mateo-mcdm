import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mateo/ui';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { parseNumber, type NumberSyntax } from './numbers';
import type { BulkOperation } from './plan';
import { fieldClass, labelClass } from './ui';

type Kind = BulkOperation['kind'] | 'clear';

/** Applies one operation to every selected cell. */
export function BulkEditDialog({
  open,
  count,
  syntax,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  count: number;
  syntax: NumberSyntax;
  onOpenChange: (open: boolean) => void;
  onApply: (operation: BulkOperation) => void;
}) {
  const { t } = useTranslation('matrix');
  const [kind, setKind] = useState<Kind>('set');
  const [text, setText] = useState('');
  const [failed, setFailed] = useState(false);
  const kindId = useId();
  const valueId = useId();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (kind === 'clear') {
      onApply({ kind: 'set', text: '' });
    } else if (kind === 'set') {
      onApply({ kind: 'set', text });
    } else {
      const amount = parseNumber(text, syntax);
      if (amount === undefined) {
        setFailed(true);
        return;
      }
      onApply({ kind, amount });
    }
    setFailed(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t('bulk.title')}</DialogTitle>
            <DialogDescription>{t('bulk.description', { count })}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={kindId} className={labelClass}>
              {t('bulk.operation')}
            </label>
            <select
              id={kindId}
              className={fieldClass}
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as Kind);
                setFailed(false);
              }}
            >
              <option value="set">{t('bulk.set')}</option>
              <option value="add">{t('bulk.add')}</option>
              <option value="multiply">{t('bulk.multiply')}</option>
              <option value="clear">{t('bulk.clear')}</option>
            </select>
          </div>
          {kind !== 'clear' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={valueId} className={labelClass}>
                {t(kind === 'set' ? 'bulk.value' : 'bulk.amount')}
              </label>
              <input
                id={valueId}
                className={fieldClass}
                value={text}
                aria-invalid={failed}
                onChange={(event) => setText(event.target.value)}
              />
              {failed && (
                <p role="alert" className="text-xs text-danger">
                  {t('bulk.invalidAmount')}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('bulk.cancel')}
            </Button>
            <Button type="submit">{t('bulk.apply')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
