import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';
console.log('GEMINI_API_KEY present:', Boolean(apiKey), 'Length:', apiKey.length);

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const candidates = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-4-argon',
];

async function run() {
  for (const m of candidates) {
    const t0 = Date.now();
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: 'Return the single word: READY',
      });
      console.log(`[PASS] ${m} responded in ${Date.now() - t0}ms: "${res.text?.trim()}"`);
    } catch (e) {
      console.log(`[FAIL] ${m} failed in ${Date.now() - t0}ms: status=${e?.status} code=${e?.code} msg=${e?.message}`);
    }
  }
}

run();
