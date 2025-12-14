// ChatGPT (OpenAI) vision helper for OMR
// Expects OPENAI_API_KEY in env and supports overriding model via CHATGPT_MODEL
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHATGPT_MODEL = process.env.CHATGPT_MODEL || "gpt-4o-mini";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

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

  const base64 = imageBuffer.toString("base64");

  const systemPrompt = `You are an expert at reading scanned Brazilian school answer sheets (gabaritos).
Your task is to extract student information from the header area of the form.
Return ONLY valid JSON, nothing else.`;

  const userPrompt = `Extract the student information from this scanned answer sheet header.

Look for these fields (they may be handwritten or printed):
- "Nome completo" or "Nome": The student's full name
- "Matrícula" or "Inscrição" or a number field: The student ID number
- "Turma": The class/group identifier (like "A", "B", "C" or "1A", "2B")
- "Série": The grade/year (like "1ª Série", "2ª Série", "3ª Série")

IMPORTANT:
- Extract EXACTLY what is written, do not invent data
- If a field is empty or illegible, use null
- For numbers, extract only digits
- Names should be in proper case (capitalize first letters)

Return this exact JSON format:
{
  "name": "STUDENT FULL NAME" or null,
  "studentNumber": "12345678" or null,
  "turma": "A" or null,
  "serie": "1ª Série C" or null
}`;

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: userPrompt },
        { type: "image_url", image_url: { url: `data:image/png;base64,${base64}` } },
      ],
    },
  ];

  const body = {
    model: CHATGPT_MODEL,
    messages,
    max_tokens: 300,
    temperature: 0,
  };

  try {
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
      console.error(`[GPT Header OCR] API error ${response.status}: ${errorText}`);
      return { name: null, studentNumber: null, turma: null, serie: null, rawText: errorText };
    }

    const data = await response.json();
    const rawText: string = data?.choices?.[0]?.message?.content?.trim?.() || "";

    // Parse JSON response
    let cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
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
