import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@mateo/ui';
import {
  ArrowRight,
  Database,
  FilePlus2,
  FileText,
  FolderOpen,
  History,
  ListOrdered,
  Scale,
  ShieldCheck,
  Sigma,
  Target,
  WifiOff,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { runCommand } from '../commands/commands';
import { useProjectState } from '../project/store';
import { fileNameOf } from '../project/platform';
import { HeroIllustration } from './HeroIllustration';

type DayPart = 'morning' | 'afternoon' | 'evening';

function dayPart(hour: number): DayPart {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

const STEPS = [
  { id: 'import', icon: Database, to: '/data-center' },
  { id: 'model', icon: FolderOpen, to: '/projects' },
  { id: 'weight', icon: Scale, to: '/methods/weighting' },
  { id: 'rank', icon: Target, to: '/analysis/marcos' },
] as const;

const METHOD_GROUPS = [
  { id: 'weighting', icon: Scale, methods: ['CRITIC', 'MEREC', 'SWARA'] },
  { id: 'ranking', icon: ListOrdered, methods: ['MARCOS', 'Fuzzy MARCOS'] },
] as const;

const PRINCIPLES = [
  { id: 'correct', icon: ShieldCheck },
  { id: 'explainable', icon: Sigma },
  { id: 'offline', icon: WifiOff },
] as const;

const rise = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.08 * i, duration: 0.32, ease: [0.2, 0, 0, 1] as const },
});

export function HomePage() {
  const { t } = useTranslation('home');
  const part = dayPart(new Date().getHours());
  const { recent } = useProjectState();

  return (
    <div className="flex flex-col gap-6">
      <motion.section
        {...rise(0)}
        aria-labelledby="home-title"
        className="relative overflow-hidden rounded-2xl bg-navy p-8 text-navy-foreground shadow-sm dark:border dark:border-border"
      >
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-[radial-gradient(circle,rgba(111,155,255,0.35),transparent_70%)]"
          aria-hidden
        />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-sm font-medium text-[#b9cdff]">{t(`greeting.${part}`)}</p>
            <h1 id="home-title" className="mt-2 text-3xl font-semibold tracking-tight text-balance">
              {t('hero.title')}
            </h1>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[#d5def0]">
              {t('hero.lead')}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-white text-navy hover:bg-white/90"
                onClick={() => runCommand('file.new')}
              >
                <FilePlus2 aria-hidden />
                {t('hero.newProject')}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-white ring-1 ring-white/35 hover:bg-white/10"
                onClick={() => runCommand('file.open')}
              >
                <FolderOpen aria-hidden />
                {t('hero.openProject')}
              </Button>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <HeroIllustration />
          </div>
        </div>
      </motion.section>

      <motion.section {...rise(1)} aria-labelledby="journey-title">
        <h2 id="journey-title" className="mb-3 text-lg font-semibold tracking-tight">
          {t('journey.title')}
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map(({ id, icon: Icon, to }, i) => (
            <li key={id}>
              <Link
                to={to}
                className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs transition-[border-color,box-shadow,transform] duration-(--duration-base) hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {t('journey.step', { number: i + 1 })}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{t(`journey.steps.${id}.title`)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(`journey.steps.${id}.description`)}
                  </p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                  {t('journey.open')}
                  <ArrowRight
                    className="size-4 transition-transform duration-(--duration-base) group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <motion.div {...rise(2)}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t('methods.title')}</CardTitle>
              <CardDescription>{t('methods.description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {METHOD_GROUPS.map(({ id, icon: Icon, methods }) => (
                <div key={id} className="rounded-lg bg-muted p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="size-4 text-primary" aria-hidden />
                    {t(`methods.groups.${id}.title`)}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(`methods.groups.${id}.description`)}
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {methods.map((method) => (
                      <li key={method}>
                        <Badge variant="accent" translate="no">
                          {method}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...rise(3)}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t('recent.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center">
                  <History className="size-6 text-muted-foreground" aria-hidden />
                  <p className="text-sm font-medium">{t('recent.emptyTitle')}</p>
                  <p className="text-sm text-muted-foreground">{t('recent.emptyDescription')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <ul className="-mx-2 flex flex-col">
                    {recent.slice(0, 5).map((item) => (
                      <li key={item.location}>
                        <button
                          type="button"
                          onClick={() => runCommand('file.open', { paths: [item.location] })}
                          aria-label={t('recent.open', { name: item.name })}
                          title={item.location}
                          className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                        >
                          <FileText className="size-4 shrink-0 text-primary" aria-hidden />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{item.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {fileNameOf(item.location)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="link"
                    size="sm"
                    className="self-start px-0"
                    onClick={() => runCommand('file.clearRecent')}
                  >
                    {t('recent.clear')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.ul
        {...rise(4)}
        className="grid gap-3 sm:grid-cols-3"
        aria-label={t('principles.label')}
      >
        {PRINCIPLES.map(({ id, icon: Icon }) => (
          <li key={id} className="flex gap-3 rounded-xl p-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-medium">{t(`principles.${id}.title`)}</p>
              <p className="text-sm text-muted-foreground">{t(`principles.${id}.description`)}</p>
            </div>
          </li>
        ))}
      </motion.ul>
    </div>
  );
}
