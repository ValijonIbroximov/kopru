/**
 * Bepul AI provayderlar. Hammasi OpenAI-mos "chat/completions" endpointi orqali —
 * shuning uchun bitta kod hamma uchun ishlaydi. Yangi provayder qo'shish = 1 qator.
 */
export interface ProviderDef {
  id: string;
  label: string;
  url: string;
  envKey: string;
  envModel: string;
  defaultModel: string;
  signupUrl: string;
  note: string;
  extraHeaders?: Record<string, string>;
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'groq', label: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions',
    envKey: 'GROQ_API_KEY', envModel: 'GROQ_MODEL', defaultModel: 'llama-3.3-70b-versatile',
    signupUrl: 'https://console.groq.com/keys', note: 'Bepul, juda tez (kuniga ~14 000 so‘rov).',
  },
  {
    id: 'gemini', label: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    envKey: 'GEMINI_API_KEY', envModel: 'GEMINI_MODEL', defaultModel: 'gemini-2.0-flash',
    signupUrl: 'https://aistudio.google.com/apikey', note: 'Bepul tier (kuniga ~1 500 so‘rov).',
  },
  {
    id: 'cerebras', label: 'Cerebras', url: 'https://api.cerebras.ai/v1/chat/completions',
    envKey: 'CEREBRAS_API_KEY', envModel: 'CEREBRAS_MODEL', defaultModel: 'llama-3.3-70b',
    signupUrl: 'https://cloud.cerebras.ai', note: 'Bepul tier, eng tez inferens.',
  },
  {
    id: 'openrouter', label: 'OpenRouter', url: 'https://openrouter.ai/api/v1/chat/completions',
    envKey: 'OPENROUTER_API_KEY', envModel: 'OPENROUTER_MODEL', defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    signupUrl: 'https://openrouter.ai/keys', note: '":free" modellar bepul (kuniga ~50–200 so‘rov).',
    extraHeaders: { 'HTTP-Referer': 'https://kopru.app', 'X-Title': 'Kopru' },
  },
  {
    id: 'mistral', label: 'Mistral', url: 'https://api.mistral.ai/v1/chat/completions',
    envKey: 'MISTRAL_API_KEY', envModel: 'MISTRAL_MODEL', defaultModel: 'mistral-small-latest',
    signupUrl: 'https://console.mistral.ai', note: 'Bepul "Experiment" rejasi.',
  },
];

export function providerById(id: string) {
  return PROVIDERS.find((p) => p.id === id);
}

export function configuredProviders(): { def: ProviderDef; key: string; model: string }[] {
  const order = (process.env.AI_PROVIDER_ORDER ?? PROVIDERS.map((p) => p.id).join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const list: { def: ProviderDef; key: string; model: string }[] = [];
  for (const id of order) {
    const def = providerById(id);
    if (!def) continue;
    const key = process.env[def.envKey];
    if (!key) continue;
    list.push({ def, key, model: process.env[def.envModel] || def.defaultModel });
  }
  return list;
}
