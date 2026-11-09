import type { DiscStyle } from '@/features/team/lib/disc';

/**
 * Aide à la décision : « Quelle décision prendre et avec quelle posture ? »
 * 1. Diagnostic Comprendre / Savoir / Pouvoir / Vouloir (cours DESC : le DESC ne règle pas
 *    un problème de compétence ou de moyens, il faut d'abord reprendre le diagnostic).
 * 2. Contrôle SCARF (David Rock) : l'effet de la décision sur Statut, Certitude, Autonomie,
 *    Relations, Équité, pour anticiper les réactions de défense.
 * 3. Forme adaptée au profil DISC.
 */

export type Diagnosis = 'comprendre' | 'savoir' | 'pouvoir' | 'vouloir';
export type NextStep = 'one_to_one' | 'feedback' | 'delegation' | 'formation' | 'moyens' | 'objectif';

export const DIAGNOSES: Record<Diagnosis, { label: string; question: string; signs: string; response: string; posture: string; next: NextStep; tool: string }> = {
  comprendre: {
    label: 'Comprendre',
    question: 'Sait-il précisément ce qu’on attend de lui, et pourquoi ?',
    signs: 'Attendus flous, priorités contradictoires, changement récent de cap.',
    response: 'Redonner la direction : clarifier l’attendu, le sens et la priorité, puis le formaliser en objectif SMART.',
    posture: 'Directive et explicative : vous donnez le cap.',
    next: 'objectif',
    tool: 'DREAM · Direction, objectif SMART',
  },
  savoir: {
    label: 'Savoir',
    question: 'A-t-il les compétences pour le faire ?',
    signs: 'Erreurs techniques, hésitations, tâche nouvelle pour lui.',
    response: 'Former et accompagner : binôme, formation, coaching pas à pas. Pas de recadrage sur un manque de compétence.',
    posture: 'Formateur : vous montrez, il essaie, vous ajustez.',
    next: 'formation',
    tool: 'DREAM · Montée en compétences',
  },
  pouvoir: {
    label: 'Pouvoir',
    question: 'A-t-il les moyens : temps, outils, charge, informations ?',
    signs: 'Surcharge au pouls, dépendances bloquées, priorités qui s’empilent.',
    response: 'Donner les moyens : arbitrer les priorités, retirer une tâche, lever un blocage. C’est à vous d’agir d’abord.',
    posture: 'Facilitateur : vous levez les obstacles.',
    next: 'moyens',
    tool: 'Délégation · accompagner sans faire à sa place',
  },
  vouloir: {
    label: 'Vouloir',
    question: 'En a-t-il envie ? Qu’est-ce qui a changé pour lui ?',
    signs: 'Retrait, silence, humeur en baisse, échéances manquées chez quelqu’un d’habituellement moteur.',
    response: 'Écouter avant tout : un 1 à 1 centré sur lui (10 minutes pour lui), questions ouvertes, reformulation. Le DESC viendra ensuite si un comportement doit changer.',
    posture: 'À l’écoute, Adulte–Adulte : vous cherchez à comprendre, pas à juger.',
    next: 'one_to_one',
    tool: '1 à 1 · écoute active, puis feedback DESC',
  },
};

export const NEXT_STEP: Record<NextStep, { label: string; to: (personId: string) => string }> = {
  one_to_one: { label: 'Planifier un 1 à 1', to: (id) => `/entretiens?planifier=1&collaborateur=${id}` },
  feedback: { label: 'Préparer un feedback DESC', to: (id) => `/feedbacks?nouveau=1&collaborateur=${id}` },
  delegation: { label: 'Confier une mission', to: () => '/delegation?nouveau=1' },
  formation: { label: 'Planifier un 1 à 1 de développement', to: (id) => `/entretiens?planifier=1&collaborateur=${id}` },
  moyens: { label: 'Revoir ses tâches et priorités', to: () => '/taches' },
  objectif: { label: 'Fixer un objectif SMART', to: () => '/objectifs?nouveau=1' },
};

