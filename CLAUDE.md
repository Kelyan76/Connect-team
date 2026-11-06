# CLAUDE.md — Connect Team

Application de pilotage et de management d'équipe (manager de PME industrielle + collaborateurs). Interface 100 % en français.

## Stack

- React 18 + Vite 6 + TypeScript strict (aucun `any`)
- Tailwind CSS 3.4 : tokens dans `tailwind.config.ts` + `src/app/styles/tokens.css`
- Composants : `src/shared/ui` (base shadcn/ui, Radix, restylés) ; icônes Lucide ; graphiques Recharts
- Données : Supabase (`@supabase/supabase-js`), TanStack Query, React Hook Form + Zod
- Backend local : Supabase CLI si Docker est présent, sinon **Supalite** (`tools/supalite`, PGlite)
- Tests : Vitest (logique + RLS sur vraie base PGlite), Playwright (parcours + captures)

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run db:start` | Backend local Supalite (API :54321, mail :54324), base persistée dans `.supalite/` |
| `npm run db:reset` | Réapplique migrations + seed puis quitte |
| `npm run dev` | Front Vite sur :5173 |
| `npm run db:types` | Régénère `src/shared/types/database.ts` |
| `npm run build` / `lint` / `test` | Contrôles obligatoires (zéro avertissement) |
| `npm run test:e2e` | Parcours Playwright (démarre Supalite en mémoire + Vite) |
| `npm run test:visual` | Captures clair/sombre × desktop/tablette dans `screenshots/` |

Comptes de démo : voir README (mot de passe commun dans `supabase/seed.sql`).

## Conventions

- Architecture par fonctionnalité : `src/features/<module>/{api.ts, queries.ts, schemas.ts, lib/, components/, pages/}`.
- `api.ts` : appels Supabase typés, passent par `unwrap`/`check` (`shared/lib/errors.ts`) → erreurs en français.
- `queries.ts` : hooks TanStack Query ; clés centralisées dans `shared/lib/query-keys.ts` ; invalidation explicite.
- `lib/` : logique métier pure (statuts, alertes, droits), testée dans `*.test.ts` à côté.
- Composants d'affichage sans logique métier ; fichiers ≤ 300 lignes.
- Pas d'embedding PostgREST (`select('*, autre(*)')`) : utiliser une vue `security_invoker`.
- Toute nouvelle table : RLS activée + politiques + test dans `tests/rls`.
- Un commit par étape terminée, message clair en français.

## Règles de design (section 2 du SPEC)

- Uniquement les tokens : couleurs sémantiques (`bg-surface`, `text-fg-muted`, `border-line`, `bg-accent`…), tailles `text-xs|sm|base|md|lg|xl` (12/13/14/16/20/24), espacements multiples de 4, rayons ≤ 8px.
- Interdits : dégradés, glassmorphism, halos, emojis, icônes dans des pastilles colorées, ombres marquées, hero marketing, textes d'accroche, animations décoratives.
- Séparer par des bordures 1px (`Panel`), pas par des ombres. Hiérarchie par taille / graisse / gris.
- Tableaux denses : `Table`, `SortableTh`, nombres alignés à droite en `tabular`.
- Formats : `formatDate` (« 4 nov. 2026 »), `formatNumber`, `formatEuros`, `isoWeekLabel` (S45).
- États : `Skeleton`/`TableSkeleton` au chargement, `EmptyState` avec action, `ErrorState` avec réessai.
- Actions destructrices : `ConfirmDialog`. Retours : `toast` discret.
- Raccourcis : Ctrl/Cmd+K palette, N nouvel élément (`useHotkey('n', …)`), Échap ferme.
- Accessibilité : `Field` pour tout champ (label + aria), focus visible, contrastes AA.
