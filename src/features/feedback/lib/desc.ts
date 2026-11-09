/**
 * Feedback : les trois feedbacks du manager et la méthode DESC (Sharon et Gordon Bower, 1976),
 * d'après le cours « Le feed-back et la méthode DESC ».
 */

export type CourseFeedbackKind = 'reconnaissance' | 'amelioration' | 'recadrage';
export type DescStep = 'd' | 'e' | 's' | 'c';

export const FEEDBACK_TYPES: Record<CourseFeedbackKind, { label: string; when: string; goal: string; example: string; steps: DescStep[] }> = {
  reconnaissance: {
    label: 'Reconnaissance',
    when: 'Dès qu’un comportement utile est observé',
    goal: 'Faire durer ce qui marche',
    example: '« Ta relance à J+2 a débloqué le dossier Durand. »',
    steps: ['d', 'e'],
  },
  amelioration: {
    label: 'Amélioration',
    when: 'Un écart ponctuel, sans enjeu grave',
    goal: 'Ajuster une pratique',
    example: '« J’ai un point à te partager sur le rendez-vous de ce matin. »',
    steps: ['d', 'e', 's', 'c'],
  },
  recadrage: {
    label: 'Recadrage',
    when: 'Un écart répété ou une règle franchie',
    goal: 'Faire cesser un comportement',
    example: '« Je veux qu’on parle de la réunion de lundi : c’est la deuxième fois. »',
    steps: ['d', 'e', 's', 'c'],
  },
};

export const DESC_STEPS: Record<DescStep, { letter: string; label: string; hint: string; placeholder: string; trap: string }> = {
  d: {
    letter: 'D',
    label: 'Décrire',
    hint: 'Les faits observés, datés, vérifiables : ce qu’une caméra aurait filmé.',
    placeholder: 'Mardi au daily, tu as…',
    trap: 'Juger, généraliser, prêter une intention',
  },
  e: {
    letter: 'E',
    label: 'Exprimer',
    hint: 'Ce que je ressens ou ce que cela me pose comme problème, en « je ».',
    placeholder: 'Je suis préoccupée parce que…',
    trap: 'Le « tu » accusateur, l’émotion débordée',
  },
  s: {
    letter: 'S',
    label: 'Spécifier',
    hint: 'Une question ouverte d’abord, puis le comportement attendu : précis, une seule demande.',
    placeholder: 'Comment l’as-tu vécu ? Je te demande de…',
    trap: 'Une demande floue, ou trois à la fois',
  },
  c: {
    letter: 'C',
    label: 'Conséquences',
    hint: 'Les effets positifs du changement. En recadrage, la suite si rien ne change, sans menace.',
    placeholder: 'Comme ça, tu pourras…',
    trap: 'La menace, ou une conséquence qu’on n’appliquera pas',
  },
};

export type DescParts = Record<DescStep, string>;

export const emptyDesc = (): DescParts => ({ d: '', e: '', s: '', c: '' });

/** Message complet, dans l'ordre D, E, S, C (étapes non utilisées ignorées). */
export function composeFeedback(kind: CourseFeedbackKind, parts: DescParts): string {
  return FEEDBACK_TYPES[kind].steps
    .map((s) => parts[s].trim())
    .filter(Boolean)
    .join(' ');
}

export interface LintIssue {
  id: string;
  step: DescStep;
  title: string;
  advice: string;
}

const has = (text: string, re: RegExp) => re.test(text.toLowerCase());

const JUDGMENTS = /\b(nul(le)?|incompétent(e)?|fainéant(e)?|paresseu(x|se)|irresponsable|pas sérieu(x|se)|manque(s)? de sérieux|pas professionnel(le)?|désinvolte|je-m'en-foutiste|bâcl(é|e)|négligent(e)?)\b/;
const GENERALIZATIONS = /\b(toujours|jamais|tout le temps|à chaque fois|systématiquement|sans arrêt|encore une fois)\b/;
const THREATS = /\b(sinon|sanction|avertissement|licenci|dernière fois|tu vas voir)\b/;

/**
 * Pièges du cours repérés dans le texte : « mais », « tu dois », généralisations, jugements,
 * « tu » accusateur dans l'expression, menace dans les conséquences, demande multiple.
 */
export function lintFeedback(kind: CourseFeedbackKind, parts: DescParts): LintIssue[] {
  const issues: LintIssue[] = [];
  const steps = FEEDBACK_TYPES[kind].steps;
  for (const step of steps) {
    const text = parts[step];
    if (!text.trim()) continue;
    if (has(text, /\bmais\b/)) {
      issues.push({ id: `mais-${step}`, step, title: '« Mais » efface ce qui précède', advice: 'Remplacez par « et », ou séparez clairement les deux messages.' });
    }
    if (has(text, /\b(tu dois|vous devez|il faut que tu|il faudrait que tu)\b/)) {
      issues.push({ id: `doit-${step}`, step, title: 'Injonction « tu dois »', advice: 'Préférez « Je te demande de… », « Que penserais-tu de… ? ».' });
    }
    if (has(text, GENERALIZATIONS)) {
      issues.push({ id: `gen-${step}`, step, title: 'Généralisation', advice: '« Toujours », « jamais » : une exception suffit à tout décrédibiliser. Citez des faits datés.' });
    }
    if (has(text, JUDGMENTS) || has(text, /\btu es (un|une|trop|vraiment|pas)\b/)) {
      issues.push({ id: `jug-${step}`, step, title: 'Jugement sur la personne', advice: 'Parlez du comportement observé, pas de la personne (relation Adulte–Adulte).' });
    }
  }
  if (parts.e.trim() && !has(parts.e, /\b(je|j['’]|me|m['’]|moi)/)) {
    issues.push({ id: 'e-je', step: 'e', title: 'Exprimez-vous en « je »', advice: 'Dites ce que vous ressentez ou ce que cela vous pose comme problème.' });
  }
  if (steps.includes('c') && has(parts.c, THREATS)) {
    issues.push({ id: 'c-menace', step: 'c', title: 'Conséquence vécue comme une menace', advice: 'Énoncez la suite logique, calmement, et seulement si vous l’appliquerez.' });
  }
  if (steps.includes('s') && (parts.s.match(/\bje te demande\b/gi) ?? []).length > 1) {
    issues.push({ id: 's-multiple', step: 's', title: 'Plusieurs demandes à la fois', advice: 'Une seule demande précise : les autres attendront le prochain point.' });
  }
  if (steps.includes('s') && parts.s.trim() && !parts.s.includes('?')) {
    issues.push({ id: 's-question', step: 's', title: 'Commencez par une question ouverte', advice: '« Comment l’as-tu vécu ? », « Qu’est-ce qui t’a mis en retard ? » : écouter avant de demander.' });
  }
  return issues;
}

/** Étapes obligatoires renseignées ? */
export function missingSteps(kind: CourseFeedbackKind, parts: DescParts): DescStep[] {
  return FEEDBACK_TYPES[kind].steps.filter((s) => parts[s].trim().length < 3);
}
