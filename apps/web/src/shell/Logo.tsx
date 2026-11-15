import { cn } from '@mateo/ui';

/**
 * The Mateo mark: two overlapping triangular membership functions that read as an "M",
 * a nod to triangular fuzzy numbers.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden focusable="false">
      <rect width="32" height="32" rx="8" className="fill-navy dark:fill-primary/15" />
      <path
        d="M5 24 L11.5 8 L18 24"
        className="fill-none stroke-[#7fa6ff]"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 24 L20.5 8 L27 24"
        className="fill-none stroke-white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
