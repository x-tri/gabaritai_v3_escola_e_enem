// ChatGPT (OpenAI) vision helper for OMR
// Expects OPENAI_API_KEY in env and supports overriding model via CHATGPT_MODEL
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHATGPT_MODEL = process.env.CHATGPT_MODEL || "gpt-4o-mini";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

// 🔧 Configurações de retry para evitar rate limiting
const GPT_TIMEOUT_MS = 30000; // 30 segundos timeout
const GPT_MAX_RETRIES = 3;
const GPT_INITIAL_DELAY_MS = 1000; // 1 segundo

/**
 * Faz fetch com timeout e retry exponencial
 * Resolve problema de rate limiting da OpenAI após muitas chamadas
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = GPT_MAX_RETRIES,
  initialDelay = GPT_INITIAL_DELAY_MS
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GPT_TIMEOUT_MS);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Se rate limited (429), fazer retry com backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : initialDelay * Math.pow(2, attempt - 1);
        console.warn(`[GPT] ⚠️ Rate limited (429). Tentativa ${attempt}/${maxRetries}. Aguardando ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      // Se foi abort por timeout
      if ((error as Error).name === 'AbortError') {
        console.warn(`[GPT] ⏱️ Timeout (${GPT_TIMEOUT_MS}ms). Tentativa ${attempt}/${maxRetries}`);
      } else {
        console.warn(`[GPT] ❌ Erro na tentativa ${attempt}/${maxRetries}:`, (error as Error).message);
      }

      // Se ainda tem tentativas, esperar com backoff exponencial
      if (attempt < maxRetries) {
        const waitTime = initialDelay * Math.pow(2, attempt - 1);
        console.log(`[GPT] 🔄 Aguardando ${waitTime}ms antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error(`Falha após ${maxRetries} tentativas`);
}

export interface ChatGPTOMRResponse {
  answers: Array<string | null>;
  corrections?: Array<{
    q: number;
    omr: string | null;
    corrected: string | null;
    reason?: string;
  }>;
  rawText: string;
  model: string;
  scanQuality?: {
    quality: "excellent" | "good" | "fair" | "poor" | "critical";
    issues?: string[];
    warnings?: string[];
    canProcess: boolean;
  };
  studentInfo?: {
    name: string | null;
    studentNumber: string | null;
  };
}

type ChatMessage = { role: string; content: any };

function buildPrompt(totalQuestions: number, omrAnswers?: Array<string | null>): ChatMessage[] {
  const systemPrompt = omrAnswers
    ? "You are an expert OMR validator and scan quality inspector. Your tasks: 1) Extract Student Name and ID (Matrícula) from the header. 2) Analyze the scan quality. 3) Validate/correct the automated OMR readings. Return JSON only."
    : "You are a strict OMR reader. Extract Student Name, ID and answers. Return JSON only.";

  const userPrompt = omrAnswers
    ? `🚨 CRITICAL MISSION: VALIDATE OMR WITHOUT INVENTING DATA

⚠️  ABSOLUTE RULE: DO NOT INVENT OR FABRICATE ANY ANSWERS
⚠️  ONLY REPORT ANSWERS THAT ARE VISUALLY MARKED ON THE PAPER
⚠️  IF NO BUBBLES ARE MARKED, RETURN ALL null VALUES

STEP 1 - HEADER EXTRACTION (ONLY IF CLEARLY VISIBLE):
Look at the TOP of the image for handwriting or printed text:
- "Nome" / "Name": Only extract if CLEARLY visible, otherwise use null
- "Matrícula" / "Inscrição" / "ID": Only extract if CLEARLY visible, otherwise use null

STEP 2 - SCAN QUALITY ASSESSMENT:
Examine the image for blur, rotation, cropping, contrast, obstructions.

STEP 3 - OMR VALIDATION (STRICT):
The automated OMR detected: ${JSON.stringify(omrAnswers)}

🔍 VISUAL INSPECTION REQUIRED:
- Scan the ENTIRE image for DARK/MARKED bubbles
- ONLY mark questions where you can CLEARLY see a filled bubble
- If you cannot see any marked bubbles, leave as null
- If you see a mark but cannot determine which bubble, leave as null
- DO NOT guess or assume answers

⚠️  REMEMBER: It's better to miss a real answer than to invent a fake one!

RETURN JSON FORMAT:
{
  "studentInfo": {
    "name": null,
    "studentNumber": null
  },
  "answers": [null, null, null, null, ...],  // 90 nulls if no answers marked
  "corrections": [],  // Only if you can VISUALLY confirm corrections
  "scanQuality": {
    "quality": "excellent" | "good" | "fair" | "poor" | "critical",
    "issues": ["..."],
    "canProcess": true/false
  }
}`
    : `🚨 EMERGENCY: STRICT OMR READING - NO FABRICATION ALLOWED

⚠️  CRITICAL WARNING: DO NOT INVENT ANY DATA
⚠️  ONLY EXTRACT INFORMATION THAT EXISTS ON THE PAPER
⚠️  IF NOTHING IS VISIBLE, USE null VALUES

STEP 1 - HEADER EXTRACTION (ONLY IF CLEARLY LEGIBLE):
Look at the TOP of the image for student information:
- "Nome" / "Nome completo": Only extract if CLEARLY visible and readable, otherwise null
- "Matrícula" / "Inscrição": Only extract if CLEARLY visible numbers, otherwise null

STEP 2 - BUBBLE INSPECTION (VISUAL ONLY):
This is an ENEM answer sheet with ${totalQuestions} questions in a 6x15 grid.
Each question has 5 options: A(left), B, C, D, E(right).

🔍 VISUAL SCAN REQUIRED:
- Examine the ENTIRE image pixel by pixel
- Look for bubbles that are VISUALLY FILLED/DARK
- Count the columns and rows to locate each question
- Questions 1-15: Leftmost column
- Questions 16-30: Second column from left
- Questions 31-45: Third column
- Questions 46-60: Fourth column
- Questions 61-75: Fifth column
- Questions 76-90: Rightmost column

STEP 3 - MARKING CRITERIA:
✅ FILLED: Bubble appears significantly DARKER than surrounding area
❌ EMPTY: Bubble is LIGHT/WHITE like the paper
❓ AMBIGUOUS: Cannot clearly determine - mark as null

STEP 4 - OUTPUT (STRICT FORMAT):
Return ONLY valid JSON. If no answers are marked, return all nulls:

{
  "studentInfo": {
    "name": null,
    "studentNumber": null
  },
  "answers": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  "scanQuality": {
    "quality": "poor",
    "issues": ["No marked answers found"],
    "canProcess": false
  }
}

⚠️  FINAL WARNING: Better to return empty answers than wrong ones!`;

  return [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: userPrompt,
        },
      ],
    },
  ];
}

export async function callChatGPTVisionOMR(
  imageBuffer: Buffer,
  totalQuestions: number,
  omrAnswers?: Array<string | null>
): Promise<ChatGPTOMRResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const base64 = imageBuffer.toString("base64");

  const messages = buildPrompt(totalQuestions, omrAnswers);
  const lastMsg = messages[messages.length - 1];
  if (lastMsg && typeof lastMsg !== "string" && "content" in lastMsg && Array.isArray((lastMsg as any).content)) {
    (lastMsg as any).content.push({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${base64}` },
    });
  }

  const body = {
    model: CHATGPT_MODEL,
    messages,
    max_tokens: omrAnswers ? 2000 : 800, // Increased for quality assessment
    temperature: 0,
  };

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawText: string = data?.choices?.[0]?.message?.content?.trim?.() || "";

  const parsed = parseAnswersWithCorrections(rawText, totalQuestions, omrAnswers);
  return {
    answers: parsed.answers,
    corrections: parsed.corrections,
    rawText,
    model: data?.model || CHATGPT_MODEL,
    scanQuality: parsed.scanQuality,
    studentInfo: parsed.studentInfo,
  };
}

function normalizeAnswers(arr: any[], totalQuestions: number): Array<string | null> {
  const normalized: Array<string | null> = [];
  
  // VALIDAÇÃO: Garantir que sempre retornamos exatamente totalQuestions elementos
  for (let i = 0; i < totalQuestions; i++) {
    const val = arr[i];
    if (typeof val === "string" && /[A-E]/i.test(val)) {
      normalized.push(val.trim().toUpperCase());
    } else if (val === null || val === undefined || val === "") {
      normalized.push(null);
    } else {
      // Tentar extrair letra de strings como "A", "B", etc.
      const letterMatch = String(val).trim().toUpperCase().match(/^[A-E]$/);
      if (letterMatch) {
        normalized.push(letterMatch[0]);
      } else {
        normalized.push(null);
      }
    }
  }
  
  // GARANTIA FINAL: Se o array recebido tinha menos elementos, preencher com null
  // Se tinha mais, truncar
  if (normalized.length !== totalQuestions) {
    console.warn(`[ChatGPT OMR] ⚠️  normalizeAnswers: Array tinha ${normalized.length} elementos, ajustando para ${totalQuestions}`);
    while (normalized.length < totalQuestions) {
      normalized.push(null);
    }
    return normalized.slice(0, totalQuestions);
  }
  
  return normalized;
}

function parseAnswersWithCorrections(
  raw: string,
  totalQuestions: number,
  omrAnswers?: Array<string | null>
): {
  answers: Array<string | null>;
  corrections?: Array<{ q: number; omr: string | null; corrected: string | null; reason?: string }>;
  scanQuality?: {
    quality: "excellent" | "good" | "fair" | "poor" | "critical";
    issues?: string[];
    warnings?: string[];
    canProcess: boolean;
  };
  studentInfo?: {
    name: string | null;
    studentNumber: string | null;
  };
} {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.answers)) {
      return {
        answers: normalizeAnswers(parsed.answers, totalQuestions),
        corrections: parsed.corrections || undefined,
        scanQuality: parsed.scanQuality ? {
          quality: parsed.scanQuality.quality || "fair",
          issues: parsed.scanQuality.issues || [],
          warnings: parsed.scanQuality.warnings || [],
          canProcess: parsed.scanQuality.canProcess !== false, // Default to true if not specified
        } : undefined,
        studentInfo: parsed.studentInfo ? {
          name: parsed.studentInfo.name || null,
          studentNumber: parsed.studentInfo.studentNumber || null,
        } : undefined,
      };
    }
  } catch (e) {
    // ignore and try regex parsing below
  }

  const match = cleaned.match(/\{[\s\S]*"answers"[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed.answers)) {
        return {
          answers: normalizeAnswers(parsed.answers, totalQuestions),
          corrections: parsed.corrections || undefined,
          scanQuality: parsed.scanQuality ? {
            quality: parsed.scanQuality.quality || "fair",
            issues: parsed.scanQuality.issues || [],
            warnings: parsed.scanQuality.warnings || [],
            canProcess: parsed.scanQuality.canProcess !== false,
          } : undefined,
          studentInfo: parsed.studentInfo ? {
            name: parsed.studentInfo.name || null,
            studentNumber: parsed.studentInfo.studentNumber || null,
          } : undefined,
        };
      }
    } catch (e) {
      // ignore
    }
  }

  const letters = cleaned.match(/[A-E]/gi) || [];
  if (letters.length > 0) {
    return {
      answers: normalizeAnswers(letters, totalQuestions),
      corrections: undefined,
      scanQuality: {
        quality: "fair" as const,
        issues: ["Could not parse full quality assessment"],
        warnings: [],
        canProcess: true,
      },
    };
  }

  return {
    answers: Array.from({ length: totalQuestions }, () => null),
    corrections: undefined,
    scanQuality: {
      quality: "poor" as const,
      issues: ["Could not extract answers"],
      warnings: [],
      canProcess: false,
    },
  };
}

/**
 * ✅ NOVO FLUXO: Processa dados BRUTOS do OMR (bolinhas detectadas)
 * com auditoria do GPT Vision
 * 
 * Entrada: 
 *   - Imagem
 *   - Lista de bolinhas detectadas pelo OMR Python
 * 
 * Saída:
 *   - Gabarito validado/corrigido pelo GPT Vision
 */
