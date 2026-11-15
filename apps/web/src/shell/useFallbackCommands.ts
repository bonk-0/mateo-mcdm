import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { setFallbackCommandHandler } from '../commands/commands';

/**
 * Until project files exist (P1.8), file commands explain that the feature is coming
 * instead of doing nothing.
 */
export function useFallbackCommands(): void {
  const { t } = useTranslation('shell');
  useEffect(() => {
    setFallbackCommandHandler((command, payload) => {
      const files = payload.paths?.length ?? 0;
      toast.info(t(`commands.${command}`), {
        id: command,
        description:
          files > 0 ? t('commands.filesReceived', { count: files }) : t('commands.comingSoon'),
      });
    });
  }, [t]);
}
