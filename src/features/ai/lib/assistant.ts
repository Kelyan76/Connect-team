/**
 * Assistant de Connect Team (discussion) : consignes, contexte de l'équipe et actions proposées.
 * Seuls les prénoms et des données de suivi résumées sont envoyés ; aucune action n'est exécutée
 * sans clic : l'assistant ouvre le bon formulaire, prérempli, que l'utilisateur relit.
 */
import { AI_CONTEXT } from './ai';

export type Role = 'manager' | 'collaborateur';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type AssistantActionType =
  | 'feedback'
  | 'review'
  | 'objective'
  | 'delegation'
  | 'decision'
  | 'profile'
  | 'leave'
  | 'request_review'
  | 'pulse';

export interface AssistantAction {
  type: AssistantActionType;
  person?: string;
  kind?: string;
}

export interface ParsedReply {
  text: string;
  actions: AssistantAction[];
}

const MANAGER_ACTIONS =
  'feedback (champ kind : reconnaissance, amelioration ou recadrage), review (planifier un 1 à 1), objective (nouvel objectif), delegation (déléguer une mission), decision (outil Décider), profile (ouvrir sa fiche)';
const SELF_ACTIONS =
  'leave (poser un congé), request_review (demander un 1 à 1), pulse (donner mon pouls), objective (voir mes objectifs)';

/** Consignes + données de suivi, envoyées comme contexte de la conversation. */
export function assistantContext(role: Role, firstName: string, data: string): string {
  const who =
    role === 'manager'
      ? `Tu assistes ${firstName}, manager de proximité. Tu l’aides à accompagner son équipe : préparer ses 1 à 1, rédiger feedbacks et messages, prioriser, comprendre un signal faible, appliquer les outils du cours.`
      : `Tu assistes ${firstName}, collaborateur. Tu l’aides à préparer ses 1 à 1, formuler une demande à son manager, suivre ses objectifs et organiser sa semaine. Tu ne parles jamais des autres membres de l’équipe.`;
  return [
    AI_CONTEXT,
    who,
    'Réponds en markdown court (phrases brèves, listes si utile, gras pour l’essentiel). Appuie-toi sur les données ci-dessous ; si une information manque, dis-le au lieu d’inventer. Pas de diagnostic médical ni de jugement sur la personne : des faits et des pistes.',
    `Si une action de l’application aide l’utilisateur, ajoute À LA FIN une dernière ligne exactement de la forme ACTIONS: [{"type":"...","person":"Prénom"}]. Types possibles : ${role === 'manager' ? MANAGER_ACTIONS : SELF_ACTIONS}. Au plus 3 actions. Sinon, n’ajoute pas cette ligne.`,
    `Données de suivi (aujourd’hui) :\n${data || 'Aucune donnée disponible.'}`,
  ].join('\n\n');
}

const ALLOWED: Record<Role, AssistantActionType[]> = {
  manager: ['feedback', 'review', 'objective', 'delegation', 'decision', 'profile'],
  collaborateur: ['leave', 'request_review', 'pulse', 'objective'],
};

/** Sépare le texte de la réponse et la ligne « ACTIONS: [...] » (tolère un JSON {"reply", "actions"}). */
export function parseAssistantReply(reply: string, role: Role): ParsedReply {
  let text = reply.trim();
  let raw: unknown = [];
  try {
    const whole: unknown = JSON.parse(text);
    if (whole && typeof whole === 'object' && 'reply' in whole && typeof whole.reply === 'string') {
      text = whole.reply.trim();
      raw = 'actions' in whole ? whole.actions : [];
    }
  } catch {
    // réponse en texte libre : cas normal
  }
  const m = text.match(/\n?\s*ACTIONS\s*:\s*(\[[\s\S]*\])\s*$/);
  if (m) {
    text = text.slice(0, m.index).trim();
    try {
      raw = JSON.parse(m[1]);
    } catch {
      raw = [];
    }
  }
  const actions = (Array.isArray(raw) ? raw : [])
    .flatMap((a): AssistantAction[] => {
      if (!a || typeof a !== 'object') return [];
      const x = a as Record<string, unknown>;
      const type = x.type as AssistantActionType;
      if (!ALLOWED[role].includes(type)) return [];
      return [
        {
          type,
          person: typeof x.person === 'string' ? x.person.trim() : undefined,
          kind: typeof x.kind === 'string' ? x.kind : undefined,
        },
      ];
    })
    .slice(0, 3);
  return { text, actions };
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

export interface PersonRef {
  id: string;
  first_name: string;
}

/** Transforme une action en lien de l'application (formulaire prérempli) ; null si la personne est inconnue. */
export function actionLink(
  a: AssistantAction,
  people: PersonRef[],
  role: Role = 'manager',
): { label: string; to: string } | null {
  const person = a.person
    ? people.find((p) => norm(p.first_name) === norm(a.person ?? ''))
    : undefined;
  const q = person ? `&collaborateur=${person.id}` : '';
  const name = person ? ` · ${person.first_name}` : '';
  const needsPerson = ['feedback', 'review', 'decision', 'profile'].includes(a.type);
  if (needsPerson && !person) return null;
  switch (a.type) {
    case 'feedback': {
      const kind = ['reconnaissance', 'amelioration', 'recadrage'].includes(a.kind ?? '')
        ? (a.kind as string)
        : 'reconnaissance';
      const label =
        kind === 'reconnaissance'
          ? 'Féliciter'
          : kind === 'recadrage'
            ? 'Préparer un recadrage'
            : 'Préparer un feedback';
      return { label: `${label}${name}`, to: `/feedbacks?nouveau=1&type=${kind}${q}` };
    }
    case 'review':
      return { label: `Planifier un 1 à 1${name}`, to: `/entretiens?planifier=1${q}` };
    case 'objective':
      return role === 'manager'
        ? { label: `Nouvel objectif${name}`, to: `/objectifs?nouveau=1${q}` }
        : { label: 'Voir mes objectifs', to: '/objectifs' };
    case 'delegation':
      return { label: `Déléguer une mission${name}`, to: `/delegation?nouveau=1${q}` };
    case 'decision':
      return {
        label: `Décider avec la bonne posture${name}`,
        to: `/posture?collaborateur=${person?.id ?? ''}`,
      };
    case 'profile':
      return { label: `Ouvrir la fiche${name}`, to: `/equipe/${person?.id ?? ''}` };
    case 'leave':
      return { label: 'Poser un congé', to: '/calendrier?nouveau=1' };
    case 'request_review':
      return { label: 'Demander un 1 à 1', to: '/entretiens?demande=1' };
    case 'pulse':
      return { label: 'Donner mon pouls', to: '/pouls' };
  }
}

/** Historique envoyé : derniers échanges seulement (réponses courtes, coût et confidentialité maîtrisés). */
export const trimHistory = (messages: ChatMessage[], max = 10): ChatMessage[] =>
  messages.slice(-max);

export const SUGGESTIONS: Record<Role, string[]> = {
  manager: [
    'Qui dois-je voir en priorité cette semaine ?',
    'Prépare mon prochain 1 à 1',
    'Aide-moi à féliciter quelqu’un',
    'Explique-moi le modèle SCARF simplement',
  ],
  collaborateur: [
    'Aide-moi à préparer mon 1 à 1',
    'Comment demander plus d’autonomie ?',
    'Organise ma semaine',
    'Comment dire que je suis surchargé ?',
  ],
};
