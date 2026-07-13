function normalizeHost(value: unknown, variableName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Variável de ambiente ${variableName} não configurada.`);
  }

  return `${value.trim().replace(/\/+$/, '')}/`;
}

export const API_HOST = normalizeHost(
  import.meta.env.VITE_API_HOST,
  'VITE_API_HOST',
);

export const HOST = normalizeHost(import.meta.env.VITE_HOST, 'VITE_HOST');

export const CARNAVAL_API_HOST = normalizeHost(
  import.meta.env.VITE_CARNAVAL_API_HOST,
  'VITE_CARNAVAL_API_HOST',
);
