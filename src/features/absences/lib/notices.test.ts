import { describe, expect, it } from 'vitest';
import { absenceNotices, unseen, type AbsenceLike } from './notices';

const base = { decision_comment: '', decided_at: null } as const;
const list: AbsenceLike[] = [
  {
    ...base,
    id: 'a',
    collaborator_id: 'hugo',
    start_date: '2026-11-23',
    end_date: '2026-11-27',
    status: 'en_attente',
  },
  {
    ...base,
    id: 'b',
    collaborator_id: 'ines',
    start_date: '2026-12-01',
    end_date: '2026-12-02',
    status: 'en_attente',
  },
  {
    id: 'c',
    collaborator_id: 'hugo',
    start_date: '2026-12-22',
    end_date: '2026-12-31',
    status: 'validee',
    decision_comment: 'Bonnes fêtes',
    decided_at: '2026-11-16T10:00:00Z',
  },
  {
    id: 'd',
    collaborator_id: 'hugo',
    start_date: '2026-10-01',
    end_date: '2026-10-02',
    status: 'refusee',
    decision_comment: 'Mise en production',
    decided_at: '2026-10-01T10:00:00Z',
  },
];

describe('notifications de congés', () => {
  it('manager : toutes les demandes en attente', () => {
    const n = absenceNotices(list, 'manager', 'camille', '2026-11-03');
    expect(n.map((x) => x.absenceId)).toEqual(['a', 'b']);
    expect(n[0].kind).toBe('demande');
  });

  it('collaborateur : ses décisions récentes seulement', () => {
    const n = absenceNotices(list, 'collaborateur', 'hugo', '2026-11-03');
    expect(n).toEqual([
      {
        id: 'conge-c-validee',
        absenceId: 'c',
        kind: 'acceptee',
        personId: 'hugo',
        start: '2026-12-22',
        end: '2026-12-31',
        comment: 'Bonnes fêtes',
      },
    ]);
    expect(absenceNotices(list, 'collaborateur', 'ines', '2026-11-03')).toEqual([]);
  });

  it('ne remontre pas une notification déjà vue', () => {
    const n = absenceNotices(list, 'manager', 'camille', '2026-11-03');
    expect(unseen(n, new Set(['conge-a'])).map((x) => x.absenceId)).toEqual(['b']);
  });
});