export async function callChatGPTVisionOMRWithBubbles(
  imageBuffer: Buffer,
  totalQuestions: number,
  omrBubbles: Array<{
    question_number: number;
    option: string;
    x: number;
    y: number;
    radius: number;
  }>
): Promise<ChatGPTOMRResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const base64 = imageBuffer.toString("base64");

  // Construir prompt para análise de bolinhas detectadas
  const systemPrompt = "You are an expert OMR validator. Analyze the image and the detected bubbles. Your task: 1) Identify which bubbles are actually FILLED/MARKED. 2) Extract student info from header. 3) Return a corrected answer sheet. Return JSON only.";

  const bubblesDescription = omrBubbles
    .map(b => `Q${b.question_number}:${b.option}(x=${b.x},y=${b.y},r=${b.radius})`)
    .join(", ");

  const userPrompt = `CRITICAL TASK: Validate OMR bubble detection.

The OMR system detected the following bubbles in the image:
${bubblesDescription}

ANALYSIS REQUIRED:
1. HEADER EXTRACTION: Extract student name and ID from the top of the form
2. BUBBLE VALIDATION: For each detected bubble, determine if it is ACTUALLY FILLED/MARKED:
   - FILLED: The bubble appears DARK/BLACK inside
   - EMPTY: The bubble is LIGHT/WHITE (just outline)
3. MARK CONFIDENCE: Assign a confidence level to each marked bubble
4. CORRECTIONS: If a bubble is NOT actually filled, mark as null

INSTRUCTIONS:
- Carefully examine EACH bubble location shown in the coordinates
- A filled bubble will appear much darker than an empty one
- If multiple bubbles are marked for one question, mark as ambiguous/null
- Only return letters A-E if the corresponding bubble is CLEARLY FILLED

RETURN EXACTLY THIS JSON FORMAT:
{
  "studentInfo": {
    "name": "STUDENT FULL NAME",
    "studentNumber": "12345678"
  },
  "answers": ["A", "B", null, "C", ...],
  "corrections": [
    {"q": 1, "detected": true, "actual": false, "reason": "Bubble appeared empty upon inspection"}
  ],
  "scanQuality": {
    "quality": "good",
    "issues": [],
    "canProcess": true
  }
}

The "answers" array MUST have EXACTLY ${totalQuestions} elements.`;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: userPrompt,
        },
        {
          type: "image_url",
          image_url: { url: `data:image/png;base64,${base64}` },
        },
      ],
    },
  ];

  const body = {
    model: CHATGPT_MODEL,
    messages,
    max_tokens: 2000,
    temperature: 0,
  };

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawText: string = data?.choices?.[0]?.message?.content?.trim?.() || "";

  const parsed = parseAnswersWithCorrections(rawText, totalQuestions);
  return {
    answers: parsed.answers,
    corrections: parsed.corrections,
    rawText,
    model: data?.model || CHATGPT_MODEL,
    scanQuality: parsed.scanQuality,
    studentInfo: parsed.studentInfo,
  };
}

