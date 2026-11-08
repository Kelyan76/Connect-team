import { notifyReviewRequest } from '@/features/notifications/push';
import { check, unwrap } from '@/shared/lib/errors';
import { supabase } from '@/shared/lib/supabase';
import type { Json, Tables, TablesInsert, TablesUpdate } from '@/shared/types/database';
import type { AnswerValue } from './lib/review-rules';

export type Review = Tables<'reviews'>;
export type Answer = Tables<'review_answers'>;
export type ReviewAction = Tables<'review_actions'>;
export type ReviewRequest = Tables<'review_requests'>;
export type Template = Tables<'review_templates'>;
export type TemplateQuestion = Tables<'template_questions'>;

export interface Question {
  key: string;
  section: string;
  label: string;
  help: string;
  type: 'texte' | 'echelle' | 'choix' | 'oui_non';
  options: string[];
}

/** Questions figées dans l'entretien au moment de sa création. */
export function reviewQuestions(r: Pick<Review, 'questions'>): Question[] {
  return Array.isArray(r.questions) ? (r.questions as unknown as Question[]) : [];
}

export const listReviews = async (): Promise<Review[]> =>
  unwrap(await supabase.from('reviews').select('*').order('scheduled_at', { ascending: false }), 'Entretiens');

export const getReview = async (id: string): Promise<Review> =>
  unwrap(await supabase.from('reviews').select('*').eq('id', id).single(), 'Entretien');

export const listAnswers = async (reviewId: string): Promise<Answer[]> =>
  unwrap(await supabase.from('review_answers').select('*').eq('review_id', reviewId), 'Réponses');

export async function saveAnswer(reviewId: string, key: string, author: 'manager' | 'collaborateur', value: AnswerValue): Promise<void> {
  check(
    await supabase
      .from('review_answers')
      .upsert({ review_id: reviewId, question_key: key, author, value: value as Json }, { onConflict: 'review_id,question_key,author' }),
    'Réponse',
  );
}

export const submitPreparation = async (reviewId: string) =>
  check(await supabase.rpc('submit_review_preparation', { p_review_id: reviewId }), 'Validation préparation');

export const signReview = async (reviewId: string) => check(await supabase.rpc('sign_review', { p_review_id: reviewId }), 'Signature');

export async function updateReview(id: string, patch: TablesUpdate<'reviews'>): Promise<void> {
  check(await supabase.from('reviews').update(patch).eq('id', id), 'Mise à jour entretien');
}

export const listTemplates = async (): Promise<Template[]> =>
  unwrap(await supabase.from('review_templates').select('*').order('kind'), 'Trames');

export const listTemplateQuestions = async (): Promise<TemplateQuestion[]> =>
  unwrap(await supabase.from('template_questions').select('*').order('position'), 'Questions');

export async function scheduleReview(input: TablesInsert<'reviews'>, questions: TemplateQuestion[]): Promise<string> {
  const snapshot: Question[] = questions.map((q) => ({
    key: `q${q.position}`,
    section: q.section,
    label: q.label,
    help: q.help,
    type: q.type,
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
  }));
  const row = unwrap(
    await supabase.from('reviews').insert({ ...input, questions: snapshot as unknown as Json }).select('id').single(),
    'Planification',
  );
  return row.id;
}

export async function saveQuestion(q: TablesInsert<'template_questions'>): Promise<void> {
  check(await supabase.from('template_questions').upsert(q), 'Question');
}

export const deleteQuestion = async (id: string) => check(await supabase.from('template_questions').delete().eq('id', id), 'Question');

export const listActions = async (): Promise<ReviewAction[]> =>
  unwrap(await supabase.from('review_actions').select('*').order('due_date', { nullsFirst: false }), 'Actions');

export const addAction = async (a: TablesInsert<'review_actions'>) => check(await supabase.from('review_actions').insert(a), 'Action');

export async function setActionStatus(id: string, status: ReviewAction['status']): Promise<void> {
  check(
    await supabase
      .from('review_actions')
      .update({ status, done_at: status === 'fait' ? new Date().toISOString() : null })
      .eq('id', id),
    'Action',
  );
}

export const listRequests = async (): Promise<ReviewRequest[]> =>
  unwrap(await supabase.from('review_requests').select('*').order('created_at', { ascending: false }), 'Demandes');

/** Crée la demande puis prévient le manager sur ses appareils (notification Web Push). */
export const createRequest = async (r: TablesInsert<'review_requests'>) => {
  const created = unwrap(await supabase.from('review_requests').insert(r).select('id').single(), 'Demande');
  notifyReviewRequest(created.id);
};

export async function decideRequest(id: string, status: 'validee' | 'refusee', reviewId: string | null): Promise<void> {
  check(
    await supabase.from('review_requests').update({ status, review_id: reviewId, decided_at: new Date().toISOString() }).eq('id', id),
    'Demande',
  );
}
