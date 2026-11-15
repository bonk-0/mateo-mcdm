import { useTranslation } from 'react-i18next';

export function SkipLink() {
  const { t } = useTranslation('shell');
  return (
    <a
      href="#main"
      onClick={(event) => {
        event.preventDefault();
        document.getElementById('main')?.focus();
      }}
      className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      {t('skipToContent')}
    </a>
  );
}