/**
 * Extrai informações do cabeçalho do gabarito usando GPT Vision
 * (Nome, Matrícula, Turma, Série)
 */
export interface StudentHeaderInfo {
  name: string | null;
  studentNumber: string | null;
  turma: string | null;
  serie: string | null;
  rawText: string;
}

export async function extractHeaderInfoWithGPT(
  imageBuffer: Buffer
): Promise<StudentHeaderInfo> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const sharp = (await import("sharp")).default;

  // 🚀 OTIMIZAÇÃO: Cortar só o header (top 40%) e reduzir para 768px de largura
  const metadata = await sharp(imageBuffer).metadata();
  const headerHeight = Math.round((metadata.height || 3400) * 0.40);

  const optimizedBuffer = await sharp(imageBuffer)
    .extract({ left: 0, top: 0, width: metadata.width || 2400, height: headerHeight })
    .resize(768, null, { fit: 'inside' })
    .jpeg({ quality: 85 })
    .toBuffer();

  const base64 = optimizedBuffer.toString("base64");
  const originalSize = imageBuffer.length;
  const optimizedSize = optimizedBuffer.length;
  console.log(`[GPT Header] 🚀 Imagem otimizada: ${Math.round(originalSize/1024)}KB → ${Math.round(optimizedSize/1024)}KB (${Math.round(optimizedSize/originalSize*100)}%)`);

  // 🚀 PROMPT SIMPLIFICADO (menos tokens)
  const systemPrompt = `Extract student info from Brazilian answer sheet header. Return ONLY JSON.`;

  const userPrompt = `Extract from header:
- name: student full name
- studentNumber: matrícula/ID number (exact, with letters if any)
- turma: class (A, B, 1A, etc)
- serie: grade (1ª Série, 2ª Série)

Return JSON: {"name":"...", "studentNumber":"...", "turma":"...", "serie":"..."}
Use null if not visible.`;

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: userPrompt },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${base64}`,
            detail: "low"  // 🚀 85 tokens fixo, processamento rápido
          }
        },
      ],
    },
  ];

  const body = {
    model: CHATGPT_MODEL,
    messages,
    max_tokens: 150,  // 🚀 Reduzido (JSON pequeno)
    temperature: 0,
  };

  try {
    // 🔧 Usando fetchWithRetry para evitar rate limiting e timeout
    const response = await fetchWithRetry(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GPT Header OCR] API error ${response.status}: ${errorText}`);
      return { name: null, studentNumber: null, turma: null, serie: null, rawText: errorText };
    }

    const data = await response.json();
    const rawText: string = data?.choices?.[0]?.message?.content?.trim?.() || "";

    // 🔍 DEBUG: Log completo da resposta do GPT
    console.log(`[GPT Header OCR] 🔍 Resposta GPT: "${rawText.substring(0, 200)}"`);

    // Parse JSON response
    let cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      // 🔍 DEBUG: Log dos valores extraídos
      console.log(`[GPT Header OCR] ✅ name="${parsed.name}" matricula="${parsed.studentNumber}" turma="${parsed.turma}"`);
      return {
        name: parsed.name || null,
        studentNumber: parsed.studentNumber || null,
        turma: parsed.turma || null,
        serie: parsed.serie || null,
        rawText,
      };
    } catch {
      // Try to extract from malformed response
      const nameMatch = rawText.match(/"name"\s*:\s*"([^"]+)"/i);
      const numberMatch = rawText.match(/"studentNumber"\s*:\s*"([^"]+)"/i);
      const turmaMatch = rawText.match(/"turma"\s*:\s*"([^"]+)"/i);
      const serieMatch = rawText.match(/"serie"\s*:\s*"([^"]+)"/i);

      return {
        name: nameMatch?.[1] || null,
        studentNumber: numberMatch?.[1] || null,
        turma: turmaMatch?.[1] || null,
        serie: serieMatch?.[1] || null,
        rawText,
      };
    }
  } catch (error: any) {
    console.error(`[GPT Header OCR] Error:`, error.message);
    return { name: null, studentNumber: null, turma: null, serie: null, rawText: error.message };
  }
}
