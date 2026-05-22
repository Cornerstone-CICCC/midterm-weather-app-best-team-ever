/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_PLACEKIT_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
