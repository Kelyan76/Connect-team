import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/lib/query-keys';
import { toast } from '@/shared/ui/toaster';
import * as api from './api';
import type { AnswerValue } from './lib/review-rules';

export const useReviews = () => useQuery({ queryKey: qk.reviews, queryFn: api.listReviews });
export const useReview = (id: string) => useQuery({ queryKey: qk.review(id), queryFn: () => api.getReview(id) });
export const useAnswers = (id: string) => useQuery({ queryKey: qk.answers(id), queryFn: () => api.listAnswers(id) });
export const useTemplates = () => useQuery({ queryKey: qk.templates, queryFn: api.listTemplates });
export const useTemplateQuestions = () => useQuery({ queryKey: qk.templateQuestions, queryFn: api.listTemplateQuestions });
export const useReviewActions = () => useQuery({ queryKey: qk.reviewActions, queryFn: api.listActions });
/** Demandes de one-to-one : rafraîchies toutes les 30 s pour notifier le manager sans recharger la page. */
export const useReviewRequests = () =>
  useQuery({ queryKey: qk.reviewRequests, queryFn: api.listRequests, refetchInterval: 30_000, refetchIntervalInBackground: false });

function useInvalidateReview() {
  const qc = useQueryClient();
  return (id?: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.reviews }),
      id ? qc.invalidateQueries({ queryKey: qk.answers(id) }) : Promise.resolve(),
    ]);
}

/** Enregistrement automatique d'une réponse, avec mise à jour optimiste du cache. */
export function useSaveAnswer(reviewId: string, author: 'manager' | 'collaborateur') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: AnswerValue }) => api.saveAnswer(reviewId, key, author, value),
    onMutate: ({ key, value }) => {
      qc.setQueryData<api.Answer[]>(qk.answers(reviewId), (list = []) => {
        const rest = list.filter((a) => !(a.question_key === key && a.author === author));
        return [...rest, { review_id: reviewId, question_key: key, author, value, updated_at: new Date().toISOString() }];
      });
    },
  });
}

export function useSubmitPreparation(reviewId: string) {
  const invalidate = useInvalidateReview();
  return useMutation({
    mutationFn: () => api.submitPreparation(reviewId),
    onSuccess: () => {
      toast.success('Préparation validée');
      return invalidate(reviewId);
    },
  });
}

export function useSignReview(reviewId: string) {
  const invalidate = useInvalidateReview();
  return useMutation({
    mutationFn: () => api.signReview(reviewId),
    onSuccess: () => {
      toast.success('Compte-rendu signé');
      return invalidate(reviewId);
    },
  });
}

export function useUpdateReview(reviewId: string, message?: string) {
  const invalidate = useInvalidateReview();
  return useMutation({
    mutationFn: (patch: Parameters<typeof api.updateReview>[1]) => api.updateReview(reviewId, patch),
    onSuccess: () => {
      if (message) toast.success(message);
      return invalidate(reviewId);
    },
  });
}

export function useScheduleReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, questions }: { input: Parameters<typeof api.scheduleReview>[0]; questions: api.TemplateQuestion[] }) =>
      api.scheduleReview(input, questions),
    onSuccess: () => {
      toast.success('Entretien planifié');
      return Promise.all([qc.invalidateQueries({ queryKey: qk.reviews }), qc.invalidateQueries({ queryKey: qk.reviewRequests })]);
    },
  });
}

export function useAddAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addAction,
    onSuccess: () => {
      toast.success('Action ajoutée au plan');
      return qc.invalidateQueries({ queryKey: qk.reviewActions });
    },
  });
}

export function useSetActionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: api.ReviewAction['status'] }) => api.setActionStatus(id, status),
    onMutate: ({ id, status }) => {
      qc.setQueryData<api.ReviewAction[]>(qk.reviewActions, (list) => list?.map((a) => (a.id === id ? { ...a, status } : a)));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.reviewActions }),
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createRequest,
    onSuccess: () => {
      toast.success('Demande envoyée à votre manager');
      return qc.invalidateQueries({ queryKey: qk.reviewRequests });
    },
  });
}

export function useDecideRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reviewId }: { id: string; status: 'validee' | 'refusee'; reviewId: string | null }) =>
      api.decideRequest(id, status, reviewId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.reviewRequests }),
  });
}

export function useSaveQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveQuestion,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.templateQuestions }),
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteQuestion,
    onSuccess: () => {
      toast.success('Question supprimée');
      return qc.invalidateQueries({ queryKey: qk.templateQuestions });
    },
  });
}
