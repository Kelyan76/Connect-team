# Connect Team

Application de pilotage et de management d'équipe pour le responsable d'une PME industrielle et ses collaborateurs : tableau de bord, fiches collaborateurs, entretiens (one-to-one, annuel, professionnel) avec préparation en deux temps et signature, objectifs (OKR), matrice de compétences, feedback, météo d'équipe, tâches en kanban, plan de charge, absences, réunions, délégation, alertes et rapports PDF.

React 18 · Vite · TypeScript strict · Tailwind CSS · shadcn/ui (restylé) · TanStack Query · React Hook Form + Zod · Recharts · Supabase (Auth, PostgreSQL, RLS, Edge Functions).

## Deux modes de fonctionnement

| Mode | Quand | Données |
| --- | --- | --- |
| **Démonstration embarquée** | aucun `.env.local` | PostgreSQL tourne **dans le navigateur** (PGlite) avec les mêmes migrations, la même RLS et le même jeu de démonstration que Supabase. Rien à installer côté serveur, aucune création de compte. |
| **Supabase** | `.env.local` renseigné | Projet Supabase hébergé (ou `supabase start` si Docker est installé). |

Le code de l'application est identique dans les deux cas : seul le client Supabase change de point d'accès (`src/shared/lib/supabase.ts`).

## Installation et lancement (démonstration)

Prérequis : Node.js 20 ou plus.

```bash
npm install
npm run dev
```

Ouvrir http://127.0.0.1:5173. Au premier chargement, la base de démonstration se crée en quelques secondes (indicateur sur la page de connexion), puis elle est conservée dans le navigateur. « Mon profil › Réinitialiser la démonstration » recharge le jeu d'origine.

### Comptes de démonstration

Mot de passe commun : `Cadence-Demo26!`

| Rôle | Compte | Poste |
| --- | --- | --- |
| Manager | claire.vasseur@valmont-equipements.fr | Responsable des opérations |
| Collaboratrice | nadia.haddad@valmont-equipements.fr | Technicienne de mise en service |
| Collaborateur | julien.mercier@valmont-equipements.fr | Technicien SAV |
| Collaborateur | karim.benali@valmont-equipements.fr | Chargé d'affaires |

Autres collaborateurs : Élodie Fontaine (assistante ADV), Thomas Girard (responsable atelier), Mathilde Roux (technicienne méthodes), Bastien Le Gall (technicien de maintenance itinérant), mêmes conventions d'adresse.

Les e-mails (invitations, réinitialisation du mot de passe) arrivent dans la **boîte mail de démonstration** (`/boite-mail`), comme Inbucket/Mailpit avec la CLI Supabase.

### Version partageable

```bash
npm run build:demo
```

Produit `dist-demo/` : un site statique autonome (routeur en mémoire, base dans le navigateur), publiable sur n'importe quel hébergement de fichiers statiques.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérification TypeScript + build de production |
| `npm run lint` | ESLint, zéro avertissement toléré |
| `npm run test` | Vitest : logique métier, politiques RLS, intégration supabase-js ↔ base |
| `npm run test:e2e` | Playwright : connexions, raccourcis, mot de passe oublié, entretien complet |
| `npm run test:visual` | Captures clair/sombre × desktop/tablette dans `screenshots/` |
| `npm run db:types` | Régénère `src/shared/types/database.ts` depuis les migrations |

Playwright utilise le navigateur Edge installé (`channel: 'msedge'`).

## Mise en production sur Supabase

### 1. Créer le projet

1. Créer un compte sur [supabase.com](https://supabase.com) puis un projet (région Europe, par exemple Paris ou Francfort). Conserver le mot de passe de la base.
2. Dans **Project Settings › API**, relever l'**URL du projet** et la **clé anon** (publique).

### 2. Créer le schéma et le jeu de données

Dans **SQL Editor**, coller et exécuter `supabase/hosted/setup.sql` : il enchaîne les cinq migrations de `supabase/migrations` puis le jeu de démonstration (mêmes comptes et mot de passe). Sans données de démonstration, exécuter seulement les migrations, dans l'ordre.

Avec la CLI (et un jeton d'accès) : `npx supabase link --project-ref <id>` puis `npx supabase db push --include-seed`.

### 3. Configurer l'authentification

**Authentication › Sign In / Providers** :

- désactiver « Allow new users to sign up » (les comptes se créent uniquement par invitation du manager) ;
- **Password** : longueur minimale 10, exigences « lowercase, uppercase, digits and symbols ».

**Authentication › URL Configuration** :

- Site URL : l'adresse du site déployé (par exemple `https://cadence.example.fr`) ;
- Redirect URLs : ajouter `https://cadence.example.fr/nouveau-mot-de-passe`.

**E-mails** : le service d'envoi intégré à Supabase est limité (quelques messages par heure, destinataires de l'organisation uniquement). Pour inviter de vrais collaborateurs, renseigner un SMTP dans **Authentication › Emails › SMTP Settings** (Brevo, Mailjet, Resend… offrent un palier gratuit).

### 4. Déployer les Edge Functions

Les fonctions `invite-member` (invitation) et `manage-member` (désactivation / réactivation) sont dans `supabase/functions/`.

- Depuis le tableau de bord : **Edge Functions › Deploy a new function › Via Editor**, créer `invite-member` puis `manage-member` et coller le contenu de chaque `index.ts`.
- Ou avec la CLI : `npx supabase functions deploy invite-member` et `npx supabase functions deploy manage-member`.
- Désactiver « Verify JWT » pour les deux fonctions : elles vérifient elles-mêmes la session de l'appelant (compatible avec les nouvelles clés de signature).
- Ajouter le secret `SITE_URL` (adresse du site) dans **Edge Functions › Secrets**. `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement.

### 5. Brancher l'application

Créer `.env.local` à partir de `.env.example` :

```
VITE_SUPABASE_URL=https://<identifiant>.supabase.co
VITE_SUPABASE_ANON_KEY=<clé publishable (sb_publishable_…) ou anon>
```

Puis `npm run build` et déployer `dist/` sur un hébergeur statique (Vercel, Netlify, Cloudflare Pages…), avec une règle de réécriture de toutes les routes vers `index.html`. Déclarer les deux variables `VITE_SUPABASE_*` dans l'hébergeur.

Ne jamais placer la clé `service_role` dans le front ni dans un fichier versionné.

## Architecture

```
supabase/          migrations (tables, fonctions, RLS), seed, Edge Functions, config
src/app/           point d'entrée, routeur, coquille (barre latérale, en-tête, palette)
src/features/      un dossier par module : api/queries (données), lib (règles métier testées), components, pages
src/shared/        composants d'interface, formats français, client Supabase, hooks
src/backend/local/ démonstration embarquée : PGlite + émulation Auth/REST/Functions de Supabase
tests/             RLS, intégration du backend, parcours Playwright
```

Voir aussi `PLAN.md` (modèle de données, politiques RLS, écrans), `DECISIONS.md` et `PROGRESS.md`.
