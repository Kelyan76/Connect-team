/**
 * Traduit toute erreur (PostgREST, Auth, réseau) en message compréhensible
 * par un utilisateur non technique. Le détail technique part en console.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

interface ErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

const BY_CODE: Record<string, string> = {
  '42501': "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
  '23505': 'Cet élément existe déjà.',
  '23503': 'Cet élément est lié à d’autres données et ne peut pas être modifié ainsi.',
  '23514': 'Une des valeurs saisies ne respecte pas les règles attendues.',
  '23502': 'Un champ obligatoire est manquant.',
  '22P02': 'Une des valeurs saisies a un format invalide.',
  PGRST116: "L'élément demandé est introuvable ou vous n'y avez pas accès.",
  PGRST301: 'Votre session a expiré. Reconnectez-vous.',
  invalid_credentials: 'Adresse e-mail ou mot de passe incorrect.',
  user_banned: 'Ce compte a été désactivé. Contactez votre responsable.',
  weak_password: 'Le mot de passe ne respecte pas les règles de sécurité.',
  same_password: "Le nouveau mot de passe doit être différent de l'ancien.",
  over_email_send_rate_limit: 'Trop de demandes. Réessayez dans quelques minutes.',
  email_exists: 'Un compte existe déjà avec cette adresse e-mail.',
};

function asErrorLike(error: unknown): ErrorLike {
  if (typeof error === 'object' && error !== null) return error as ErrorLike;
  return { message: String(error) };
}

export function toUserMessage(error: unknown, fallback = 'Une erreur inattendue est survenue.'): string {
  if (error instanceof AppError) return error.message;
  const e = asErrorLike(error);
  if (e.code && BY_CODE[e.code]) return BY_CODE[e.code];
  const message = e.message ?? '';
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Connexion au serveur impossible. Vérifiez votre réseau puis réessayez.';
  }
  if (/jwt expired|invalid jwt/i.test(message)) return BY_CODE.PGRST301;
  if (/invalid login credentials/i.test(message)) return BY_CODE.invalid_credentials;
  if (/banned/i.test(message)) return BY_CODE.user_banned;
  if (/row-level security|permission denied/i.test(message)) return BY_CODE['42501'];
  // Les exceptions levées par nos fonctions SQL sont déjà rédigées en français.
  if (e.code === 'P0001' && message) return message;
  return fallback;
}

/** Lève une AppError si la réponse Supabase contient une erreur, sinon renvoie les données. */
export function unwrap<T>(result: { data: T; error: unknown }, context?: string): NonNullable<T> {
  if (result.error) {
    console.error(context ?? 'Erreur Supabase', result.error);
    throw new AppError(toUserMessage(result.error), result.error);
  }
  if (result.data === null || result.data === undefined) {
    throw new AppError("L'élément demandé est introuvable ou vous n'y avez pas accès.");
  }
  return result.data as NonNullable<T>;
}

/** Variante pour les écritures sans retour. */
export function check(result: { error: unknown }, context?: string): void {
  if (result.error) {
    console.error(context ?? 'Erreur Supabase', result.error);
    throw new AppError(toUserMessage(result.error), result.error);
  }
}
