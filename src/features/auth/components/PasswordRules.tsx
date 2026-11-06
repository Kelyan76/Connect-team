import { Check, Circle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { PASSWORD_RULES } from '../lib/password';

/** Liste des règles du mot de passe, cochées au fil de la saisie. */
export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="grid grid-cols-2 gap-1 text-xs" aria-label="Règles du mot de passe">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        const Icon = ok ? Check : Circle;
        return (
          <li
            key={rule.id}
            className={cn('flex items-center gap-2', ok ? 'text-success' : 'text-fg-subtle')}
          >
            <Icon className="size-3" aria-hidden />
            {rule.label}
            <span className="sr-only">{ok ? 'respectée' : 'non respectée'}</span>
          </li>
        );
      })}
    </ul>
  );
}
