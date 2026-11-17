/**
 * Assistant IA (servi par l'application Echo) : consignes envoyées et lecture des réponses.
 * Règle : on n'envoie que le prénom et le texte du formulaire, jamais de nom de famille ni d'e-mail.
 * L'IA propose, le manager relit et valide : rien n'est enregistré sans lui.
 */

export const AI_CONTEXT =
  'Tu es l’assistant de Connect Team, un outil d’accompagnement pour managers de proximité. ' +
  'Tu appliques les outils du cours Keylia : 1 à 1, feedback DESC, DISC, objectifs SMART, délégation, SCARF, leviers DREAM. ' +
  'Tu réponds en français, avec bienveillance, de façon concrète et brève. Tu n’inventes jamais de faits, de dates ni de chiffres absents du message.';

const JSON_ONLY =
  'Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans bloc de code.';

/** Extrait le premier objet JSON d'une réponse (tolère un bloc ```json ou du texte autour). */
export function extractJson(reply: string): unknown {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(reply.slice(start, end + 1));
  } catch {
    return null;
  }
}

const str = (v: unknown, max = 1000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

// ─── Feedback DESC ──────────────────────────────────────────────────────

export interface DescInput {
  kindLabel: string;
  goal: string;
  steps: ('d' | 'e' | 's' | 'c')[];
  firstName: string;
  disc?: string;
  raw: string;
  parts: Record<'d' | 'e' | 's' | 'c', string>;
}

export function descPrompt(i: DescInput): string {
  const current = i.steps
    .map((s) => `${s.toUpperCase()} : ${i.parts[s].trim() || '(vide)'}`)
    .join('\n');
  return [
    `Rédige un feedback de type « ${i.kindLabel} » (but : ${i.goal}) pour ${i.firstName || 'le collaborateur'}, avec la méthode DESC.`,
    i.disc ? `Profil DISC du collaborateur : ${i.disc}. Adapte la forme, jamais le fond.` : '',
    i.raw.trim() ? `Ce que le manager veut dire, avec ses mots : « ${i.raw.trim()} »` : '',
    `Brouillon actuel :\n${current}`,
    'Règles : D = faits observables et datés si possible, sans jugement ni généralisation (« toujours », « jamais ») ; E = ressenti du manager, au « je » ; S = une demande précise, réaliste et datée ; C = conséquence positive pour le collaborateur et l’équipe. Tutoiement, 1 à 2 phrases par lettre.',
    `${JSON_ONLY} Forme : {${i.steps.map((s) => `"${s}":"..."`).join(',')}}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function parseDesc(
  reply: string,
  steps: DescInput['steps'],
): Partial<Record<'d' | 'e' | 's' | 'c', string>> | null {
  const o = obj(extractJson(reply));
  if (!o) return null;
  const out: Partial<Record<'d' | 'e' | 's' | 'c', string>> = {};
  for (const s of steps) {
    const v = str(o[s] ?? o[s.toUpperCase()]);
    if (v) out[s] = v;
  }
  return Object.keys(out).length ? out : null;
}

// ─── Objectif SMART ─────────────────────────────────────────────────────

export interface SmartInput {
  title: string;
  description: string;
  firstName?: string;
  dueDate?: string;
}
export interface SmartProposal {
  title: string;
  description: string;
  means: string;
  keyResults: { title: string; unit: string; start_value: number; target_value: number }[];
}

export function smartPrompt(i: SmartInput): string {
  return [
    `Reformule cet objectif en objectif SMART (Spécifique, Mesurable, Atteignable, Réaliste, Temporel), centré sur le résultat attendu et pas seulement sur l’action.`,
    `Objectif : « ${i.title.trim()} »`,
    i.description.trim() ? `Précisions : « ${i.description.trim()} »` : '',
    i.firstName ? `Responsable : ${i.firstName}.` : 'Objectif d’équipe.',
    i.dueDate ? `Échéance : ${i.dueDate}.` : '',
    'Propose 1 à 3 résultats clés chiffrés (valeur de départ et cible, unité courte comme %, j, nb) et les moyens que le manager peut apporter.',
    `${JSON_ONLY} Forme : {"title":"...","description":"...","means":"...","keyResults":[{"title":"...","unit":"%","start_value":0,"target_value":100}]}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function parseSmart(reply: string): SmartProposal | null {
  const o = obj(extractJson(reply));
  if (!o) return null;
  const title = str(o.title, 160);
  if (title.length < 3) return null;
  const krs = Array.isArray(o.keyResults) ? o.keyResults : [];
  const keyResults = krs
    .map(obj)
    .filter((k): k is Record<string, unknown> => !!k)
    .map((k) => ({
      title: str(k.title, 200),
      unit: str(k.unit, 20),
      start_value: Number.isFinite(Number(k.start_value)) ? Number(k.start_value) : 0,
      target_value: Number.isFinite(Number(k.target_value)) ? Number(k.target_value) : 100,
    }))
    .filter((k) => k.title.length >= 3)
    .slice(0, 3);
  return { title, description: str(o.description, 2000), means: str(o.means, 500), keyResults };
}

// ─── Préparation du 1 à 1 ───────────────────────────────────────────────

export interface PrepInput {
  firstName: string;
  disc?: string;
  signals: string[];
}

export function prepPrompt(i: PrepInput): string {
  return [
    `Je prépare mon prochain 1 à 1 avec ${i.firstName} (kit Keylia : 10 min pour lui, 10 min pour moi, 10 min pour son développement).`,
    i.disc ? `Son profil DISC : ${i.disc}.` : '',
    i.signals.length
      ? `Ce que montrent ses données récentes :\n- ${i.signals.join('\n- ')}`
      : 'Aucun signal particulier ces dernières semaines.',
    'Propose 3 questions ouvertes, bienveillantes et adaptées à son style, pour ouvrir l’échange sans l’accuser. Pas de questions fermées.',
    `${JSON_ONLY} Forme : {"questions":["...","...","..."]}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function parseQuestions(reply: string): string[] | null {
  const o = obj(extractJson(reply));
  const list =
    o && Array.isArray(o.questions)
      ? o.questions.map((q) => str(q, 300)).filter((q) => q.length > 5)
      : [];
  return list.length ? list.slice(0, 5) : null;
}

// ─── Décider ────────────────────────────────────────────────────────────

export interface DecisionInput {
  firstName: string;
  situation: string;
  diagnosis: string;
  response: string;
  disc?: string;
  scarfRisks: string[];
}

export function decisionPrompt(i: DecisionInput): string {
  return [
    `Situation avec ${i.firstName || 'un collaborateur'}, en faits : « ${i.situation.trim()} »`,
    `Mon diagnostic : ${i.diagnosis}. Réponse adaptée selon le cours : ${i.response}`,
    i.disc ? `Son profil DISC : ${i.disc}.` : '',
    i.scarfRisks.length
      ? `Besoins SCARF menacés par ma décision : ${i.scarfRisks.join(', ')}. Propose comment les préserver.`
      : '',
    'Propose une décision concrète en 2 ou 3 phrases : ce que je fais, quand, et la prochaine étape datée. Première personne (« je »).',
    `${JSON_ONLY} Forme : {"decision":"..."}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function parseDecision(reply: string): string | null {
  const o = obj(extractJson(reply));
  const d = o ? str(o.decision, 1000) : '';
  return d.length > 5 ? d : null;
}
