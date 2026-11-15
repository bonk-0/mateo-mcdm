import type { ReactNode } from 'react';

/** A labelled setting: text on the left, control on the right, optional preview below. */
export function SettingRow({
  id,
  label,
  description,
  control,
  children,
}: {
  id: string;
  label: string;
  description: string;
  control: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-md">
          <p id={`${id}-label`} className="text-sm font-medium text-foreground">
            {label}
          </p>
          <p id={`${id}-description`} className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="w-full sm:w-64">{control}</div>
      </div>
      {children}
    </div>
  );
}
