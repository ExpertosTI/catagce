const MODEL_FALLBACKS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

function apiKey(override?: string | null) {
  return override?.trim() || process.env.GEMINI_API_KEY?.trim() || '';
}

type GeminiPart = {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
};
export type GeminiContent = { role: string; parts: GeminiPart[] };

export type ToolDeclaration = {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
};

type GenerateOpts = {
  systemInstruction?: string;
  tools?: ToolDeclaration[];
  temperature?: number;
  apiKey?: string | null;
};

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function extractParts(payload: { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> }) {
  return payload.candidates?.[0]?.content?.parts || [];
}

async function callGenerate(model: string, contents: GeminiContent[], opts: GenerateOpts = {}) {
  const key = apiKey(opts.apiKey);
  if (!key) return { ok: false as const, status: 401, error: 'gemini_not_configured' };

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature: opts.temperature ?? 0.35 },
  };
  if (opts.systemInstruction) body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  if (opts.tools?.length) body.tools = [{ functionDeclarations: opts.tools }];

  const res = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let payload: { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> };
  try {
    payload = JSON.parse(raw);
  } catch {
    return { ok: false as const, status: res.status, error: `gemini_parse_error:${raw.slice(0, 120)}` };
  }

  if (!res.ok) {
    return { ok: false as const, status: res.status, error: `gemini_http_${res.status}:${raw.slice(0, 200)}` };
  }

  const parts = extractParts(payload);
  const fn = parts.find((p) => p.functionCall)?.functionCall;
  const text = parts.map((p) => p.text || '').join('').trim();
  return { ok: true as const, parts, text, functionCall: fn };
}

export async function generateWithTools(contents: GeminiContent[], opts: GenerateOpts = {}) {
  let last = { ok: false as const, status: 500, error: 'gemini_failed' };
  for (const model of MODEL_FALLBACKS) {
    const result = await callGenerate(model, contents, opts);
    if (result.ok) return result;
    last = result;
    if (result.status === 404 || result.status === 400) continue;
    break;
  }
  return last;
}

export function turnsToContents(turns: Array<{ role: 'user' | 'assistant'; content: string }>): GeminiContent[] {
  return turns.map((t) => ({
    role: t.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: t.content }],
  }));
}
