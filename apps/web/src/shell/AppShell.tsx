import { TooltipProvider } from '@mateo/ui';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { useResolvedTheme, useReducedMotion } from '../hooks/preferences';
import { findNavItem } from '../navigation/navigation';
import { DesktopBridge } from '../platform/DesktopBridge';
import { isDesktop } from '../platform/runtime';
import { ProjectFiles } from '../project/ProjectFiles';
import { Sidebar } from './Sidebar';
import { SkipLink } from './SkipLink';
import { TopBar } from './TopBar';

export function AppShell() {
  const { t } = useTranslation(['nav', 'shell']);
  const { pathname } = useLocation();
  const match = findNavItem(pathname);
  const reducedMotion = useReducedMotion();
  const theme = useResolvedTheme();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  const pageTitle = match ? t(`nav:items.${match.item.id}.title`) : t('shell:notFound.title');
  useEffect(() => {
    document.title = `${pageTitle} · Mateo`;
  }, [pageTitle]);

  // Move focus to the content after navigation so keyboard and screen reader users
  // land on the new page instead of staying in the sidebar.
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
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar match={match} />
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
                  className="mx-auto w-full max-w-6xl px-6 py-8"
                >
                  <Outlet />
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
