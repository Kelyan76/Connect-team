/**
 * DISC : adapter la forme de sa communication au profil de l'autre, jamais le fond
 * (cours « Le feed-back et la méthode DESC », diapositive « Adapter la forme au profil DISC »).
 */

export type DiscStyle = 'D' | 'I' | 'S' | 'C';

export const DISC_STYLES: DiscStyle[] = ['D', 'I', 'S', 'C'];

export const DISC: Record<DiscStyle, { name: string; short: string; traits: string; do: string; avoid: string; oneToOne: string; tone: string; soft: string }> = {
  D: {
    name: 'Dominant',
    short: 'Direct, orienté résultats',
    traits: 'Rapide, décidé, aime les défis et choisir ses moyens.',
    do: 'Aller droit au but, D et S très courts, parler résultats, lui laisser le choix des moyens.',
    avoid: 'Détours, morale, rapport de force en public.',
    oneToOne: 'Ordre du jour court, décisions claires, lui confier un défi.',
    tone: 'text-danger',
    soft: 'bg-danger-subtle text-danger',
  },
  I: {
    name: 'Influent',
    short: 'Relationnel, enthousiaste',
    traits: 'Communicatif, énergique, sensible à la reconnaissance.',
    do: 'Commencer par la relation, reconnaître son énergie, parler image et équipe dans les conséquences.',
    avoid: 'Froideur, message seulement écrit, critique devant les autres.',
    oneToOne: 'Laisser du temps à l’échange, valoriser publiquement les réussites.',
    tone: 'text-warning',
    soft: 'bg-warning-subtle text-warning',
  },
  S: {
    name: 'Stable',
    short: 'Coopératif, constant',
    traits: 'Patient, fiable, attaché à l’harmonie et à la sécurité.',
    do: 'Cadre rassurant, rythme lent, expliquer le pourquoi, une seule demande.',
    avoid: 'Surprise, urgence, plusieurs changements d’un coup.',
    oneToOne: 'Prévenir à l’avance des changements, vérifier son ressenti.',
    tone: 'text-success',
    soft: 'bg-success-subtle text-success',
  },
  C: {
    name: 'Consciencieux',
    short: 'Rigoureux, analytique',
    traits: 'Précis, exigeant sur la qualité, besoin de faits.',
    do: 'Faits précis et documentés, critères clairs, temps pour réfléchir, suivi écrit.',
    avoid: 'Approximation, émotion forte, absence de preuve.',
    oneToOne: 'Envoyer les sujets à l’avance, conclure par un récapitulatif écrit.',
    tone: 'text-accent',
    soft: 'bg-accent-subtle text-accent',
  },
};

export const DISC_SOURCE: Record<'auto_evaluation' | 'echange', string> = {
  auto_evaluation: 'Auto-évaluation du collaborateur',
  echange: 'Établi ensemble en entretien',
};

export const discLabel = (primary: DiscStyle, secondary: DiscStyle | null) =>
  secondary ? `${primary}${secondary} · ${DISC[primary].name}, ${DISC[secondary].name.toLowerCase()}` : `${primary} · ${DISC[primary].name}`;
