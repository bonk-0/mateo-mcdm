import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { registerSW } from 'virtual:pwa-register';
import { getProjectController } from '../project/store';

/**
 * Registers the service worker that keeps Mateo working offline, and tells the user when
 * a new version is ready. The new version waits for the user to reload, so an open project
 * is never interrupted; a pending autosave runs before the reload.
 */
export function AppUpdate() {
  const { t } = useTranslation('shell');
  const translate = useRef(t);
  translate.current = t;

  useEffect(() => {
    const updateApp = registerSW({
      onNeedRefresh() {
        toast.info(translate.current('update.ready'), {
          id: 'app-update',
          duration: Number.POSITIVE_INFINITY,
          action: {
            label: translate.current('update.reload'),
            onClick: () => {
              void (getProjectController()?.flush() ?? Promise.resolve()).then(() =>
                updateApp(true),
              );
            },
          },
        });
      },
      onOfflineReady() {
        toast.success(translate.current('update.offlineReady'), { id: 'app-offline' });
      },
      onRegisterError(error: unknown) {
        console.error('Could not set up offline use', error);
      },
    });
  }, []);

  return null;
}
