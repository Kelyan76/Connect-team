import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { Check, Minus } from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '@/shared/lib/cn';

export const Checkbox = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex size-4 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-surface transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent data-[state=indeterminate]:border-accent data-[state=checked]:bg-accent data-[state=indeterminate]:bg-accent data-[state=checked]:text-accent-fg data-[state=indeterminate]:text-accent-fg',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator>
      {props.checked === 'indeterminate' ? (
        <Minus className="size-3" strokeWidth={3} aria-hidden />
      ) : (
        <Check className="size-3" strokeWidth={3} aria-hidden />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';

export const Switch = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-5 w-8 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-line-strong transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-accent',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitive.Root>
));
Switch.displayName = 'Switch';

/** Contrôle segmenté (choix exclusif) : vues, périodes, filtres rapides. */
export const Segmented = forwardRef<
  HTMLDivElement,
  Omit<
    ToggleGroupPrimitive.ToggleGroupSingleProps,
    'type' | 'value' | 'defaultValue' | 'onValueChange'
  > & {
    value: string;
    onValueChange: (value: string) => void;
  }
>(({ className, onValueChange, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    type="single"
    onValueChange={(v) => v && onValueChange(v)}
    className={cn('inline-flex h-9 items-center gap-px rounded-full bg-surface-muted p-1', className)}
    {...props}
  />
));
Segmented.displayName = 'Segmented';

export const SegmentedItem = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      'inline-flex h-full shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-medium text-fg-muted transition-all hover:text-fg data-[state=on]:bg-surface data-[state=on]:text-fg data-[state=on]:shadow-sm [&_svg]:size-4',
      className,
    )}
    {...props}
  />
));
SegmentedItem.displayName = 'SegmentedItem';
