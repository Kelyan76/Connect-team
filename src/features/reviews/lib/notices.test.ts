import { describe, expect, it } from 'vitest';
import { reviewNotices, type RequestLike, type ReviewLike } from './notices';

const r = (over: Partial<ReviewLike>): ReviewLike => ({
  id: 'r1',
  collaborator_id: 'hugo',
  status: 'planifie',
  scheduled_at: '2026-11-20T09:00:00Z',
  created_at: '2026-11-16T09:00:00Z',
  collaborator_prepared_at: null,
  manager_signed_at: null,
  collaborator_signed_at: null,
  ...over,
});
const since = '2026-11-10';

describe('notifications du 1 à 1', () => {
  it('collaborateur : 1 à 1 planifié par le manager, puis compte-rendu à signer', () => {
    expect(reviewNotices([r({})], [], 'collaborateur', 'hugo', since).map((n) => n.kind)).toEqual([
      'planifie',
    ]);
    const toSign = r({
      status: 'termine',
      created_at: '2026-10-01T09:00:00Z',
      manager_signed_at: '2026-11-15T10:00:00Z',
    });
    expect(reviewNotices([toSign], [], 'collaborateur', 'hugo', since).map((n) => n.kind)).toEqual([
      'a_signer',
    ]);
    expect(reviewNotices([r({})], [], 'collaborateur', 'ines', since)).toEqual([]);
  });

  it('collaborateur : demande acceptée (sans doublon « planifié ») ou refusée', () => {
    const reqs: RequestLike[] = [
      {
        id: 'q1',
        collaborator_id: 'hugo',
        status: 'validee',
        decided_at: '2026-11-16T09:01:00Z',
        review_id: 'r1',
      },
      {
        id: 'q2',
        collaborator_id: 'hugo',
        status: 'refusee',
        decided_at: '2026-11-12T09:00:00Z',
        review_id: null,
      },
      {
        id: 'q3',
        collaborator_id: 'hugo',
        status: 'en_attente',
        decided_at: null,
        review_id: null,
      },
    ];
    const n = reviewNotices([r({})], reqs, 'collaborateur', 'hugo', since);
    expect(n.map((x) => x.kind)).toEqual(['acceptee', 'refusee']);
    expect(n[0].scheduledAt).toBe('2026-11-20T09:00:00Z');
  });

  it('manager : préparation validée et signature du collaborateur', () => {
    const prepared = r({ collaborator_prepared_at: '2026-11-16T08:00:00Z' });
    const signed = r({
      id: 'r2',
      status: 'termine',
      collaborator_signed_at: '2026-11-17T08:00:00Z',
    });
    expect(
      reviewNotices([prepared, signed], [], 'manager', 'camille', since).map((n) => n.kind),
    ).toEqual(['signee', 'preparee']);
  });

  it('ignore ce qui est plus ancien que la fenêtre', () => {
    expect(
      reviewNotices(
        [r({ created_at: '2026-10-01T09:00:00Z' })],
        [],
        'collaborateur',
        'hugo',
        since,
      ),
    ).toEqual([]);
  });
});
