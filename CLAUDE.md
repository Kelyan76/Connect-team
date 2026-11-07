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

- Thème clair uniquement (pas de mode sombre). Seule zone foncée : la barre latérale bleu nuit (`bg-sidebar`).
- Une couleur par section (`app/shell/section-colors.ts`, tokens `sec-*`) : icônes du menu, entrée et onglet actifs, barre du bas, halo de page (`PageHalo`). Avatars colorés par personne. Pouls : échelles `mood-1…5` et `energy-1…5`.
- Uniquement les tokens : couleurs sémantiques (`bg-surface`, `text-fg-muted`, `border-line`, `bg-accent`…), tailles `text-xs|sm|base|md|lg|xl` (12/13/14/16/20/24), espacements multiples de 4.
- Formes arrondies : contrôles `rounded` (10 px), cartes `rounded-lg` (16 px), bandeaux `rounded-xl`, onglets et segments en pastilles `rounded-full`.
- Cartes blanches avec bordure fine + ombre très légère (`Panel`, `shadow-sm`). KPI : `Stat` avec icône dans une pastille de couleur douce.
- Dégradé réservé au bandeau d'accueil (`HeroBanner`, `from-hero-from to-hero-to`). Interdits : emojis, glassmorphism, ombres marquées.
- Animations (config Tailwind + `.stagger` dans index.css) : entrée de page `animate-page-in`, listes et cartes en cascade `stagger`, fenêtres/menus animés à l'ouverture et à la fermeture, barres qui se remplissent. Toujours courtes (≤ 500 ms), en `backwards` si l'élément peut contenir du `position: fixed`, et coupées par « réduire les animations ».
- Pages légères : un seul bloc détaillé à la fois via `Segmented` ou menu déroulant plutôt que tout empiler.
- Mobile d'abord : barre de navigation en bas (`BottomNav`), aucune page ne déborde à 375 px, champs en 16 px. Zoom de page désactivé (`app/no-zoom.ts`).
- Tableaux denses : `Table`, `SortableTh`, nombres alignés à droite en `tabular`.
- Formats : `formatDate` (« 4 nov. 2026 »), `formatNumber`, `formatEuros`, `isoWeekLabel` (S45).
- États : `Skeleton`/`TableSkeleton` au chargement, `EmptyState` avec action, `ErrorState` avec réessai.
- Actions destructrices : `ConfirmDialog`. Retours : `toast` discret.
- Raccourcis : Ctrl/Cmd+K palette, N nouvel élément (`useHotkey('n', …)`), Échap ferme.
- Accessibilité : `Field` pour tout champ (label + aria), focus visible, contrastes AA.
