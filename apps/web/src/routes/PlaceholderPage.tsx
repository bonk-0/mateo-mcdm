import { Badge, Button } from '@mateo/ui';
import { ArrowLeft, Construction } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { NavItem } from '../navigation/navigation';

/** Stand-in for screens that later sub-phases build. */
export function PlaceholderPage({ item }: { item: NavItem }) {
  const { t } = useTranslation(['nav', 'shell']);
  const Icon = item.icon;
  return (
    <section
      aria-labelledby="placeholder-title"
      className="flex min-h-[60vh] flex-col items-center justify-center text-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, rotate: -6 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', bounce: 0.4, duration: 0.6 }}
        className="relative mb-6 flex size-20 items-center justify-center rounded-2xl bg-accent text-accent-foreground"
      >
        <Icon className="size-9" aria-hidden />
        <span className="absolute -right-2 -bottom-2 flex size-8 items-center justify-center rounded-full border-2 border-background bg-surface text-warning">
          <Construction className="size-4" aria-hidden />
        </span>
      </motion.div>
      <h1 id="placeholder-title" className="text-2xl font-semibold tracking-tight">
        {t(`nav:items.${item.id}.title`)}
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {t(`nav:items.${item.id}.description`)}
      </p>
      <Badge variant="outline" className="mt-4">
        {t('shell:placeholder.comingSoon')}
        {item.plannedIn && (
          <span translate="no" className="font-mono">
            · {item.plannedIn}
          </span>
        )}
      </Badge>
      <Button asChild variant="outline" className="mt-8">
        <Link to="/">
          <ArrowLeft aria-hidden />
          {t('shell:placeholder.backHome')}
        </Link>
      </Button>
    </section>
  );
}
