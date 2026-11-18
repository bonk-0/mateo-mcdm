import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  RadioCard,
  RadioCards,
} from '@mateo/ui';
import { Monitor, Moon, Sun, Zap, ZapOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from '../../hooks/preferences';
import { useSettings, type MotionPreference, type ThemePreference } from '../../settings/store';
import { PageHeader } from '../PageHeader';

/** A miniature of the app in a given theme. */
function ThemePreview({ variant }: { variant: 'light' | 'dark' | 'split' }) {
  const pane = (dark: boolean) => (
    <div className={cn('flex h-full flex-1 gap-1 p-1.5', dark ? 'bg-[#211f31]' : 'bg-[#f5f4f9]')}>
      <div className={cn('w-1/4 rounded-sm', dark ? 'bg-[#191827]' : 'bg-white')} />
      <div className="flex flex-1 flex-col gap-1">
        <div className={cn('h-2 w-2/3 rounded-sm', dark ? 'bg-[#e6a6f7]' : 'bg-[#8a35ad]')} />
        <div className={cn('flex-1 rounded-sm', dark ? 'bg-[#191827]' : 'bg-white')} />
      </div>
    </div>
  );
  return (
    <div className="flex h-20 overflow-hidden rounded-md border border-border" aria-hidden>
      {variant === 'split' ? (
        <>
          {pane(false)}
          {pane(true)}
        </>
      ) : (
        pane(variant === 'dark')
      )}
    </div>
  );
}

const THEMES = [
  { id: 'system', icon: Monitor, preview: 'split' },
  { id: 'light', icon: Sun, preview: 'light' },
  { id: 'dark', icon: Moon, preview: 'dark' },
] as const;

const MOTIONS = [
  { id: 'system', icon: Monitor },
  { id: 'full', icon: Zap },
  { id: 'reduce', icon: ZapOff },
] as const;

export function AppearancePage() {
  const { t } = useTranslation('settings');
  const theme = useSettings((s) => s.theme);
  const motion = useSettings((s) => s.motion);
  const update = useSettings((s) => s.update);
  const reduced = useReducedMotion();

  return (
    <>
      <PageHeader title={t('appearance.title')} description={t('appearance.description')} />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle id="theme-title">{t('theme.title')}</CardTitle>
            <CardDescription>{t('theme.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioCards
              aria-labelledby="theme-title"
              value={theme}
              onValueChange={(v) => update({ theme: v as ThemePreference })}
              className="sm:grid-cols-3"
            >
              {THEMES.map(({ id, icon: Icon, preview }) => (
                <RadioCard key={id} value={id}>
                  <ThemePreview variant={preview} />
                  <span className="flex items-center gap-2 font-medium">
                    <Icon className="size-4" aria-hidden />
                    {t(`theme.options.${id}`)}
                  </span>
                </RadioCard>
              ))}
            </RadioCards>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle id="motion-title">{t('motion.title')}</CardTitle>
            <CardDescription>{t('motion.description')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <RadioCards
              aria-labelledby="motion-title"
              value={motion}
              onValueChange={(v) => update({ motion: v as MotionPreference })}
              className="sm:grid-cols-3"
            >
              {MOTIONS.map(({ id, icon: Icon }) => (
                <RadioCard key={id} value={id}>
                  <span className="flex items-center gap-2 font-medium">
                    <Icon className="size-4" aria-hidden />
                    {t(`motion.options.${id}.title`)}
                  </span>
                  <span className="text-muted-foreground">
                    {t(`motion.options.${id}.description`)}
                  </span>
                </RadioCard>
              ))}
            </RadioCards>
            <p className="text-sm text-muted-foreground" role="status">
              {reduced ? t('motion.statusReduced') : t('motion.statusFull')}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
