type JobPayload = {
  message: string;
  image?: string;
  history?: Array<{ role: 'user' | 'model' | 'assistant'; content?: string; image?: string }>;
  systemPrompt: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
};

type Env = {
  ELARA_CHAT_WORKFLOW: any;
  GEMINI_API_KEY: string;
  ELARA_BACKGROUND_TOKEN: string;
  ALLOWED_ORIGIN?: string;
};

const DEFAULT_MODEL = 'gemini-3.7-flash';
const DEFAULT_ALLOWED_ORIGIN = '*';

function responseJson(data: unknown, init: ResponseInit = {}, request?: Request) {
  const origin = request?.headers.get('Origin');
  const allowedOrigin = (init.headers as Record<string, string> | undefined)?.['Access-Control-Allow-Origin']
    || origin
    || DEFAULT_ALLOWED_ORIGIN;

  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Vary', 'Origin');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function withCors(response: Response, request: Request, env: Env) {
  const headers = new Headers(response.headers);
  const requestOrigin = request.headers.get('Origin');
  headers.set('Access-Control-Allow-Origin', requestOrigin || env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN);
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Vary', 'Origin');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function isAuthorized(request: Request, env: Env): boolean {
  const supplied = request.headers.get('Authorization') || '';
  const token = supplied.startsWith('Bearer ') ? supplied.slice(7).trim() : '';
  return Boolean(token && env.ELARA_BACKGROUND_TOKEN && token === env.ELARA_BACKGROUND_TOKEN);
}

function normalizeModel(model?: string) {
  const value = typeof model === 'string' ? model.trim().replace(/^models\//, '') : '';
  return value || DEFAULT_MODEL;
}

function buildContents(history: JobPayload['history'], message: string, image?: string) {
  const contents: Array<any> = [];
  for (const item of Array.isArray(history) ? history : []) {
    const parts: any[] = [];
    if (item.image) {
      const match = item.image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
    }
    if (item.content) parts.push({ text: item.content });
    if (parts.length) contents.push({ role: item.role === 'assistant' ? 'model' : item.role, parts });
  }

  const currentParts: any[] = [];
  if (image) {
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (match) currentParts.push({ inline_data: { mime_type: match[1], data: match[2] } });
  }
  currentParts.push({ text: message || 'Continue the conversation as Elara.' });
  contents.push({ role: 'user', parts: currentParts });
  return contents;
}

async function generateGeminiResponse(env: Env, job: JobPayload) {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured on the background runtime.');

  const model = normalizeModel(job.model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

  const body: Record<string, any> = {
    system_instruction: { parts: [{ text: job.systemPrompt || '' }] },
    contents: buildContents(job.history, job.message, job.image),
    generationConfig: {},
  };

  if (typeof job.temperature === 'number') body.generationConfig.temperature = job.temperature;
  if (typeof job.maxOutputTokens === 'number' && job.maxOutputTokens > 0) body.generationConfig.maxOutputTokens = job.maxOutputTokens;
  if (typeof job.topP === 'number') body.generationConfig.topP = job.topP;
  if (typeof job.topK === 'number') body.generationConfig.topK = job.topK;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let data: any = null;
  try { data = JSON.parse(raw); } catch {
    throw new Error(`Gemini returned non-JSON response (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const message = data?.error?.message || `Gemini request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  const parts = candidates[0]?.content?.parts || [];
  const text = parts
    .filter((part: any) => typeof part?.text === 'string')
    .map((part: any) => part.text)
    .join('');

  return {
    text,
    model,
    finishReason: candidates[0]?.finishReason || null,
    responseId: data?.responseId || null,
  };
}

export class ElaraChatWorkflow {
  constructor(public env: Env, public ctx: ExecutionContext) {}

  async run(event: { payload: JobPayload }, step: any) {
    const result = await step.do('generate-elara-response', async () => {
      return generateGeminiResponse(this.env, event.payload);
    });

    return {
      status: 'completed',
      completedAt: new Date().toISOString(),
      result,
    };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }), request, env);
    }

    if (!isAuthorized(request, env)) {
      return withCors(responseJson({ error: 'Unauthorized background runtime request.' }, { status: 401 }, request), request, env);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (request.method === 'POST' && path === '/jobs') {
        const body = await request.json() as Partial<JobPayload>;
        if (!body.message || typeof body.message !== 'string') {
          return withCors(responseJson({ error: 'message is required.' }, { status: 400 }, request), request, env);
        }
        if (!body.systemPrompt || typeof body.systemPrompt !== 'string') {
          return withCors(responseJson({ error: 'systemPrompt is required.' }, { status: 400 }, request), request, env);
        }

        const id = crypto.randomUUID();
        await env.ELARA_CHAT_WORKFLOW.create({
          id,
          params: {
            message: body.message,
            image: body.image,
            history: body.history || [],
            systemPrompt: body.systemPrompt,
            model: body.model,
            temperature: body.temperature,
            maxOutputTokens: body.maxOutputTokens,
            topP: body.topP,
            topK: body.topK,
          } satisfies JobPayload,
        });

        return withCors(responseJson({ id, status: 'queued' }, { status: 202 }, request), request, env);
      }

      const match = path.match(/^\/jobs\/([^/]+)$/);
      if (request.method === 'GET' && match) {
        const id = decodeURIComponent(match[1]);
        const instance = await env.ELARA_CHAT_WORKFLOW.get(id);
        const status = await instance.status();
        return withCors(responseJson({ id, ...status }, {}, request), request, env);
      }

      return withCors(responseJson({ error: 'Not found.' }, { status: 404 }, request), request, env);
    } catch (error: any) {
      return withCors(responseJson({ error: error?.message || 'Background runtime error.' }, { status: 500 }, request), request, env);
    }
  },
};
