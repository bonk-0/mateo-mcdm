import { cn } from '@mateo/ui';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router';
import { FLOW_STEPS, flowStepOf, pathOf } from '../navigation/navigation';

/** Data → Weights → Result: where the person is, and what comes next. */
export function Stepper() {
  const { t } = useTranslation('nav');
  const { pathname } = useLocation();
  const current = flowStepOf(pathname);
  const currentIndex = current ? FLOW_STEPS.indexOf(current) : -1;
  return (
    <ol className="flex items-center gap-1" aria-label={t('steps.label')}>
      {FLOW_STEPS.map((step, index) => {
        const active = step === current;
        const done = index < currentIndex;
        return (
          <li key={step} className="flex items-center gap-1">
            {index > 0 && <span className="h-px w-3 bg-border sm:w-5" aria-hidden />}
            <NavLink
              to={pathOf(step)}
              end={false}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex h-8 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : done
                      ? 'bg-success/15 text-success'
                      : 'bg-muted text-muted-foreground',
                )}
                aria-hidden
              >
                {done ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span className="sr-only">
                {t('steps.step', { number: index + 1, total: FLOW_STEPS.length })}:{' '}
              </span>
              <span className={cn(!active && 'hidden md:inline')}>{t(`steps.${step}`)}</span>
            </NavLink>
          </li>
        );
      })}
    </ol>
  );
}
