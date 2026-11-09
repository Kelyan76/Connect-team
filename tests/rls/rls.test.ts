import type { PGlite, Transaction } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { asUser, openTestDatabase } from '../../tools/db-node';

/**
 * Politiques RLS testées sur une vraie base PostgreSQL (PGlite) avec le jeu de démonstration.
 * Règle d'or : un collaborateur ne voit jamais les données d'un autre ni les notes privées du manager.
 */
const CLAIRE = '11111111-0000-4000-8000-000000000101'; // manager
const KARIM = '11111111-0000-4000-8000-000000000106';
const NADIA = '11111111-0000-4000-8000-000000000103';
const JULIEN = '11111111-0000-4000-8000-000000000102';

let db: PGlite;
beforeAll(async () => {
  db = await openTestDatabase();
});

const count = async (tx: Transaction, sql: string, params: unknown[] = []) =>
  (await tx.query<{ n: number }>(`select count(*)::int as n from (${sql}) s`, params)).rows[0].n;

const PERSONAL_TABLES: [string, string][] = [
  ['weather_entries', 'collaborator_id'],
  ['feedbacks', 'collaborator_id'],
  ['skill_levels', 'collaborator_id'],
  ['reviews', 'collaborator_id'],
  ['absences', 'collaborator_id'],
  ['workload_allocations', 'collaborator_id'],
  ['delegations', 'collaborator_id'],
  ['tasks', 'assignee_id'],
  ['review_requests', 'collaborator_id'],
  ['daily_pulses', 'collaborator_id'],
  ['disc_profiles', 'collaborator_id'],
  ['delegation_missions', 'collaborator_id'],
];

describe('isolation entre collaborateurs', () => {
  it.each(PERSONAL_TABLES)('%s : Nadia ne voit aucune ligne d’un autre collaborateur', async (table, column) => {
    const others = await asUser(db, NADIA, (tx) => count(tx, `select 1 from public.${table} where ${column} <> $1`, [NADIA]));
    expect(others).toBe(0);
  });

  it('le manager voit les données de toute l’équipe', async () => {
    const people = await asUser(db, CLAIRE, (tx) => count(tx, 'select distinct collaborator_id from public.daily_pulses'));
    expect(people).toBe(7);
  });

  it('un collaborateur ne voit que sa fiche et celle de son manager', async () => {
    const ids = await asUser(db, NADIA, async (tx) => (await tx.query<{ id: string }>('select id from public.profiles order by id')).rows.map((r) => r.id));
    expect(ids).toEqual([CLAIRE, NADIA]);
  });

  it('les objectifs individuels des autres sont invisibles', async () => {
    const others = await asUser(db, NADIA, (tx) =>
      count(tx, "select 1 from public.objectives where scope = 'individuel' and owner_id <> $1", [NADIA]),
    );
    expect(others).toBe(0);
  });

  it('un utilisateur anonyme ne lit rien', async () => {
    await expect(asUser(db, null, (tx) => count(tx, 'select 1 from public.profiles'))).rejects.toThrow(/permission denied/);
  });
});

describe('notes privées et feedbacks privés', () => {
  it('le collaborateur ne lit jamais le carnet d’observations, même le sien', async () => {
    expect(await asUser(db, JULIEN, (tx) => count(tx, 'select 1 from public.observations'))).toBe(0);
    expect(await asUser(db, CLAIRE, (tx) => count(tx, 'select 1 from public.observations where collaborator_id = $1', [JULIEN]))).toBeGreaterThan(0);
  });

  it('le collaborateur ne peut pas écrire de note privée', async () => {
    await expect(
      asUser(db, JULIEN, (tx) => tx.query('insert into public.manager_notes (collaborator_id, author_id, body) values ($1, $1, $2)', [JULIEN, 'test'])),
    ).rejects.toThrow(/row-level security/);
  });

  it('les feedbacks non partagés restent invisibles pour le collaborateur', async () => {
    expect(await asUser(db, KARIM, (tx) => count(tx, 'select 1 from public.feedbacks where not is_shared'))).toBe(0);
    expect(await asUser(db, CLAIRE, (tx) => count(tx, 'select 1 from public.feedbacks where collaborator_id = $1 and not is_shared', [KARIM]))).toBe(1);
  });
});

