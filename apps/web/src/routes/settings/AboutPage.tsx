import { Card, CardContent } from '@mateo/ui';
import { useTranslation } from 'react-i18next';
import { isDesktop } from '../../platform/runtime';
import { LogoMark } from '../../shell/Logo';
import { PageHeader } from '../PageHeader';

export function AboutPage() {
  const { t } = useTranslation('settings');
  const facts = [
    ['version', <span translate="no">{__APP_VERSION__}</span>],
    ['runtime', isDesktop() ? t('about.runtimeDesktop') : t('about.runtimeBrowser')],
    ['storage', t('about.storageValue')],
    ['languages', t('about.languagesValue')],
  ] as const;

  return (
    <>
      <PageHeader title={t('about.title')} />
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row">
          <LogoMark className="size-16" />
          <div className="flex-1">
            <p translate="no" className="text-xl font-semibold tracking-tight">
              Mateo
            </p>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t('about.tagline')}</p>
            <dl className="mt-6 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
              {facts.map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-muted-foreground">{t(`about.${key}`)}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
