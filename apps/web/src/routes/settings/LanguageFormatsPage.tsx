import {
  formatNumber,
  LANGUAGE_NATIVE_NAMES,
  localeForNumberFormat,
  NUMBER_FORMAT_IDS,
  numberSeparators,
  SUPPORTED_LANGUAGES,
  type NumberFormatId,
} from '@mateo/i18n';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mateo/ui';
import { useTranslation } from 'react-i18next';
import { useEffectiveLanguage, useFormatters } from '../../hooks/preferences';
import {
  DISPLAY_PRECISIONS,
  useSettings,
  type DisplayPrecision,
  type LanguagePreference,
} from '../../settings/store';
import { systemLocale } from '../../settings/system';
import { PageHeader } from '../PageHeader';
import { SettingRow } from './SettingRow';

const SAMPLE = 1234567.891;
const PREVIEW_VALUES = [0.2847193, 1234.5678, -0.0512, 98765.4321];

function NumberFormatSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: NumberFormatId;
  onChange: (value: NumberFormatId) => void;
}) {
  const { t } = useTranslation('settings');
  return (
    <Select value={value} onValueChange={(v) => onChange(v as NumberFormatId)}>
      <SelectTrigger aria-labelledby={`${id}-label`} aria-describedby={`${id}-description`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {NUMBER_FORMAT_IDS.map((format) => {
          const example = formatNumber(SAMPLE, localeForNumberFormat(format, systemLocale()), {
            fractionDigits: 2,
          });
          return (
            <SelectItem key={format} value={format}>
              {format === 'system'
                ? t('formats.system', { example })
                : t(`formats.presets.${format}`, { example })}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function Separators({ format }: { format: NumberFormatId }) {
  const { t } = useTranslation('settings');
  const { decimal, group } = numberSeparators(localeForNumberFormat(format, systemLocale()));
  const show = (symbol: string) => (symbol.trim() === '' ? '␣' : symbol);
  return (
    <dl className="flex flex-wrap gap-2 text-sm">
      {(
        [
          ['decimal', decimal],
          ['group', group],
        ] as const
      ).map(([kind, symbol]) => (
        <div key={kind} className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5">
          <dt className="text-muted-foreground">{t(`importFormat.${kind}`)}</dt>
          <dd className="font-mono font-semibold">{show(symbol)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LanguageFormatsPage() {
  const { t } = useTranslation('settings');
  const settings = useSettings();
  const language = useEffectiveLanguage();
  const fmt = useFormatters();
  const today = new Date();

  return (
    <>
      <PageHeader
        title={t('languageFormats.title')}
        description={t('languageFormats.description')}
      />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('language.title')}</CardTitle>
            <CardDescription>{t('language.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingRow
              id="ui-language"
              label={t('language.label')}
              description={t('language.hint')}
              control={
                <Select
                  value={settings.language}
                  onValueChange={(v) => settings.update({ language: v as LanguagePreference })}
                >
                  <SelectTrigger
                    aria-labelledby="ui-language-label"
                    aria-describedby="ui-language-description"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">
                      {t('language.system', { language: LANGUAGE_NATIVE_NAMES[language] })}
                    </SelectItem>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {LANGUAGE_NATIVE_NAMES[lang]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('displayFormat.title')}</CardTitle>
            <CardDescription>{t('displayFormat.description')}</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <SettingRow
              id="display-format"
              label={t('displayFormat.label')}
              description={t('displayFormat.hint')}
              control={
                <NumberFormatSelect
                  id="display-format"
                  value={settings.displayNumberFormat}
                  onChange={(v) => settings.update({ displayNumberFormat: v })}
                />
              }
            />
            <SettingRow
              id="display-precision"
              label={t('precision.label')}
              description={t('precision.hint')}
              control={
                <Select
                  value={String(settings.displayPrecision)}
                  onValueChange={(v) =>
                    settings.update({ displayPrecision: Number(v) as DisplayPrecision })
                  }
                >
                  <SelectTrigger
                    aria-labelledby="display-precision-label"
                    aria-describedby="display-precision-description"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPLAY_PRECISIONS.map((digits) => (
                      <SelectItem key={digits} value={String(digits)}>
                        {t('precision.option', { count: digits })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            >
              <div className="rounded-lg border border-border">
                <p className="border-b border-border px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t('preview.title')}
                </p>
                <table className="w-full text-sm">
                  <caption className="sr-only">{t('preview.caption')}</caption>
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th scope="col" className="px-4 py-2 font-medium">
                        {t('preview.stored')}
                      </th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">
                        {t('preview.shown')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {PREVIEW_VALUES.map((value) => (
                      <tr key={value} className="border-t border-border">
                        <td className="px-4 py-2 font-mono text-muted-foreground">
                          {fmt.number(value, 7)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">{fmt.value(value)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-border">
                      <td className="px-4 py-2 text-muted-foreground">{t('preview.date')}</td>
                      <td translate="no" className="px-4 py-2 text-right font-medium">
                        {fmt.date(today, 'long', true)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </SettingRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('importFormat.title')}</CardTitle>
            <CardDescription>{t('importFormat.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingRow
              id="import-format"
              label={t('importFormat.label')}
              description={t('importFormat.hint')}
              control={
                <NumberFormatSelect
                  id="import-format"
                  value={settings.importNumberFormat}
                  onChange={(v) => settings.update({ importNumberFormat: v })}
                />
              }
            >
              <Separators format={settings.importNumberFormat} />
            </SettingRow>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
