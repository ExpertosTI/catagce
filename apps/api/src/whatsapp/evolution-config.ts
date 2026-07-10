export type EvolutionCreds = {
  instance: string;
  apiKey: string;
};

function env(name: string) {
  return String(process.env[name] ?? '').trim().replace(/^["']|["']$/g, '');
}

export function platformEvolution(): EvolutionCreds | null {
  const url = env('EVOLUTION_API_URL');
  const apiKey = env('EVOLUTION_API_KEY');
  const instance = env('EVOLUTION_INSTANCE');
  if (!url || !apiKey || !instance) return null;
  return { instance, apiKey };
}

export function evolutionBaseUrl() {
  return env('EVOLUTION_API_URL').replace(/\/$/, '');
}

export function evolutionAdminKey() {
  return env('EVOLUTION_API_KEY');
}

export function evolutionConfigured() {
  return Boolean(evolutionBaseUrl() && evolutionAdminKey());
}
