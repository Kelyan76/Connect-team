-- Cadence — droits explicites sur l'API de données.
-- Les nouveaux projets Supabase n'accordent plus automatiquement l'accès aux tables créées en SQL :
-- on accorde ici ce que chaque rôle doit pouvoir faire. La RLS (déjà active partout) filtre les lignes.

-- Utilisateurs connectés : accès aux tables, filtré par les politiques RLS.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Visiteurs non connectés : aucun accès aux données métier.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Fonctions : Postgres accorde EXECUTE à PUBLIC par défaut ; on le réserve aux utilisateurs connectés.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
