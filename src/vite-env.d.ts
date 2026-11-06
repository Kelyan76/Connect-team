/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** « memory » : base de démonstration neuve à chaque chargement (tests). */
  readonly VITE_LOCAL_DB?: string;
  /** « memory » : routeur en mémoire, pour une diffusion sans serveur (artefact). */
  readonly VITE_ROUTER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
