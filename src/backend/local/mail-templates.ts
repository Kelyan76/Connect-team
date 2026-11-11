import invite from '../../../supabase/templates/invite.html?raw';
import recovery from '../../../supabase/templates/recovery.html?raw';

/**
 * Mêmes modèles d'e-mails qu'en production (supabase/templates) : les variables Supabase
 * ({{ .ConfirmationURL }}, {{ .Email }}, {{ .Data.first_name }}) sont remplacées ici.
 */
const TEMPLATES = { invite, recovery } as const;

export function renderMail(name: keyof typeof TEMPLATES, vars: { link: string; email: string; firstName?: string }): string {
  return TEMPLATES[name]
    .replaceAll('{{ .ConfirmationURL }}', vars.link)
    .replaceAll('{{ .Email }}', vars.email)
    .replaceAll('{{ .Data.first_name }}', vars.firstName ?? '');
}
