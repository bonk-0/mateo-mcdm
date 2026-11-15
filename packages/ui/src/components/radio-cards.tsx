import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

/** A radio group whose options are large selectable cards (for example theme choices). */
export function RadioCards({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn('grid gap-3', className)} {...props} />;
}

export function RadioCard({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'group relative flex flex-col items-stretch gap-2 rounded-lg border border-border bg-surface p-3 text-left text-sm transition-[border-color,box-shadow] duration-(--duration-fast) hover:border-primary/50 data-[state=checked]:border-primary data-[state=checked]:ring-2 data-[state=checked]:ring-primary/25',
        className,
      )}
      {...props}
    />
  );
}
