/** Boîte mail locale de la démo (équivalent d'Inbucket/Mailpit) : les e-mails restent dans le navigateur. */
export interface LocalMail {
  id: string;
  to: string;
  subject: string;
  body: string;
  /** Lien d'action (activation de compte, réinitialisation), interne à l'application. */
  link: string;
  createdAt: string;
}

let inbox: LocalMail[] = [];
const listeners = new Set<() => void>();

export function sendLocalMail(mail: Omit<LocalMail, 'id' | 'createdAt'>): void {
  inbox = [{ ...mail, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...inbox];
  listeners.forEach((l) => l());
}

export const mailbox = {
  list: (): LocalMail[] => inbox,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
