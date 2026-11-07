import { describe, expect, it } from 'vitest';
import { lastWorkdays, previousWorkday, pulseSignals, streak, weeklyFromPulses, type Pulse } from './pulse';

const pulse = (collaborator_id: string, day: string, mood: number, energy = 4, workload: number | null = 3): Pulse => ({
  id: `${collaborator_id}-${day}`,
  team_id: 't',
  collaborator_id,
  day,
  mood,
  energy,
  workload,
  note: '',
  created_at: '',
  updated_at: '',
});

// 2026-11-09 est un lundi.
describe('jours ouvrés', () => {
  it('saute le week-end', () => {
    expect(previousWorkday('2026-11-09')).toBe('2026-11-06');
    expect(lastWorkdays('2026-11-09', 3)).toEqual(['2026-11-05', '2026-11-06', '2026-11-09']);
  });
});

describe('série', () => {
  it('compte les jours ouvrés consécutifs, sans casser la série avant la saisie du jour', () => {
    const days = ['2026-11-04', '2026-11-05', '2026-11-06'];
    expect(streak(days, '2026-11-09')).toBe(3);
    expect(streak([...days, '2026-11-09'], '2026-11-09')).toBe(4);
    expect(streak(['2026-11-04', '2026-11-06'], '2026-11-09')).toBe(1);
  });
});

describe('signaux', () => {
  const people = [
    { id: 'a', first_name: 'Ana' },
    { id: 'b', first_name: 'Bob' },
    { id: 'c', first_name: 'Cy' },
  ];
  const days = lastWorkdays('2026-11-09', 10).slice(0, 9); // sans aujourd'hui
  it('détecte un moral bas, une baisse et un silence', () => {
    const data = [
      ...days.map((d, i) => pulse('a', d, i >= 6 ? 1 : 4)),
      ...days.map((d, i) => pulse('b', d, i >= 6 ? 3 : 5)),
      ...days.slice(0, 4).map((d) => pulse('c', d, 4)),
    ];
    const kinds = pulseSignals(data, people, '2026-11-09').map((s) => `${s.personId}:${s.kind}`);
    expect(kinds).toContain('a:moral_bas');
    expect(kinds).toContain('b:en_baisse');
    expect(kinds).toContain('c:silence');
  });

  it('détecte une surcharge ressentie', () => {
    const data = days.map((d, i) => pulse('a', d, 4, 4, i >= 6 ? 5 : 3));
    expect(pulseSignals(data, people.slice(0, 1), '2026-11-09').map((s) => s.kind)).toContain('surcharge');
  });
});

describe('agrégat hebdomadaire (ancienne météo)', () => {
  it('moyenne humeur et charge par collaborateur et par semaine', () => {
    const weeks = weeklyFromPulses([pulse('a', '2026-11-02', 2, 4, 5), pulse('a', '2026-11-03', 4, 4, 3), pulse('a', '2026-11-09', 5, 4, null)]);
    const first = weeks.find((w) => w.week_start === '2026-11-02');
    expect(first?.mood).toBe(3);
    expect(first?.workload).toBe(4);
    expect(weeks.find((w) => w.week_start === '2026-11-09')?.workload).toBe(3);
  });
});
