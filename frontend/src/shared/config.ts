// Injected at build time by Vite (`define` in vite.config.ts) and by Jest (`globals`).
declare const __API_URL__: string;

export const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/, '');

export const API_URL = normalizeBaseUrl(__API_URL__);
