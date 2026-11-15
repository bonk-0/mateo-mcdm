import { Button } from '@mateo/ui';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export function NotFoundPage() {
  const { t } = useTranslation('shell');
  return (
    <section
      aria-labelledby="not-found-title"
      className="flex min-h-[60vh] flex-col items-center justify-center text-center"
    >
      <p className="font-mono text-5xl font-semibold text-primary" aria-hidden>
        404
      </p>
      <h1 id="not-found-title" className="mt-4 text-2xl font-semibold tracking-tight">
        {t('notFound.title')}
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t('notFound.description')}</p>
      <Button asChild variant="outline" className="mt-8">
        <Link to="/">
          <ArrowLeft aria-hidden />
          {t('placeholder.backHome')}
        </Link>
      </Button>
    </section>
  );
}
