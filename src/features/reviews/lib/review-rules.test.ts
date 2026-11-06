import { describe, expect, it } from 'vitest';
import { canEditOwnAnswers, canSeeOtherSide, hasGap, nextRegulatoryDue, prepStatus, reviewStage, type ReviewLike } from './review-rules';

const base: ReviewLike = {
  kind: 'one_to_one',
  status: 'planifie',
  scheduled_at: '2026-11-10T09:00:00Z',
  collaborator_prepared_at: null,
  manager_prepared_at: null,
  collaborator_signed_at: null,
  manager_signed_at: null,
};
const T = '2026-11-01T10:00:00Z';

describe('statut de préparation', () => {
  it('suit les quatre états', () => {
    expect(prepStatus(base)).toBe('a_preparer');
    expect(prepStatus({ ...base, collaborator_prepared_at: T })).toBe('prepare_collaborateur');
    expect(prepStatus({ ...base, manager_prepared_at: T })).toBe('prepare_manager');
    expect(prepStatus({ ...base, collaborator_prepared_at: T, manager_prepared_at: T })).toBe('pret');
  });
});

describe('visibilité croisée des préparations', () => {
  it('le manager ne voit rien tant que le collaborateur n’a pas validé', () => {
    expect(canSeeOtherSide('manager', base)).toBe(false);
    expect(canSeeOtherSide('manager', { ...base, manager_prepared_at: T })).toBe(false);
    expect(canSeeOtherSide('manager', { ...base, collaborator_prepared_at: T })).toBe(true);
  });
  it('le collaborateur voit le manager seulement quand les deux sont prêts', () => {
    expect(canSeeOtherSide('collaborateur', { ...base, collaborator_prepared_at: T })).toBe(false);
    expect(canSeeOtherSide('collaborateur', { ...base, collaborator_prepared_at: T, manager_prepared_at: T })).toBe(true);
  });
  it('le collaborateur ne modifie plus ses réponses après validation', () => {
    expect(canEditOwnAnswers('collaborateur', base)).toBe(true);
    expect(canEditOwnAnswers('collaborateur', { ...base, collaborator_prepared_at: T })).toBe(false);
    expect(canEditOwnAnswers('manager', { ...base, status: 'termine', manager_signed_at: T })).toBe(false);
  });
});

describe('cycle de vie et échéances', () => {
  it('distingue préparation, signature et clôture', () => {
    expect(reviewStage(base)).toBe('preparation');
    expect(reviewStage({ ...base, status: 'termine', manager_signed_at: T })).toBe('a_signer');
    expect(reviewStage({ ...base, status: 'termine', manager_signed_at: T, collaborator_signed_at: T })).toBe('signe');
  });
  it('calcule l’échéance réglementaire', () => {
    expect(nextRegulatoryDue('annuel', '2025-11-20T09:00:00Z', null)).toBe('2026-11-20');
    expect(nextRegulatoryDue('professionnel', null, '2023-02-27')).toBe('2025-02-27');
    expect(nextRegulatoryDue('one_to_one', '2026-10-01', null)).toBeNull();
  });
  it('détecte les écarts d’appréciation', () => {
    expect(hasGap('echelle', 4, 2)).toBe(true);
    expect(hasGap('echelle', 4, 3)).toBe(false);
    expect(hasGap('choix', 'Formation', 'Aucun pour l’instant')).toBe(true);
    expect(hasGap('texte', 'a', 'b')).toBe(false);
  });
});
