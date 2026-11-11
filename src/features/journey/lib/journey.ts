/**
 * « Mon parcours » : les réussites d'un collaborateur, rassemblées dans le temps.
 * Uniquement des faits positifs ou de progression (aucune alerte, aucun écart) :
 * c'est sa page, pour voir ses progrès et préparer son entretien annuel.
 */

export type JourneyKind = 'reconnaissance' | 'objectif' | 'mission' | 'competence' | 'engagement' | 'entretien';

export const JOURNEY_KIND: Record<JourneyKind, { label: string; plural: string }> = {
  reconnaissance: { label: 'Reconnaissance', plural: 'Reconnaissances reçues' },
  objectif: { label: 'Objectif atteint', plural: 'Objectifs atteints' },
  mission: { label: 'Mission réussie', plural: 'Missions réussies' },
  competence: { label: 'Compétences', plural: 'Compétences validées' },
  engagement: { label: 'Engagement tenu', plural: 'Engagements tenus' },
  entretien: { label: 'Entretien', plural: 'Entretiens signés' },
};

export const JOURNEY_ORDER: JourneyKind[] = ['reconnaissance', 'objectif', 'mission', 'competence', 'engagement', 'entretien'];

export interface JourneyEvent {
  id: string;
  kind: JourneyKind;
  date: string;
  title: string;
  detail: string;
  /** Nombre d'éléments réunis (compétences validées le même jour). */
  count: number;
}

export interface JourneyInput {
  feedbacks: { id: string; kind: string; is_shared: boolean; body: string; desc_d: string; created_at: string }[];
  objectives: { id: string; title: string; progress: number; due_date: string; keyResults: { validated_at: string | null }[] }[];
  missions: { id: string; title: string; status: string; debrief: string; autonomy: number; updated_at: string }[];
  skills: { skill: string; level: number; validated_at: string | null }[];
  actions: { id: string; title: string; status: string; done_at: string | null }[];
  reviews: { id: string; kind: string; label: string; summary: string; collaborator_signed_at: string | null; manager_signed_at: string | null; scheduled_at: string }[];
}

const day = (iso: string) => iso.slice(0, 10);

export function buildJourney(i: JourneyInput): JourneyEvent[] {
  const events: JourneyEvent[] = [];
  for (const f of i.feedbacks) {
    if (!f.is_shared || (f.kind !== 'reconnaissance' && f.kind !== 'point_fort')) continue;
    events.push({ id: `fb-${f.id}`, kind: 'reconnaissance', date: day(f.created_at), title: 'Reconnaissance de votre manager', detail: f.desc_d || f.body, count: 1 });
  }
  for (const o of i.objectives) {
    if (o.progress < 1) continue;
    const last = o.keyResults.map((k) => k.validated_at).filter((d): d is string => !!d).sort().pop();
    events.push({ id: `obj-${o.id}`, kind: 'objectif', date: day(last ?? o.due_date), title: o.title, detail: 'Objectif atteint', count: 1 });
  }
  for (const m of i.missions) {
    if (m.status !== 'terminee') continue;
    events.push({ id: `mi-${m.id}`, kind: 'mission', date: day(m.updated_at), title: m.title, detail: m.debrief || `Mission menée avec une autonomie de ${m.autonomy}/5`, count: 1 });
  }
  // Compétences validées : une ligne par jour de validation (« 4 compétences validées »).
  const byDay = new Map<string, { skill: string; level: number }[]>();
  for (const s of i.skills) {
    if (!s.validated_at || s.level < 2) continue;
    const d = day(s.validated_at);
    byDay.set(d, [...(byDay.get(d) ?? []), s]);
  }
  for (const [d, list] of byDay) {
    const sorted = [...list].sort((a, b) => b.level - a.level || a.skill.localeCompare(b.skill));
    events.push({
      id: `sk-${d}`,
      kind: 'competence',
      date: d,
      title: list.length > 1 ? `${list.length} compétences validées` : `Compétence validée : ${list[0].skill}`,
      detail: sorted.map((s) => `${s.skill} (${s.level}/4)`).join(' · '),
      count: list.length,
    });
  }
  for (const a of i.actions) {
    if (a.status !== 'fait' || !a.done_at) continue;
    events.push({ id: `ac-${a.id}`, kind: 'engagement', date: day(a.done_at), title: a.title, detail: 'Engagement pris en 1 à 1 et tenu', count: 1 });
  }
  for (const r of i.reviews) {
    if (!r.collaborator_signed_at || !r.manager_signed_at) continue;
    events.push({ id: `rv-${r.id}`, kind: 'entretien', date: day(r.scheduled_at), title: r.label, detail: r.summary, count: 1 });
  }
  return events.sort((a, b) => b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind));
}

/** Totaux par type (les compétences comptent chacune). */
export function journeyTotals(events: JourneyEvent[]): Record<JourneyKind, number> {
  const totals = Object.fromEntries(JOURNEY_ORDER.map((k) => [k, 0])) as Record<JourneyKind, number>;
  for (const e of events) totals[e.kind] += e.count;
  return totals;
}

/** Événements regroupés par mois, du plus récent au plus ancien. */
export function byMonth(events: JourneyEvent[]): { month: string; events: JourneyEvent[] }[] {
  const out: { month: string; events: JourneyEvent[] }[] = [];
  for (const e of events) {
    const month = e.date.slice(0, 7);
    const group = out.find((g) => g.month === month);
    if (group) group.events.push(e);
    else out.push({ month, events: [e] });
  }
  return out;
}

/** Texte prêt à coller dans la préparation de l'entretien annuel. */
export function annualSummary(events: JourneyEvent[], since: string): string {
  const recent = events.filter((e) => e.date >= since && e.kind !== 'entretien');
  const totals = journeyTotals(recent);
  const lines = ['Mes réussites de l’année'];
  const counts = JOURNEY_ORDER.filter((k) => k !== 'entretien' && totals[k] > 0).map((k) => `${JOURNEY_KIND[k].plural} : ${totals[k]}`);
  if (counts.length) lines.push(counts.join(' · '));
  for (const k of ['mission', 'objectif', 'reconnaissance'] as const) {
    for (const e of recent.filter((x) => x.kind === k).slice(0, 3)) lines.push(`- ${e.title}${e.detail && e.kind !== 'objectif' ? ` : ${e.detail}` : ''}`);
  }
  return lines.join('\n');
}
