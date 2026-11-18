import { TooltipProvider } from '@mateo/ui';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useOutlet } from 'react-router';
import { Toaster } from 'sonner';
import { useResolvedTheme, useReducedMotion } from '../hooks/preferences';
import { findPage } from '../navigation/navigation';
import { DesktopBridge } from '../platform/DesktopBridge';
import { isDesktop } from '../platform/runtime';
import { ProjectFiles } from '../project/ProjectFiles';
import { SkipLink } from './SkipLink';
import { TopBar } from './TopBar';

export function AppShell() {
  const { t } = useTranslation(['nav', 'shell']);
  const { pathname } = useLocation();
  const page = findPage(pathname);
  // The page as it is now. A page that is fading out keeps its own content, so the next
  // page is built once, when it comes in, instead of first inside the leaving one.
  const outlet = useOutlet();
  const reducedMotion = useReducedMotion();
  const theme = useResolvedTheme();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  const pageTitle = page ? t(`nav:items.${page.id}.title`) : t('shell:notFound.title');
  useEffect(() => {
    document.title = `${pageTitle} · Mateo`;
  }, [pageTitle]);

  // Move focus to the content after navigation so keyboard and screen reader users
  // land on the new page instead of staying in the top bar.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <TooltipProvider delayDuration={300}>
        <SkipLink />
        <div className="flex h-dvh overflow-hidden bg-background">
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main
              id="main"
              ref={mainRef}
              tabIndex={-1}
              aria-label={pageTitle}
              className="flex-1 overflow-y-auto focus-visible:outline-none"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                  className={`mx-auto w-full px-4 py-8 sm:px-6 ${page?.id === 'data' ? 'max-w-[110rem]' : 'max-w-5xl'}`}
                >
                  {outlet}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
        <Toaster
          theme={theme}
          position="bottom-right"
          richColors
          closeButton
          containerAriaLabel={t('shell:notifications')}
          toastOptions={{ closeButtonAriaLabel: t('shell:closeNotification') }}
        />
        <ProjectFiles />
        {isDesktop() && <DesktopBridge />}
      </TooltipProvider>
    </MotionConfig>
  );
}
