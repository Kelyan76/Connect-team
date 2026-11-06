# PLAN — Connect Team, pilotage et management d'équipe

Application web destinée au responsable d'une PME industrielle (Valmont Équipements, données de démo) et à ses collaborateurs. Ce plan est rédigé avant tout code puis tenu à jour (les cases cochées reflètent l'avancement réel ; le détail est dans PROGRESS.md).

## 1. Environnement d'exécution

| Contexte | Backend | Commande |
| --- | --- | --- |
| Avec Docker | Supabase CLI locale (`npx supabase start`) | `npm run supabase:start` |
| Sans Docker (cette machine) | **Supalite** : émulateur local des API Supabase utilisées (Auth, REST, Functions, boîte mail) au-dessus de PGlite (PostgreSQL 17 compilé en WASM) | `npm run db:start` |
| Production | Projet Supabase hébergé | voir README |

Les deux backends locaux exposent la même URL (`http://127.0.0.1:54321`) et la même boîte mail (`http://127.0.0.1:54324`). Le code applicatif ne sait pas lequel tourne : il utilise `@supabase/supabase-js` sans adaptation. Les migrations SQL sont les mêmes fichiers (`supabase/migrations`). Supalite ne fait qu'ajouter, avant les migrations, un « shim » qui reproduit ce que Supabase fournit d'office (schéma `auth`, `auth.uid()`, rôles `anon` / `authenticated` / `service_role`, droits par défaut).

## 2. Architecture des dossiers

```
supabase/
  config.toml
  migrations/            SQL versionné : tables, fonctions, triggers, politiques RLS
  seed.sql               jeu de démonstration (dates relatives à current_date)
  functions/             Edge Functions Deno (invite-member, manage-member)
tools/
  supalite/              émulateur local (server, auth, rest, functions, mail, db)
  gen-types.ts           génération des types TypeScript depuis le schéma
src/
  app/                   point d'entrée, routeur, providers, coquille (sidebar, en-tête, palette)
  shared/
    ui/                  composants de base (dérivés de shadcn/ui, restylés sur les tokens)
    lib/                 client Supabase, formats FR, dates ISO, erreurs, CSV, utilitaires
    hooks/               hooks transverses (raccourcis clavier, inactivité, période)
    types/database.ts    types générés
  features/
    auth/  dashboard/  team/  objectives/  skills/  reviews/  workload/  tasks/
    absences/  weather/  feedback/  alerts/  meetings/  delegation/  reports/
    settings/  export/  design-system/
      chaque feature : api.ts (appels Supabase typés) · queries.ts (TanStack Query)
                       lib/ (logique métier pure, testée) · components/ · pages/ · schemas.ts (Zod)
tests/
  rls/                   tests des politiques RLS (Vitest + PGlite, vraie base)
  e2e/                   parcours Playwright + captures de revue visuelle
```

Règles : pas de fichier > 300 lignes ; aucune logique métier dans un composant d'affichage (elle vit dans `lib/` ou dans les hooks de `queries.ts`).

## 3. Modèle de données (schéma `public`)

Énumérations : `app_role` (manager, collaborateur) · `objective_scope` (equipe, individuel) · `review_kind` (one_to_one, annuel, professionnel) · `review_status` (planifie, termine, annule) · `question_type` (texte, echelle, choix, oui_non) · `answer_author` (manager, collaborateur) · `action_status` (a_faire, en_cours, fait) · `task_status` (a_faire, en_cours, en_validation, termine) · `task_priority` (basse, normale, haute, urgente) · `absence_kind` (conges_payes, rtt, maladie, formation, sans_solde) · `request_status` (en_attente, validee, refusee) · `feedback_kind` (point_fort, axe_progres, reconnaissance) · `delegation_level` (decide, propose, execute).

| Table | Rôle | Colonnes clés |
| --- | --- | --- |
| teams | équipe | name, company |
| profiles | 1-1 avec auth.users | team_id, role, first_name, last_name, email, job_title, hired_on, is_active |
| manager_notes | notes privées du manager | collaborator_id, author_id, body |
| login_events | journal des connexions | user_id, team_id, user_agent, created_at |
| team_settings | seuils d'alerte | team_id (PK), no_one_to_one_days, overload_pct, underload_pct, overload_weeks, weather_drop_weeks, review_due_days, prep_reminder_days, max_absent |
| objectives | OKR | team_id, scope, owner_id (null si équipe), title, start_date, due_date, archived |
| key_results | résultats clés | objective_id, title, unit, start_value, target_value, current_value, pending_value, pending_at, validated_at |
| key_result_history | historique d'avancement | key_result_id, value, recorded_at |
| skills / skill_levels | matrice | skills(team_id, name, category) · skill_levels(collaborator_id, skill_id, self_level, manager_level, validated_at) |
| weather_entries | météo hebdo | collaborator_id, week_start (lundi ISO), mood 1-5, workload 1-5, comment |
| feedbacks | feedback continu | collaborator_id, author_id, kind, body, is_shared |
| review_templates / template_questions | trames | kind, name · position, section, label, help, type, options |
| reviews | entretiens | collaborator_id, manager_id, kind, template_id, scheduled_at, status, collaborator_prepared_at, manager_prepared_at, live_notes, summary, collaborator_signed_at, manager_signed_at |
| review_answers | réponses | review_id, question_id, author, value (jsonb) |
| review_actions | plan d'action | review_id, title, owner_id, due_date, status |
| review_requests | demandes de one-to-one | collaborator_id, message, preferred_date, status, review_id |
| projects / tasks | tâches | projects(code, name, client) · tasks(project_id, assignee_id, title, priority, status, due_date, position) |
| workload_allocations | plan de charge | collaborator_id, project_id, week_start, percent |
| absences | congés | collaborator_id, kind, start_date, end_date, status, comment, decided_by |
| meetings / decisions / meeting_actions | réunions | meetings(title, held_on, participants, notes) · decisions(meeting_id, title, details) · meeting_actions(meeting_id, title, owner_id, due_date, status) |
| delegation_domains / delegations | délégation | domains(name, position) · delegations(collaborator_id, domain_id, level) |

