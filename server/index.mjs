import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleAuth } from 'google-auth-library';

const {
  GEMINI_API_KEY,
  GOOGLE_APPLICATION_CREDENTIALS,
  GCP_PROJECT_ID,
  GCP_LOCATION = 'us-central1',
  GEMINI_MODEL = 'gemini-2.0-flash',
  CONFLUENCE_BASE_URL,
  CONFLUENCE_PAT,
  CONFLUENCE_ROOT_PAGE_ID,
  CONFLUENCE_CACHE_MINUTES = '5',
  SLACK_WEBHOOK_URL,
  PORT = 8787,
} = process.env;

// GEMINI_API_KEY가 없고 서비스 계정/프로젝트 정보가 있으면 VertexAI 경로를 사용
const useVertexAI = !GEMINI_API_KEY && !!GOOGLE_APPLICATION_CREDENTIALS && !!GCP_PROJECT_ID;

const app = express();
app.use(cors());
app.use(express.json());

// ── Confluence 지식 베이스 (루트 페이지 + 하위 트리 전체) ──────────────────────

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function confluenceFetch(path) {
  const res = await fetch(`${CONFLUENCE_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${CONFLUENCE_PAT}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Confluence API ${res.status} on ${path}`);
  }
  return res.json();
}

async function collectPageTree(rootId) {
  const collected = [];
  const queue = [rootId];
  const seen = new Set();

  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);

    const page = await confluenceFetch(`/rest/api/content/${id}?expand=body.storage`);
    collected.push({ id, title: page.title, text: stripHtml(page.body?.storage?.value || '') });

    let start = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const children = await confluenceFetch(`/rest/api/content/${id}/child/page?limit=50&start=${start}`);
      for (const c of children.results) queue.push(c.id);
      if (!children._links || !children._links.next) break;
      start += children.size;
    }
  }

  return collected;
}

let kbCache = { text: '', pages: [], fetchedAt: 0 };

async function getKnowledgeBase() {
  const ttlMs = Number(CONFLUENCE_CACHE_MINUTES) * 60 * 1000;
  if (kbCache.text && Date.now() - kbCache.fetchedAt < ttlMs) return kbCache;

  const pages = await collectPageTree(CONFLUENCE_ROOT_PAGE_ID);
  const text = pages.map(p => `# ${p.title}\n${p.text}`).join('\n\n---\n\n');
  kbCache = { text, pages, fetchedAt: Date.now() };
  return kbCache;
}

// ── Gemini (AI Studio API 키 방식 또는 VertexAI 방식) ──────────────────────────

let googleAuthClient = null;
function getGoogleAuth() {
  if (!googleAuthClient) {
    googleAuthClient = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
  }
  return googleAuthClient;
}

async function callGeminiViaAiStudio(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
    }
  );
  if (!res.ok) throw new Error(`Gemini(AI Studio) API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function callGeminiViaVertexAI(prompt) {
  const auth = getGoogleAuth();
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  // 'global' 리전은 리전 prefix가 없는 호스트(aiplatform.googleapis.com)를 씀 — 지역 리전(예: us-central1)만 `{region}-aiplatform.googleapis.com` 형태
  const host = GCP_LOCATION === 'global' ? 'aiplatform.googleapis.com' : `${GCP_LOCATION}-aiplatform.googleapis.com`;
  const url = `https://${host}/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/publishers/google/models/${GEMINI_MODEL}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) throw new Error(`Gemini(VertexAI) API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function askGemini(question, contextText) {
  const prompt = `당신은 사내 정산 플랫폼(LIS 정산 개편)의 스펙 문서를 기반으로 질문에 답하는 도우미입니다.
아래는 컨플루언스에 정리된 스펙 문서 전체 내용입니다. 반드시 이 문서 내용을 근거로만 답변하고,
문서에서 근거를 찾을 수 없으면 모른다고 솔직히 답하세요. 답변은 한국어로 간결하고 명확하게 작성하세요.

--- 문서 시작 ---
${contextText}
--- 문서 끝 ---

질문: ${question}`;

  const data = useVertexAI ? await callGeminiViaVertexAI(prompt) : await callGeminiViaAiStudio(prompt);
  const answer = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('');
  return answer || '답변을 생성하지 못했어요.';
}

// ── Slack ───────────────────────────────────────────────────────────────────

async function notifySlack(question, answer) {
  if (!SLACK_WEBHOOK_URL) return;
  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `*AI 문의*\n*Q:* ${question}\n*A:* ${answer}` }),
    });
  } catch (e) {
    console.error('Slack 알림 전송 실패:', e);
  }
}

// ── Routes ──────────────────────────────────────────────────────────────────

app.post('/api/ask', async (req, res) => {
  const { question } = req.body || {};
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question이 필요합니다.' });
  }
  if (!GEMINI_API_KEY && !useVertexAI) {
    return res.status(500).json({
      error: 'Gemini 인증 정보가 없습니다. .env에 GEMINI_API_KEY 또는 (GOOGLE_APPLICATION_CREDENTIALS + GCP_PROJECT_ID)를 설정하세요.',
    });
  }
  if (!CONFLUENCE_BASE_URL || !CONFLUENCE_PAT || !CONFLUENCE_ROOT_PAGE_ID) {
    return res.status(500).json({ error: 'Confluence 설정이 누락되었습니다. .env를 확인하세요.' });
  }

  try {
    const kb = await getKnowledgeBase();
    const answer = await askGemini(question.trim(), kb.text);
    notifySlack(question.trim(), answer); // fire-and-forget
    res.json({ answer, sourcePageCount: kb.pages.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '답변 생성에 실패했습니다.', detail: String(e.message || e) });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    llmMode: useVertexAI ? 'vertexai' : (GEMINI_API_KEY ? 'ai-studio' : 'not-configured'),
    cachedPages: kbCache.pages.length,
    cachedAt: kbCache.fetchedAt || null,
  });
});

app.listen(PORT, () => {
  console.log(`AI 문의 백엔드 실행 중: http://localhost:${PORT}`);
});
