import { ChevronDown } from 'lucide-react';
import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/shared/lib/cn';

const fieldBase =
  'w-full rounded border border-line-strong bg-surface text-base text-fg placeholder:text-fg-subtle transition-colors hover:border-slate-400 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/25 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle aria-[invalid=true]:border-danger';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input ref={ref} type={type} className={cn(fieldBase, 'h-8 px-3', className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(fieldBase, 'min-h-16 px-3 py-2 leading-5', className)}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

/** Select natif stylé, pour les filtres compacts et les formulaires simples. */
export const NativeSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className={cn('relative', className)}>
    <select ref={ref} className={cn(fieldBase, 'h-8 appearance-none pl-3 pr-8')} {...props}>
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-2 top-2 size-4 text-fg-subtle"
      aria-hidden
    />
  </div>
));
NativeSelect.displayName = 'NativeSelect';
