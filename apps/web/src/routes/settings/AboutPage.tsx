import { Button, Card, CardContent } from '@mateo/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { requestPersistentStorage } from '../../project/persistence';
import { LogoMark } from '../../shell/Logo';
import { PageHeader } from '../PageHeader';

type Persistence = 'persistent' | 'bestEffort' | 'unknown';

/** Whether the browser keeps the project storage, or may clear it when space runs low. */
function usePersistence(): [Persistence, () => void] {
  const [state, setState] = useState<Persistence>('unknown');
  useEffect(() => {
    let active = true;
    const storage = (globalThis.navigator as Partial<Navigator> | undefined)?.storage;
    storage
      ?.persisted?.()
      .then((persisted) => {
        if (active) setState(persisted ? 'persistent' : 'bestEffort');
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const ask = () => {
    void requestPersistentStorage().then((persisted) => {
      if (persisted) setState('persistent');
    });
  };
  return [state, ask];
}

export function AboutPage() {
  const { t } = useTranslation('settings');
  const [persistence, askToKeep] = usePersistence();
  const facts = [
    ['version', <span translate="no">{__APP_VERSION__}</span>],
    ['storage', t('about.storageValue')],
    [
      'persistence',
      <span className="flex flex-col items-start gap-2">
        <span data-testid="storage-persistence">{t(`about.${persistence}`)}</span>
        {persistence === 'bestEffort' && (
          <Button variant="outline" size="sm" onClick={askToKeep}>
            {t('about.keep')}
          </Button>
        )}
      </span>,
    ],
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
