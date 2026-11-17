import { Badge } from '@mateo/ui';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PageHeader } from '../routes/PageHeader';
import { LIBRARY_PAGES, libraryPath, type MethodFamily } from './methods';

const FAMILIES: readonly MethodFamily[] = ['weighting', 'ranking'];

/** The Method Library: one card per method page, grouped by what the method does. */
export function LibraryIndexPage() {
  const { t } = useTranslation(['library', 'nav']);
  return (
    <div className="flex flex-col">
      <PageHeader
        title={t('nav:items.library.title')}
        description={t('nav:items.library.description')}
      />
      <div className="space-y-10">
        {FAMILIES.map((family) => (
          <section key={family} aria-labelledby={`library-${family}`} className="space-y-3">
            <div>
              <h2 id={`library-${family}`} className="text-lg font-semibold">
                {t(`library:index.${family}Title`)}
              </h2>
              <p className="text-sm text-muted-foreground">{t(`library:index.${family}Text`)}</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {LIBRARY_PAGES.filter((page) => page.family === family).map((page) => (
                <li key={page.id}>
                  <Link
                    to={libraryPath(page.id)}
                    data-testid={`library-card-${page.id}`}
                    className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold">
                        {t(`library:pages.${page.id}.title`)}
                      </span>
                      {page.variants.some((variant) => variant.fuzzy) && (
                        <Badge variant="accent">{t('library:numberType.tfn')}</Badge>
                      )}
                    </span>
                    <span className="flex-1 text-sm text-muted-foreground">
                      {t(`library:pages.${page.id}.summary`)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                      {t('library:index.open')}
                      <ArrowRight
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
