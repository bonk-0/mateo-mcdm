import { SUPPORTED_LANGUAGES, LANGUAGE_NATIVE_NAMES } from '@mateo/i18n';
import { fileNameOf, writeCsv, writeCsvZip, writeXlsx, type ExportLanguage } from '@mateo/io';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@mateo/ui';
import { Download } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { fieldClass, labelClass } from '../editor/ui';
import { useEffectiveLanguage } from '../hooks/preferences';
import { CSV_MEDIA_TYPE, saveBytes, XLSX_MEDIA_TYPE, ZIP_MEDIA_TYPE } from './download';
import type { ExportBundle, ExportSource } from './sources';

type Format = 'xlsx' | 'csv' | 'zip';

const FORMATS: readonly Format[] = ['xlsx', 'csv', 'zip'];

/**
 * An "Export" button that opens a small dialog: format (workbook, one CSV, ZIP of CSVs),
 * language of the file and, for one CSV, which table. The tables come from `source`.
 */
export function ExportButton({
  source,
  hint,
  variant = 'outline',
  testId = 'export-button',
}: {
  source: ExportSource;
  /** Extra sentence under the description. */
  hint?: string;
  variant?: 'primary' | 'outline' | 'ghost';
  testId?: string;
}) {
  const { t } = useTranslation('export');
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} data-testid={testId}>
          <Download aria-hidden />
          {t('button')}
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="export-dialog">
        {open && <ExportForm source={source} hint={hint} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

/** The export dialog without its button, for callers that open it from a menu. */
export function ExportDialog({
  source,
  hint,
  onClose,
}: {
  source: ExportSource;
  hint?: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-testid="export-dialog">
        <ExportForm source={source} hint={hint} onDone={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function ExportForm({
  source,
  hint,
  onDone,
}: {
  source: ExportSource;
  hint: string | undefined;
  onDone: () => void;
}) {
  const { t } = useTranslation('export');
  const screenLanguage = useEffectiveLanguage();
  const [format, setFormat] = useState<Format>('xlsx');
  const [language, setLanguage] = useState<ExportLanguage>(screenLanguage);
  const [bundle, setBundle] = useState<ExportBundle | null>(null);
  const [tableId, setTableId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const ids = { format: useId(), language: useId(), table: useId() };

  // The tables are listed in the chosen language, so they are prepared again when it changes.
  useEffect(() => {
    let current = true;
    setBundle(null);
    source(language).then(
      (next) => {
        if (!current) return;
        setBundle(next);
        setTableId((previous) =>
          next.tables.some((table) => table.id === previous)
            ? previous
            : (next.tables[0]?.id ?? ''),
        );
      },
      (error: unknown) => {
        if (current) toast.error(t('failed', { message: String(error) }));
      },
    );
    return () => {
      current = false;
    };
  }, [source, language, t]);

  const save = async () => {
    if (!bundle) return;
    setBusy(true);
    try {
      let name = '';
      if (format === 'xlsx') {
        name = `${fileNameOf(bundle.baseName)}.xlsx`;
        const bytes = await writeXlsx(bundle.tables, {
          creator: `Mateo ${bundle.info.appVersion}`,
          createdAt: bundle.info.exportedAt,
          title: bundle.baseName,
        });
        saveBytes(name, bytes, XLSX_MEDIA_TYPE);
      } else if (format === 'zip') {
        name = `${fileNameOf(bundle.baseName)}.zip`;
        saveBytes(name, writeCsvZip(bundle.tables, language), ZIP_MEDIA_TYPE);
      } else {
        const table = bundle.tables.find((item) => item.id === tableId) ?? bundle.tables[0];
        if (!table) return;
        name = `${fileNameOf(`${bundle.baseName} - ${table.title}`)}.csv`;
        saveBytes(name, writeCsv(table, language), CSV_MEDIA_TYPE);
      }
      toast.success(t('saved', { name }));
      onDone();
    } catch (error) {
      toast.error(t('failed', { message: error instanceof Error ? error.message : String(error) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('title')}</DialogTitle>
        <DialogDescription>{t('description')}</DialogDescription>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1" htmlFor={ids.format}>
          <span className={labelClass}>{t('format.label')}</span>
          <select
            id={ids.format}
            className={fieldClass}
            value={format}
            onChange={(event) => setFormat(event.target.value as Format)}
            data-testid="export-format"
          >
            {FORMATS.map((item) => (
              <option key={item} value={item}>
                {t(`format.${item}`)}
              </option>
            ))}
          </select>
        </label>
        {format === 'csv' && (
          <label className="flex flex-col gap-1" htmlFor={ids.table}>
            <span className={labelClass}>{t('table')}</span>
            <select
              id={ids.table}
              className={fieldClass}
              value={tableId}
              onChange={(event) => setTableId(event.target.value)}
              disabled={!bundle}
              data-testid="export-table"
            >
              {bundle?.tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1" htmlFor={ids.language}>
          <span className={labelClass}>{t('language.label')}</span>
          <select
            id={ids.language}
            className={fieldClass}
            value={language}
            onChange={(event) => setLanguage(event.target.value as ExportLanguage)}
            data-testid="export-language"
          >
            {SUPPORTED_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {LANGUAGE_NATIVE_NAMES[code]}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">{t('language.hint')}</span>
        </label>
        <p className="text-xs text-muted-foreground" role="status">
          {bundle ? t('tableCount', { count: bundle.tables.length }) : t('preparing')}
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          {t('cancel')}
        </Button>
        <Button onClick={() => void save()} disabled={!bundle || busy} data-testid="export-save">
          {busy ? t('saving') : t('save')}
        </Button>
      </DialogFooter>
    </>
  );
}