describe('préparation des entretiens en deux temps', () => {
  const NADIA_NEXT = '66666666-0000-4000-8000-000000000142';
  const JULIEN_ANNUAL = '66666666-0000-4000-8000-000000000144'; // préparé par le collaborateur
  const THOMAS_NEXT = '66666666-0000-4000-8000-000000000141'; // préparé par le manager seul

  it('le manager ne voit pas la préparation en cours du collaborateur', async () => {
    const seen = await asUser(db, CLAIRE, async (tx) => {
      await tx.query('select set_config($1, $2, true)', ['request.jwt.claims', JSON.stringify({ sub: NADIA, role: 'authenticated' })]);
      await tx.query("insert into public.review_answers (review_id, question_key, author, value) values ($1, 'q1', 'collaborateur', '\"brouillon\"')", [NADIA_NEXT]);
      await tx.query('select set_config($1, $2, true)', ['request.jwt.claims', JSON.stringify({ sub: CLAIRE, role: 'authenticated' })]);
      return count(tx, "select 1 from public.review_answers where review_id = $1 and author = 'collaborateur'", [NADIA_NEXT]);
    });
    expect(seen).toBe(0);
  });

  it('le manager voit la préparation une fois validée par le collaborateur', async () => {
    expect(await asUser(db, CLAIRE, (tx) => count(tx, "select 1 from public.review_answers where review_id = $1 and author = 'collaborateur'", [JULIEN_ANNUAL]))).toBeGreaterThan(0);
  });

  it('le collaborateur ne voit pas la préparation du manager tant que l’entretien n’est pas prêt', async () => {
    const thomas = '11111111-0000-4000-8000-000000000107';
    expect(await asUser(db, thomas, (tx) => count(tx, "select 1 from public.review_answers where review_id = $1 and author = 'manager'", [THOMAS_NEXT]))).toBe(0);
  });

  it('le collaborateur ne peut plus modifier ses réponses après validation', async () => {
    await expect(
      asUser(db, JULIEN, (tx) => tx.query("update public.review_answers set value = '\"modifié\"' where review_id = $1 and author = 'collaborateur'", [JULIEN_ANNUAL]).then((r) => r.affectedRows)),
    ).resolves.toBe(0);
  });

  it('un collaborateur ne peut pas signer à la place du manager ni se valider seul', async () => {
    await expect(asUser(db, KARIM, (tx) => tx.query('select public.sign_review($1)', [JULIEN_ANNUAL]))).rejects.toThrow();
  });

  it('un compte-rendu signé des deux parties est figé', async () => {
    const signed = '66666666-0000-4000-8000-000000000101';
    await expect(asUser(db, CLAIRE, (tx) => tx.query("update public.reviews set summary = 'x' where id = $1", [signed]))).rejects.toThrow(/signé/);
  });
});

