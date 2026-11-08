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

### Inscription des managers

Page **Créer un compte manager** (`/inscription`, lien sous le formulaire de connexion). Il faut le code d'accès du groupe : `CADENCE` en démonstration locale, le secret `SIGNUP_CODE` en production.

Chaque manager obtient sa propre équipe, copiée depuis l'équipe modèle (Valmont Équipements) : collaborateurs fictifs, objectifs, tâches, entretiens… Chaque collaborateur fictif a un vrai compte (adresse en `@cadence-demo.example`, mot de passe commun généré) : les identifiants sont affichés au manager en bas de la page **Équipe**. Les collaborateurs réels continuent d'arriver par invitation.

**Pouls du jour** (remplace l'ancienne météo hebdomadaire) : chaque collaborateur indique son humeur, sa motivation et sa charge de travail en haut de son accueil (série de jours consécutifs). Alertes, rapports et préparation d'entretien utilisent les moyennes hebdomadaires du pouls. Le manager suit l'équipe dans l'onglet *Pouls* de son accueil : participation, tendances, signaux (moral bas, baisse, silence) avec « Proposer un 1:1 » en un clic. Les demandes de one-to-one arrivent dans la cloche du manager (notification à l'écran, vérification toutes les 30 s).

**Rappels et notifications** (Web Push, *Mon profil › Notifications et rappels*) : rappel du pouls du jour à l'heure choisie (seulement s'il manque), récap du lundi pour le manager, alerte immédiate quand un collaborateur demande un one-to-one. L'application est installable (manifeste + service worker) ; sur iPhone, les notifications demandent de l'ajouter à l'écran d'accueil. En production : secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` pour les fonctions `send-reminders` et `push-notify` ; la migration `20261110090000_notifications.sql` planifie l'envoi (pg_cron, chaque heure de 7 h à 12 h, jours ouvrés).

**Entretiens** : rappel le matin d'un entretien (manager et collaborateur). **Dictée** (onglet *Compte-rendu*, manager) : après accord du collaborateur, la conversation est transcrite en direct par la reconnaissance vocale du navigateur (gratuite, aucun son conservé) ; le texte, relu et corrigé, s'ajoute aux notes de l'entretien.

Pour tester l'application côté collaborateur : **Équipe › Tester en tant que collaborateur › Se connecter** (ou menu du profil › *Tester en collaborateur*). Un bandeau en haut permet ensuite de revenir au compte manager sans retaper son mot de passe.

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

Dans **SQL Editor**, coller et exécuter `supabase/hosted/setup.sql` : il enchaîne les migrations de `supabase/migrations` puis le jeu de démonstration (mêmes comptes et mot de passe). Sans données de démonstration, exécuter seulement les migrations, dans l'ordre. Le jeu de démonstration sert aussi d'**équipe modèle** copiée à chaque inscription de manager : le conserver.

**Projet déjà installé** : exécuter seulement les nouvelles migrations dans SQL Editor (par exemple `20261107090000_signup.sql` pour l'inscription des managers).

Avec la CLI (et un jeton d'accès) : `npx supabase link --project-ref <id>` puis `npx supabase db push --include-seed`.

### 3. Configurer l'authentification

**Authentication › Sign In / Providers** :

- désactiver « Allow new users to sign up » (les managers s'inscrivent via la fonction `signup-manager`, les collaborateurs par invitation) ;
- **Password** : longueur minimale 10, exigences « lowercase, uppercase, digits and symbols ».

**Authentication › URL Configuration** :

- Site URL : l'adresse du site déployé (par exemple `https://cadence.example.fr`) ;
- Redirect URLs : ajouter `https://cadence.example.fr/nouveau-mot-de-passe`.

**E-mails** : le service d'envoi intégré à Supabase est limité (quelques messages par heure, destinataires de l'organisation uniquement). Pour inviter de vrais collaborateurs, renseigner un SMTP dans **Authentication › Emails › SMTP Settings** (Brevo, Mailjet, Resend… offrent un palier gratuit).

### 4. Déployer les Edge Functions

Les fonctions `invite-member` (invitation), `manage-member` (désactivation / réactivation) et `signup-manager` (inscription d'un manager) sont dans `supabase/functions/`.

- Depuis le tableau de bord : **Edge Functions › Deploy a new function › Via Editor**, créer chaque fonction sous le même nom et coller le contenu de son `index.ts`.
- Ou avec la CLI : `npx supabase functions deploy invite-member`, `… manage-member` et `… signup-manager`.
- Désactiver « Verify JWT » pour les trois fonctions : elles vérifient elles-mêmes l'appelant (session, ou code d'accès pour l'inscription).
- Secrets dans **Edge Functions › Secrets** : `SITE_URL` (adresse du site) et `SIGNUP_CODE` (code d'accès à donner au groupe ; sans lui, les inscriptions sont fermées). `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement.

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
