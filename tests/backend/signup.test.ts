import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';
import { getDb } from '@/backend/local/db';
import { localFetch, LOCAL_SUPABASE_URL } from '@/backend/local/fetch';
import { LOCAL_ANON_KEY } from '@/backend/local/jwt';
import { DEMO_EMAIL_DOMAIN, LOCAL_SIGNUP_CODE } from '@/features/auth/lib/signup';
import type { Database } from '@/shared/types/database';

/** Inscription d'un manager : compte, équipe et copie complète de l'équipe de démonstration. */
const client = () =>
  createClient<Database>(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: localFetch },
  });

const TEMPLATE = '22222222-0000-4000-8000-000000000002';
const signup = {
  code: LOCAL_SIGNUP_CODE,
  first_name: 'Inès',
  last_name: 'Morel',
  job_title: 'Responsable de production',
  company: 'Atelier Morel',
  team_name: 'Production',
  email: 'ines.morel@atelier-morel.fr',
  password: 'Morel-Atelier26!',
};

let manager: SupabaseClient<Database>;
let teamId = '';

beforeAll(async () => {
  const { error } = await client().functions.invoke('signup-manager', { body: signup });
  expect(error).toBeNull();
  manager = client();
  expect(
    (await manager.auth.signInWithPassword({ email: signup.email, password: signup.password }))
      .error,
  ).toBeNull();
  const uid = (await manager.auth.getUser()).data.user?.id ?? '';
  teamId =
    (await manager.from('profiles').select('team_id').eq('id', uid).single()).data?.team_id ?? '';
  expect(teamId).not.toBe('');
}, 120_000);

describe('inscription manager', () => {
  it('refuse un mauvais code d’accès', async () => {
    const { error } = await client().functions.invoke('signup-manager', {
      body: { ...signup, email: 'x@y.fr', code: 'FAUX' },
    });
    expect(error).not.toBeNull();
  });

  it('refuse une adresse déjà utilisée', async () => {
    const { error } = await client().functions.invoke('signup-manager', { body: signup });
    expect(error).not.toBeNull();
  });

  it('crée une équipe séparée, dirigée par le nouveau manager', async () => {
    const { data } = await manager.from('teams').select('name, company');
    expect(data).toEqual([{ name: 'Production', company: 'Atelier Morel' }]);
  });

  it('copie toutes les données de l’équipe modèle', async () => {
    const db = await getDb();
    const tables = (
      await db.query<{ t: string }>(
        `select table_name as t from information_schema.columns
         where table_schema = 'public' and column_name = 'team_id' and table_name not in ('teams', 'demo_accounts', 'daily_pulses')
           and table_name in (select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE')`,
      )
    ).rows.map((r) => r.t);
    expect(tables.length).toBeGreaterThan(10);
    for (const t of tables) {
      const res = await db.query<{ a: number; b: number }>(
        `select (select count(*) from public.${t} where team_id = $1)::int as a, (select count(*) from public.${t} where team_id = $2)::int as b`,
        [TEMPLATE, teamId],
      );
      expect({ t, n: res.rows[0].b }).toEqual({ t, n: res.rows[0].a });
    }
    const kr = await db.query<{ a: number; b: number }>(
      `select (select count(*) from public.key_results k join public.objectives o on o.id = k.objective_id where o.team_id = $1)::int as a,
              (select count(*) from public.key_results k join public.objectives o on o.id = k.objective_id where o.team_id = $2)::int as b`,
      [TEMPLATE, teamId],
    );
    expect(kr.rows[0].b).toBe(kr.rows[0].a);
  });

  it('ne laisse aucune référence vers l’équipe modèle', async () => {
    const { data } = await manager
      .from('tasks')
      .select('assignee_id')
      .not('assignee_id', 'is', null);
    const { data: people } = await manager.from('profiles').select('id');
    const ids = new Set((people ?? []).map((p) => p.id));
    expect((data ?? []).every((t) => ids.has(t.assignee_id ?? ''))).toBe(true);
  });

  it('fournit des comptes démo collaborateurs utilisables', async () => {
    const { data } = await manager.from('demo_accounts').select('user_id, password');
    expect((data ?? []).length).toBeGreaterThanOrEqual(3);
    const first = data?.[0];
    const { data: profile } = await manager
      .from('profiles')
      .select('email, role')
      .eq('id', first?.user_id ?? '')
      .single();
    expect(profile?.role).toBe('collaborateur');
    expect(profile?.email.endsWith(`@${DEMO_EMAIL_DOMAIN}`)).toBe(true);

    const collab = client();
    expect(
      (
        await collab.auth.signInWithPassword({
          email: profile?.email ?? '',
          password: first?.password ?? '',
        })
      ).error,
    ).toBeNull();
    expect((await collab.from('demo_accounts').select('*')).data).toEqual([]);
    const { data: teams } = await collab.from('teams').select('id');
    expect(teams).toEqual([{ id: teamId }]);
  });

  it('génère un historique de pouls pour l’équipe de démonstration', async () => {
    const { data } = await manager.from('daily_pulses').select('id');
    expect((data ?? []).length).toBeGreaterThan(20);
  });

  it('la fonction de copie n’est pas appelable depuis le navigateur', async () => {
    const { error } = await manager.rpc('demo_template_people' as never);
    expect(error).not.toBeNull();
  });
});