export type ScarfDomain = 'statut' | 'certitude' | 'autonomie' | 'relations' | 'equite';
export type ScarfImpact = -1 | 0 | 1;
export type Scarf = Partial<Record<ScarfDomain, ScarfImpact>>;

export const SCARF: Record<ScarfDomain, { label: string; question: string; mitigation: string }> = {
  statut: {
    label: 'Statut',
    question: 'Va-t-il se sentir dévalorisé, notamment devant les autres ?',
    mitigation: 'En privé, reconnaître d’abord sa contribution, parler du comportement et non de la personne.',
  },
  certitude: {
    label: 'Certitude',
    question: 'La décision crée-t-elle du flou sur la suite ?',
    mitigation: 'Donner les prochaines étapes, la date du point de suivi et ce qui ne change pas.',
  },
  autonomie: {
    label: 'Autonomie',
    question: 'Lui retire-t-on des marges de manœuvre ?',
    mitigation: 'Lui laisser le choix des moyens, co-construire la solution (« Que proposes-tu ? »).',
  },
  relations: {
    label: 'Relations',
    question: 'Peut-elle abîmer la confiance avec vous ou l’équipe ?',
    mitigation: 'Montrer que la relation compte : écoute, reformulation, engagement réciproque.',
  },
  equite: {
    label: 'Équité',
    question: 'Pourrait-il la juger injuste par rapport aux autres ?',
    mitigation: 'Expliquer le critère, appliquer la même règle à tous, s’appuyer sur des faits.',
  },
};

export const SCARF_DOMAINS = Object.keys(SCARF) as ScarfDomain[];

/** Domaines menacés par la décision, avec la parade à prévoir. */
export function scarfRisks(scarf: Scarf) {
  return SCARF_DOMAINS.filter((d) => scarf[d] === -1).map((d) => ({ domain: d, ...SCARF[d] }));
}

export interface SituationFacts {
  moodDrop: boolean;
  lowEnergy: boolean;
  overload: boolean;
  missedDeadlines: number;
  silence: boolean;
}

/**
 * Hypothèse de départ proposée au manager à partir des signaux (il la confirme ou la change) :
 * surcharge → Pouvoir ; retrait et échéances manquées → Vouloir ; échéances seules → Comprendre.
 */
export function suggestDiagnosis(f: SituationFacts): { diagnosis: Diagnosis; reason: string } | null {
  if (f.overload) return { diagnosis: 'pouvoir', reason: 'Charge ressentie élevée au pouls : vérifiez d’abord les moyens.' };
  if ((f.moodDrop || f.lowEnergy || f.silence) && f.missedDeadlines > 0) {
    return { diagnosis: 'vouloir', reason: 'Retrait (pouls en baisse ou silence) et échéances manquées : écoutez avant de juger.' };
  }
  if (f.moodDrop || f.lowEnergy || f.silence) return { diagnosis: 'vouloir', reason: 'Pouls en baisse : quelque chose a changé pour lui.' };
  if (f.missedDeadlines > 0) return { diagnosis: 'comprendre', reason: 'Échéances manquées sans signal de moral : vérifiez que l’attendu est clair.' };
  return null;
}

/** Conseil de forme selon le profil DISC (le fond ne change pas). */
export function formAdvice(style: DiscStyle | null): string {
  switch (style) {
    case 'D':
      return 'Profil D : soyez bref et factuel, parlez résultats, laissez-lui choisir les moyens.';
    case 'I':
      return 'Profil I : commencez par la relation, reconnaissez son énergie, jamais devant les autres.';
    case 'S':
      return 'Profil S : rassurez, expliquez le pourquoi, une seule demande, sans urgence.';
    case 'C':
      return 'Profil C : apportez des faits précis, des critères clairs, et laissez-lui du temps.';
    default:
      return 'Profil DISC inconnu : renseignez-le avec lui pour adapter la forme de l’échange.';
  }
}