describe('écritures limitées du collaborateur', () => {
  it('ne peut modifier que le statut de ses tâches', async () => {
    const id = await asUser(db, NADIA, async (tx) => (await tx.query<{ id: string }>('select id from public.tasks limit 1')).rows[0].id);
    await expect(asUser(db, NADIA, (tx) => tx.query("update public.tasks set status = 'en_validation' where id = $1", [id]))).resolves.toBeDefined();
    await expect(asUser(db, NADIA, (tx) => tx.query("update public.tasks set title = 'Renommée' where id = $1", [id]))).rejects.toThrow(/statut/);
  });

  it('propose un avancement sans pouvoir le valider', async () => {
    const kr = await asUser(db, KARIM, async (tx) =>
      (await tx.query<{ id: string }>("select k.id from public.key_results k join public.objectives o on o.id = k.objective_id where o.owner_id = $1 limit 1", [KARIM])).rows[0].id,
    );
    const value = await asUser(db, KARIM, async (tx) => {
      await tx.query('select public.propose_key_result_value($1, 5)', [kr]);
      return (await tx.query<{ current_value: number; pending_value: number }>('select current_value, pending_value from public.key_results where id = $1', [kr])).rows[0];
    });
    expect(Number(value.pending_value)).toBe(5);
    expect(Number(value.current_value)).not.toBe(5);
    await expect(asUser(db, KARIM, (tx) => tx.query('select public.review_key_result_value($1, true)', [kr]))).rejects.toThrow(/manager/);
  });

  it('ne peut pas valider sa propre demande de congés', async () => {
    const changed = await asUser(db, JULIEN, (tx) =>
      tx.query("update public.absences set status = 'validee' where collaborator_id = $1 and status = 'en_attente'", [JULIEN]).then((r) => r.affectedRows),
    );
    expect(changed).toBe(0);
  });

  it('ne peut pas saisir la météo d’un autre', async () => {
    await expect(
      asUser(db, NADIA, (tx) => tx.query("insert into public.weather_entries (collaborator_id, week_start, mood, workload) values ($1, date_trunc('week', current_date)::date + 7, 4, 3)", [JULIEN])),
    ).rejects.toThrow(/row-level security/);
  });

  it('un compte désactivé perd tous ses droits', async () => {
    const seen = await asUser(db, CLAIRE, async (tx) => {
      await tx.exec('reset role');
      await tx.query('update public.profiles set is_active = false where id = $1', [JULIEN]);
      await tx.exec('set local role authenticated');
      await tx.query('select set_config($1, $2, true)', ['request.jwt.claims', JSON.stringify({ sub: JULIEN, role: 'authenticated' })]);
      return count(tx, 'select 1 from public.tasks');
    });
    expect(seen).toBe(0);
  });
});

describe('outils du cours : DISC, carnet, délégation, décisions, préparation du 1 à 1', () => {
  it('le collaborateur voit son profil DISC et peut le corriger, pas celui des autres', async () => {
    expect(await asUser(db, NADIA, (tx) => count(tx, 'select 1 from public.disc_profiles'))).toBe(1);
    await asUser(db, NADIA, (tx) => tx.query("update public.disc_profiles set secondary_style = 'C' where collaborator_id = $1", [NADIA]));
    const changed = await asUser(db, NADIA, (tx) => tx.query("update public.disc_profiles set primary_style = 'D' where collaborator_id = $1", [JULIEN]));
    expect(changed.affectedRows ?? 0).toBe(0);
  });

  it('le carnet d’observations est réservé au manager', async () => {
    await expect(
      asUser(db, NADIA, (tx) => tx.query('insert into public.observations (team_id, collaborator_id, author_id, body) select team_id, id, id, $2 from public.profiles where id = $1', [NADIA, 'test'])),
    ).rejects.toThrow(/row-level security/);
    expect(await asUser(db, CLAIRE, (tx) => count(tx, 'select 1 from public.observations'))).toBeGreaterThan(5);
  });

  it('les décisions et la préparation privée du 1 à 1 restent invisibles pour le collaborateur', async () => {
    expect(await asUser(db, KARIM, (tx) => count(tx, 'select 1 from public.posture_notes'))).toBe(0);
    expect(await asUser(db, CLAIRE, (tx) => count(tx, 'select 1 from public.posture_notes where collaborator_id = $1', [KARIM]))).toBe(1);
    const insert = "insert into public.review_preps (review_id, theme, posture) values ('66666666-0000-4000-8000-000000000145', 'Comprendre le retrait', 'rassurant')";
    const seen = await asUser(db, CLAIRE, async (tx) => {
      await tx.query(insert);
      return count(tx, 'select 1 from public.review_preps');
    });
    expect(seen).toBe(1);
    await expect(asUser(db, JULIEN, (tx) => tx.query(insert))).rejects.toThrow(/row-level security/);
  });

  it('le collaborateur lit ses missions déléguées sans pouvoir les modifier', async () => {
    expect(await asUser(db, JULIEN, (tx) => count(tx, 'select 1 from public.delegation_missions'))).toBe(1);
    const changed = await asUser(db, JULIEN, (tx) => tx.query("update public.delegation_missions set autonomy = 1 where collaborator_id = $1", [JULIEN]));
    expect(changed.affectedRows ?? 0).toBe(0);
  });
});
