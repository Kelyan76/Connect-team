import type { DiscStyle } from './disc';

/**
 * Test DISC rapide (8 questions, environ 2 minutes) : pour chaque situation, la personne choisit
 * la phrase qui lui ressemble le plus. C'est une auto-évaluation indicative pour adapter la forme
 * des échanges, pas un test psychométrique : le résultat reste modifiable à tout moment.
 */

export interface DiscQuestion {
  prompt: string;
  answers: { style: DiscStyle; text: string }[];
}

// L'ordre des réponses varie d'une question à l'autre pour ne pas suggérer un motif.
export const DISC_QUESTIONS: DiscQuestion[] = [
  {
    prompt: 'En réunion, je suis plutôt la personne qui…',
    answers: [
      { style: 'D', text: 'tranche et fait avancer la décision' },
      { style: 'I', text: 'anime et met de l’énergie' },
      { style: 'S', text: 'écoute et veille à ce que chacun suive' },
      { style: 'C', text: 'vérifie les détails et la cohérence' },
    ],
  },
  {
    prompt: 'Face à un nouveau projet, je…',
    answers: [
      { style: 'C', text: 'analyse les risques et prépare un plan précis' },
      { style: 'D', text: 'fonce vers l’objectif' },
      { style: 'S', text: 'prends le temps de comprendre l’organisation' },
      { style: 'I', text: 'en parle autour de moi pour embarquer les autres' },
    ],
  },
  {
    prompt: 'Ce qui me motive le plus au travail :',
    answers: [
      { style: 'S', text: 'une équipe soudée et un cadre stable' },
      { style: 'C', text: 'un travail de qualité, bien fait' },
      { style: 'I', text: 'travailler avec les autres et être reconnu·e' },
      { style: 'D', text: 'relever des défis et obtenir des résultats' },
    ],
  },
  {
    prompt: 'Sous pression, il m’arrive de devenir…',
    answers: [
      { style: 'I', text: 'dispersé·e, je saute d’un sujet à l’autre' },
      { style: 'D', text: 'impatient·e et directif·ve' },
      { style: 'C', text: 'très critique et pointilleux·se' },
      { style: 'S', text: 'silencieux·se : j’encaisse sans le dire' },
    ],
  },
  {
    prompt: 'Je préfère recevoir une consigne…',
    answers: [
      { style: 'D', text: 'courte, avec l’objectif : je choisis comment faire' },
      { style: 'C', text: 'écrite, avec les critères attendus' },
      { style: 'I', text: 'à l’oral, en échangeant' },
      { style: 'S', text: 'expliquée, avec le pourquoi et le temps de m’adapter' },
    ],
  },
  {
    prompt: 'Mes collègues diraient de moi que je suis…',
    answers: [
      { style: 'S', text: 'fiable et patient·e' },
      { style: 'I', text: 'enthousiaste et communicatif·ve' },
      { style: 'D', text: 'déterminé·e et direct·e' },
      { style: 'C', text: 'rigoureux·se et précis·e' },
    ],
  },
  {
    prompt: 'Pour prendre une décision, je m’appuie surtout sur…',
    answers: [
      { style: 'C', text: 'les faits et les données' },
      { style: 'S', text: 'ce qui préserve l’équipe' },
      { style: 'D', text: 'l’efficacité et mon intuition' },
      { style: 'I', text: 'l’avis des autres et l’envie de chacun' },
    ],
  },
  {
    prompt: 'Ce que j’apprécie le moins :',
    answers: [
      { style: 'I', text: 'la routine et travailler isolé·e' },
      { style: 'S', text: 'les changements brusques' },
      { style: 'C', text: 'l’approximation et les erreurs' },
      { style: 'D', text: 'la lenteur et les détours' },
    ],
  },
];

export interface DiscResult {
  primary: DiscStyle;
  secondary: DiscStyle | null;
  scores: Record<DiscStyle, number>;
}

/**
 * Profil à partir des réponses : style dominant = le plus choisi (à égalité, celui choisi le plus
 * récemment) ; style secondaire = le suivant s'il a été choisi au moins deux fois.
 */
export function scoreDisc(answers: DiscStyle[]): DiscResult {
  const scores: Record<DiscStyle, number> = { D: 0, I: 0, S: 0, C: 0 };
  const last: Record<DiscStyle, number> = { D: -1, I: -1, S: -1, C: -1 };
  answers.forEach((s, i) => {
    scores[s] += 1;
    last[s] = i;
  });
  const ranked = (Object.keys(scores) as DiscStyle[]).sort((a, b) => scores[b] - scores[a] || last[b] - last[a]);
  const [primary, second] = ranked;
  return { primary, secondary: scores[second] >= 2 ? second : null, scores };
}
