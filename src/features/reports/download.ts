import type { DocumentProps } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
import * as reviewsApi from '@/features/reviews/api';
import { downloadFile } from '@/shared/lib/csv';
import { AppError, toUserMessage } from '@/shared/lib/errors';
import { fullName } from '@/shared/lib/format';
import { toast } from '@/shared/ui/toaster';
import { buildMonthlyReport } from './lib/monthly';
import { loadReportData } from './report-data';

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

/** Génère un PDF à la demande : @react-pdf/renderer n'est chargé qu'au premier export. */
async function render(element: ReturnType<typeof createElement>): Promise<Blob> {
  const { pdf } = await import('@react-pdf/renderer');
  // Chaque composant de document rend un <Document> : le type attendu par pdf() est donc respecté.
  return pdf(element as unknown as ReactElement<DocumentProps>).toBlob();
}

async function run(task: () => Promise<void>): Promise<void> {
  try {
    await task();
    toast.success('PDF généré');
  } catch (error) {
    console.error(error);
    toast.error(toUserMessage(error, 'Le PDF n’a pas pu être généré.'));
  }
}

export const downloadReviewReport = (reviewId: string) =>
  run(async () => {
    const [{ ReviewDocument }, data, review, answers] = await Promise.all([
      import('./pdf/ReviewDocument'),
      loadReportData(),
      reviewsApi.getReview(reviewId),
      reviewsApi.listAnswers(reviewId),
    ]);
    const person = data.people.find((p) => p.id === review.collaborator_id);
    if (!person) throw new AppError('Collaborateur introuvable.');
    const manager = data.people.find((p) => p.id === review.manager_id);
    const actions = data.actions.filter((a) => a.review_id === reviewId);
    const blob = await render(createElement(ReviewDocument, { review, answers, actions, person, manager, company: data.company }));
    downloadFile(blob, `compte-rendu-${slug(fullName(person))}-${review.scheduled_at.slice(0, 10)}.pdf`, 'application/pdf');
  });

export const downloadPersonReport = (personId: string) =>
  run(async () => {
    const [{ PersonDocument }, data] = await Promise.all([import('./pdf/PersonDocument'), loadReportData()]);
    const person = data.people.find((p) => p.id === personId);
    if (!person) throw new AppError('Collaborateur introuvable.');
    const blob = await render(createElement(PersonDocument, { person, data }));
    downloadFile(blob, `fiche-${slug(fullName(person))}.pdf`, 'application/pdf');
  });

export async function teamReportBlob(month: string): Promise<Blob> {
  const [{ TeamDocument }, data] = await Promise.all([import('./pdf/TeamDocument'), loadReportData()]);
  return render(createElement(TeamDocument, { report: buildMonthlyReport(data, month), company: data.company }));
}

export const downloadTeamReport = (month: string) =>
  run(async () => downloadFile(await teamReportBlob(month), `rapport-mensuel-${month}.pdf`, 'application/pdf'));