Statuts calculés (pas stockés) : statut d'objectif, statut de préparation d'entretien, alertes, échéances réglementaires. Ils sont calculés en TypeScript pur (`features/*/lib`) et testés par Vitest.

## 4. Politiques RLS

Fonctions d'aide `security definer` (search_path vide) : `current_team_id()`, `is_manager()`, `is_self(uuid)`, `in_my_team(uuid)` ; toutes ignorent un profil désactivé.

| Données | Manager (de l'équipe) | Collaborateur |
| --- | --- | --- |
| profiles | lecture/écriture équipe | lecture de sa fiche + du manager (nom, poste) |
| manager_notes | tout | **aucun accès** |
| login_events | lecture équipe | insertion de ses propres connexions |
| team_settings, trames, compétences, domaines | tout | lecture |
| objectives / key_results | tout | lecture de ses objectifs + objectifs d'équipe ; avancement proposé via RPC `propose_key_result_value` |
| skill_levels | tout | lecture des siennes ; auto-évaluation via RPC `set_self_skill_level` |
| weather_entries | lecture équipe | lecture/écriture des siennes |
| feedbacks | tout | lecture des siens **si `is_shared`** |
| reviews | tout | lecture des siens ; demande via review_requests |
| review_answers | ses réponses ; celles du collaborateur **seulement après validation de sa préparation** | ses réponses (verrouillées après validation) ; celles du manager quand les deux préparations sont validées |
| review_actions / meeting_actions | tout | lecture des siennes, mise à jour du statut |
| tasks | tout | lecture des siennes, mise à jour statut/position (trigger de colonnes) |
| workload_allocations, delegations | tout | lecture des siennes |
| absences | tout | lecture/création des siennes, annulation tant que « en attente » |
| meetings / decisions | tout | aucun accès |

Les signatures passent par la RPC `sign_review` (horodatage serveur, rôle déduit de `auth.uid()`). Un entretien signé des deux parties devient non modifiable (trigger).

## 5. Écrans

| Route | Manager | Collaborateur |
| --- | --- | --- |
| /connexion, /mot-de-passe-oublie, /nouveau-mot-de-passe | ✓ | ✓ |
| / Tableau de bord | KPI, évolution 6 mois, météo, alertes, prochains entretiens | objectifs, tâches de la semaine, prochain entretien, actions |
| /equipe, /equipe/:id | liste tableau/cartes, fiche complète, notes privées, invitation | — |
| /objectifs | équipe + individuels, validation | les siens, mise à jour |
| /competences | matrice, risques, suggestions | auto-évaluation |
| /entretiens, /entretiens/:id | planification, préparation, vue côte à côte, compte-rendu, signature, PDF | préparation, demande de one-to-one, signature, historique |
| /entretiens/trames | édition des trames | — |
| /plan-de-charge | semaines × collaborateurs | sa charge |
| /taches | kanban + liste, filtres | ses tâches |
| /absences | calendrier, validation, sur-absence | demandes |
| /meteo | moyenne, évolution individuelle | saisie hebdo |
| /feedbacks | saisie, partage | feedbacks partagés |
| /alertes | liste complète | — |
| /reunions, /reunions/:id | comptes-rendus, décisions, actions | — |
| /delegation | matrice | sa ligne |
| /rapports | rapport mensuel, fiche collaborateur PDF | — |
| /parametres | seuils, compétences, domaines, journal des connexions, sauvegarde | — |
| /profil | compte, mot de passe, export de ses données | idem |
| /dev/composants | page de démonstration du design system (dev) | |

## 6. Phases

- [x] 1. Socle : projet, design system, layout, composants de base, page de démonstration
- [x] 2. Authentification, rôles, RLS, invitations
- [x] 3. Tableau de bord et fiches collaborateurs
- [x] 4. Entretiens (module complet)
- [x] 5. Objectifs, compétences, feedback, météo
- [x] 6. Plan de charge, tâches, absences, réunions, délégation
- [x] 7. Alertes et rapports PDF
- [x] 8. Revue finale

Boucle de contrôle à chaque fin de phase : build, lint, tests unitaires, tests RLS, Playwright (parcours + captures clair/sombre × desktop/tablette, examinées une à une), commit, PROGRESS.md.
