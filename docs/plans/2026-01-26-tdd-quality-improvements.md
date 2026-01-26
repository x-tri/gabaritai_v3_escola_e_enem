# TDD Quality Improvements - Plano de Implementacao

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Aumentar a cobertura de testes de ~10% para 80%+ usando TDD, corrigindo problemas de type-safety, validacao e seguranca identificados na analise.

**Architecture:** Abordagem incremental TDD - escrever testes que falham primeiro, implementar correcoes minimas, refatorar. Foco em: (1) Schemas Zod, (2) Auth middleware, (3) Rate limiting, (4) Type-safety em routes.

**Tech Stack:** Vitest, Supertest, MSW (mocking), Zod, Express

---

## Pre-requisitos

Antes de iniciar, verificar ambiente:

```bash
npm run test          # Deve rodar sem erros
npm run check         # TypeScript deve compilar
```

---

## Task 1: Schema Validation - question_contents

**Problema:** `question_contents` aceita `any`, permitindo dados invalidos.

**Files:**
- Modify: `shared/schema.ts:24-28`
- Create: `shared/__tests__/schema.test.ts`

**Step 1: Escrever teste que falha**

```typescript
// shared/__tests__/schema.test.ts
import { describe, it, expect } from 'vitest';
import { questionContentSchema } from '../schema';

describe('questionContentSchema', () => {
  it('rejects invalid question number (negative)', () => {
    const result = questionContentSchema.safeParse({
      questionNumber: -1,
      answer: 'A',
      content: 'Matematica',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid answer (not A-E)', () => {
    const result = questionContentSchema.safeParse({
      questionNumber: 1,
      answer: 'Z',
      content: 'Matematica',
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty content', () => {
    const result = questionContentSchema.safeParse({
      questionNumber: 1,
      answer: 'A',
      content: '',
    });

    expect(result.success).toBe(false);
  });

  it('accepts valid question content', () => {
    const result = questionContentSchema.safeParse({
      questionNumber: 1,
      answer: 'A',
      content: 'Matematica - Funcoes',
    });

    expect(result.success).toBe(true);
  });
});
```

**Step 2: Rodar teste para verificar falha**

Run: `npm run test -- shared/__tests__/schema.test.ts`
Expected: FAIL - alguns testes devem falhar porque validacao nao existe

**Step 3: Implementar validacao**

```typescript
// shared/schema.ts - linha 24-28 - substituir
export const questionContentSchema = z.object({
  questionNumber: z.number().int().positive('Numero da questao deve ser positivo'),
  answer: z.string().regex(/^[A-Ea-e]$/, 'Resposta deve ser A, B, C, D ou E'),
  content: z.string().min(1, 'Conteudo nao pode ser vazio'),
});
```

**Step 4: Rodar teste para verificar sucesso**

Run: `npm run test -- shared/__tests__/schema.test.ts`
Expected: PASS - todos os testes devem passar

**Step 5: Commit**

```bash
git add shared/schema.ts shared/__tests__/schema.test.ts
git commit -m "$(cat <<'EOF'
feat(schema): add validation to questionContentSchema

- Validate questionNumber is positive integer
- Validate answer is A-E (case insensitive)
- Validate content is non-empty string
EOF
)"
```

---

## Task 2: Schema Validation - examDisciplineSchema

**Problema:** Schema usa `any` em refinements (`data: any`).

**Files:**
- Modify: `shared/schema.ts:199-208`
- Modify: `shared/__tests__/schema.test.ts`

**Step 1: Escrever teste que falha**

```typescript
// shared/__tests__/schema.test.ts - adicionar
import { examDisciplineSchema } from '../schema';

describe('examDisciplineSchema', () => {
  it('rejects when endQuestion < startQuestion', () => {
    const result = examDisciplineSchema.safeParse({
      id: 'disc-1',
      name: 'Matematica',
      startQuestion: 10,
      endQuestion: 5,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('>=');
    }
  });

  it('rejects negative startQuestion', () => {
    const result = examDisciplineSchema.safeParse({
      id: 'disc-1',
      name: 'Matematica',
      startQuestion: -1,
      endQuestion: 10,
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = examDisciplineSchema.safeParse({
      id: 'disc-1',
      name: '',
      startQuestion: 1,
      endQuestion: 10,
    });

    expect(result.success).toBe(false);
  });

  it('accepts valid discipline', () => {
    const result = examDisciplineSchema.safeParse({
      id: 'disc-1',
      name: 'Matematica',
      startQuestion: 1,
      endQuestion: 45,
      color: '#FF0000',
    });

    expect(result.success).toBe(true);
  });
});
```

**Step 2: Rodar teste para verificar falha**

Run: `npm run test -- shared/__tests__/schema.test.ts`
Expected: Pode passar ou falhar dependendo da implementacao atual

**Step 3: Corrigir type casting**

```typescript
// shared/schema.ts - linha 199-208 - substituir
export const examDisciplineSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nome da disciplina e obrigatorio'),
  startQuestion: z.number().int().positive('Questao inicial deve ser positiva'),
  endQuestion: z.number().int().positive('Questao final deve ser positiva'),
  color: z.string().optional(),
}).refine(
  (data) => data.endQuestion >= data.startQuestion,
  { message: 'Questao final deve ser >= questao inicial' }
);
```

**Step 4: Rodar teste para verificar sucesso**

Run: `npm run test -- shared/__tests__/schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add shared/schema.ts shared/__tests__/schema.test.ts
git commit -m "$(cat <<'EOF'
fix(schema): remove any type casting from examDisciplineSchema

Type-safe refinement without any casting
EOF
)"
```

---

## Task 3: Schema Validation - examConfigurationSchema

**Problema:** Schema usa `any` em refinements e validacoes.

**Files:**
- Modify: `shared/schema.ts:212-244`
- Modify: `shared/__tests__/schema.test.ts`

**Step 1: Escrever teste que falha**

```typescript
// shared/__tests__/schema.test.ts - adicionar
import { examConfigurationSchema } from '../schema';

describe('examConfigurationSchema', () => {
  const validDisciplines = [
    { id: 'd1', name: 'LC', startQuestion: 1, endQuestion: 45 },
    { id: 'd2', name: 'MT', startQuestion: 46, endQuestion: 90 },
  ];

  it('rejects overlapping disciplines', () => {
    const result = examConfigurationSchema.safeParse({
      userId: 'user-1',
      name: 'ENEM',
      totalQuestions: 90,
      alternativesCount: 5,
      maxScoreTCT: 10,
      disciplines: [
        { id: 'd1', name: 'LC', startQuestion: 1, endQuestion: 50 },
        { id: 'd2', name: 'MT', startQuestion: 40, endQuestion: 90 }, // overlap 40-50
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects when disciplines dont cover all questions', () => {
    const result = examConfigurationSchema.safeParse({
      userId: 'user-1',
      name: 'ENEM',
      totalQuestions: 90,
      alternativesCount: 5,
      maxScoreTCT: 10,
      disciplines: [
        { id: 'd1', name: 'LC', startQuestion: 1, endQuestion: 40 }, // faltam 41-90
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid alternativesCount (not 4 or 5)', () => {
    const result = examConfigurationSchema.safeParse({
      userId: 'user-1',
      name: 'ENEM',
      totalQuestions: 90,
      alternativesCount: 3,
      maxScoreTCT: 10,
      disciplines: validDisciplines,
    });

    expect(result.success).toBe(false);
  });

  it('accepts valid configuration', () => {
    const result = examConfigurationSchema.safeParse({
      userId: 'user-1',
      name: 'ENEM Completo',
      totalQuestions: 90,
      alternativesCount: 5,
      maxScoreTCT: 10,
      usesTRI: true,
      disciplines: validDisciplines,
    });

    expect(result.success).toBe(true);
  });
});
```

**Step 2: Rodar teste para verificar falha**

Run: `npm run test -- shared/__tests__/schema.test.ts`
Expected: Pode falhar em alguns casos

**Step 3: Corrigir type casting**

```typescript
// shared/schema.ts - linha 212-244 - substituir
export const examConfigurationSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  name: z.string().min(3, 'Nome deve ter no minimo 3 caracteres'),
  totalQuestions: z.number().int().min(5, 'Minimo de 5 questoes').max(500, 'Maximo de 500 questoes'),
  alternativesCount: z.number().int().refine(
    (val) => val === 4 || val === 5,
    { message: 'Alternativas devem ser 4 ou 5' }
  ),
  maxScoreTCT: z.number().positive('Nota maxima deve ser positiva'),
  usesTRI: z.boolean().default(false),
  usesAdjustedTRI: z.boolean().default(false),
  disciplines: z.array(examDisciplineSchema).min(1, 'Adicione pelo menos uma disciplina'),
  isActive: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).refine(
  (data) => {
    const allQuestions = new Set<number>();
    for (const disc of data.disciplines) {
      for (let i = disc.startQuestion; i <= disc.endQuestion; i++) {
        if (allQuestions.has(i)) {
          return false;
        }
        allQuestions.add(i);
      }
    }
    return allQuestions.size === data.totalQuestions;
  },
  { message: 'Disciplinas devem cobrir TODAS as questoes sem sobreposicao' }
);
```

**Step 4: Rodar teste para verificar sucesso**

Run: `npm run test -- shared/__tests__/schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add shared/schema.ts shared/__tests__/schema.test.ts
git commit -m "$(cat <<'EOF'
fix(schema): remove any type casting from examConfigurationSchema

Type-safe validation for disciplines overlap and coverage
EOF
)"
```

---

## Task 4: Auth Middleware - Unit Tests

**Problema:** Middleware de auth nao tem testes.

**Files:**
- Create: `server/lib/__tests__/auth.test.ts`

**Step 1: Escrever testes**

```typescript
// server/lib/__tests__/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole, requireSchoolAccess, AuthenticatedRequest } from '../auth';

// Mock supabaseAdmin
vi.mock('../supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}));

import { supabaseAdmin } from '../supabase';

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as Request;
}

function createMockResponse(): Response {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Token de autenticacao ausente',
      code: 'MISSING_TOKEN',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is not Bearer', async () => {
    const req = createMockRequest({
      headers: { authorization: 'Basic abc123' },
    });
    const res = createMockResponse();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', async () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer invalid-token' },
    });
    const res = createMockResponse();
    const next = vi.fn();

    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    } as any);

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Token invalido ou expirado',
      code: 'INVALID_TOKEN',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and sets user when token is valid', async () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer valid-token' },
    });
    const res = createMockResponse();
    const next = vi.fn();

    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: {
        user: { id: 'user-123', email: 'test@example.com' },
      },
      error: null,
    } as any);

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as AuthenticatedRequest).user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
    });
  });
});

describe('requireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not set', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    const middleware = requireRole('super_admin');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when profile not found', async () => {
    const req = createMockRequest() as AuthenticatedRequest;
    req.user = { id: 'user-123', email: 'test@example.com' };
    const res = createMockResponse();
    const next = vi.fn();

    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    } as any);

    const middleware = requireRole('super_admin');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Perfil de usuario nao encontrado',
      code: 'PROFILE_NOT_FOUND',
    });
  });

  it('returns 403 when role is not allowed', async () => {
    const req = createMockRequest() as AuthenticatedRequest;
    req.user = { id: 'user-123', email: 'test@example.com' };
    const res = createMockResponse();
    const next = vi.fn();

    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'user-123', role: 'student', school_id: 'school-1' },
            error: null,
          }),
        }),
      }),
    } as any);

    const middleware = requireRole('super_admin', 'school_admin');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INSUFFICIENT_PERMISSION',
      })
    );
  });

  it('calls next when role is allowed', async () => {
    const req = createMockRequest() as AuthenticatedRequest;
    req.user = { id: 'user-123', email: 'test@example.com' };
    const res = createMockResponse();
    const next = vi.fn();

    const mockProfile = {
      id: 'user-123',
      role: 'super_admin',
      school_id: null,
      name: 'Admin',
      allowed_series: null,
    };

    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    } as any);

    const middleware = requireRole('super_admin');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.profile).toEqual(mockProfile);
  });
});

describe('requireSchoolAccess', () => {
  it('allows super_admin to access any school', async () => {
    const req = createMockRequest({
      body: { school_id: 'other-school' },
    }) as AuthenticatedRequest;
    req.profile = {
      id: 'user-123',
      role: 'super_admin',
      school_id: null,
      name: 'Admin',
      allowed_series: null,
    };
    const res = createMockResponse();
    const next = vi.fn();

    const middleware = requireSchoolAccess();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('denies school_admin access to different school', async () => {
    const req = createMockRequest({
      body: { school_id: 'other-school' },
    }) as AuthenticatedRequest;
    req.profile = {
      id: 'user-123',
      role: 'school_admin',
      school_id: 'my-school',
      name: 'Admin',
      allowed_series: null,
    };
    const res = createMockResponse();
    const next = vi.fn();

    const middleware = requireSchoolAccess();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Acesso negado a esta escola',
      code: 'SCHOOL_ACCESS_DENIED',
    });
  });

  it('allows school_admin access to own school', async () => {
    const req = createMockRequest({
      body: { school_id: 'my-school' },
    }) as AuthenticatedRequest;
    req.profile = {
      id: 'user-123',
      role: 'school_admin',
      school_id: 'my-school',
      name: 'Admin',
      allowed_series: null,
    };
    const res = createMockResponse();
    const next = vi.fn();

    const middleware = requireSchoolAccess();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
```

**Step 2: Rodar teste para verificar comportamento**

Run: `npm run test -- server/lib/__tests__/auth.test.ts`
Expected: Pode falhar em alguns casos se mensagens forem diferentes

**Step 3: Ajustar mensagens de erro para consistencia (se necessario)**

Verificar se as mensagens de erro no `auth.ts` correspondem aos testes. Ajustar conforme necessario.

**Step 4: Rodar teste para verificar sucesso**

Run: `npm run test -- server/lib/__tests__/auth.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server/lib/__tests__/auth.test.ts
git commit -m "$(cat <<'EOF'
test(auth): add unit tests for auth middleware

- Test requireAuth with valid/invalid tokens
- Test requireRole with different roles
- Test requireSchoolAccess for multi-tenancy
EOF
)"
```

---

## Task 5: Rate Limiting - Implementacao com TDD

**Problema:** Sem rate limiting em endpoints criticos.

**Files:**
- Create: `server/middleware/rateLimiter.ts`
- Create: `server/middleware/__tests__/rateLimiter.test.ts`
- Modify: `server/routes.ts` (adicionar middleware)
- Modify: `package.json` (adicionar express-rate-limit)

**Step 1: Instalar dependencia**

```bash
npm install express-rate-limit
npm install -D @types/express-rate-limit
```

**Step 2: Escrever teste que falha**

```typescript
// server/middleware/__tests__/rateLimiter.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAuthRateLimiter, createApiRateLimiter } from '../rateLimiter';

describe('rateLimiter', () => {
  describe('createAuthRateLimiter', () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();
      app.use(express.json());

      const limiter = createAuthRateLimiter({
        windowMs: 1000, // 1 second for testing
        max: 3,
      });

      app.post('/login', limiter, (req, res) => {
        res.json({ success: true });
      });
    });

    it('allows requests within limit', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await request(app).post('/login');
        expect(response.status).toBe(200);
      }
    });

    it('blocks requests exceeding limit', async () => {
      // First 3 should succeed
      for (let i = 0; i < 3; i++) {
        await request(app).post('/login');
      }

      // 4th should be blocked
      const response = await request(app).post('/login');
      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Muitas tentativas');
    });

    it('includes retry-after header when blocked', async () => {
      for (let i = 0; i < 4; i++) {
        await request(app).post('/login');
      }

      const response = await request(app).post('/login');
      expect(response.headers['retry-after']).toBeDefined();
    });
  });

  describe('createApiRateLimiter', () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();
      app.use(express.json());

      const limiter = createApiRateLimiter({
        windowMs: 1000,
        max: 100,
      });

      app.get('/api/data', limiter, (req, res) => {
        res.json({ data: 'test' });
      });
    });

    it('allows high volume of API requests', async () => {
      const promises = Array(50).fill(null).map(() =>
        request(app).get('/api/data')
      );

      const responses = await Promise.all(promises);
      responses.forEach(res => {
        expect(res.status).toBe(200);
      });
    });
  });
});
```

**Step 3: Rodar teste para verificar falha**

Run: `npm run test -- server/middleware/__tests__/rateLimiter.test.ts`
Expected: FAIL - modulo nao existe

**Step 4: Criar implementacao**

```typescript
// server/middleware/rateLimiter.ts
import rateLimit, { Options } from 'express-rate-limit';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
}

/**
 * Rate limiter para endpoints de autenticacao
 * Mais restritivo: 5 tentativas por 15 minutos por IP
 */
export function createAuthRateLimiter(options?: Partial<RateLimiterOptions>) {
  const defaults: Options = {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5,
    message: {
      error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
  };

  return rateLimit({
    ...defaults,
    ...options,
  });
}

/**
 * Rate limiter para endpoints de API geral
 * Mais permissivo: 100 requests por minuto por IP
 */
export function createApiRateLimiter(options?: Partial<RateLimiterOptions>) {
  const defaults: Options = {
    windowMs: 60 * 1000, // 1 minuto
    max: 100,
    message: {
      error: 'Limite de requisicoes excedido. Tente novamente em 1 minuto.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
  };

  return rateLimit({
    ...defaults,
    ...options,
  });
}

/**
 * Rate limiter para endpoints de password (mais restritivo)
 * 3 tentativas por hora por IP
 */
export function createPasswordRateLimiter(options?: Partial<RateLimiterOptions>) {
  const defaults: Options = {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3,
    message: {
      error: 'Muitas tentativas de alteracao de senha. Tente novamente em 1 hora.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
  };

  return rateLimit({
    ...defaults,
    ...options,
  });
}
```

**Step 5: Rodar teste para verificar sucesso**

Run: `npm run test -- server/middleware/__tests__/rateLimiter.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add server/middleware/rateLimiter.ts server/middleware/__tests__/rateLimiter.test.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat(security): add rate limiting middleware

- createAuthRateLimiter: 5 req/15min for login
- createApiRateLimiter: 100 req/min for API
- createPasswordRateLimiter: 3 req/hour for password change
EOF
)"
```

---

## Task 6: Aplicar Rate Limiting em Routes

**Problema:** Endpoints criticos sem rate limiting.

**Files:**
- Modify: `server/routes.ts` (linhas ~1-50, adicionar imports e middleware)

**Step 1: Escrever teste de integracao**

```typescript
// server/__tests__/api/rateLimiting.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAuthRateLimiter } from '../../middleware/rateLimiter';

describe('Rate Limiting Integration', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Simular endpoint de login com rate limiting
    const authLimiter = createAuthRateLimiter({ windowMs: 1000, max: 2 });
    app.post('/api/login', authLimiter, (req, res) => {
      res.json({ success: true });
    });
  });

  it('blocks excessive login attempts', async () => {
    // 2 tentativas permitidas
    await request(app).post('/api/login').expect(200);
    await request(app).post('/api/login').expect(200);

    // 3a deve ser bloqueada
    const response = await request(app).post('/api/login');
    expect(response.status).toBe(429);
  });
});
```

**Step 2: Rodar teste para verificar**

Run: `npm run test -- server/__tests__/api/rateLimiting.test.ts`
Expected: PASS

**Step 3: Aplicar em routes.ts**

No inicio de `server/routes.ts`, adicionar:

```typescript
// Imports existentes...
import { createAuthRateLimiter, createPasswordRateLimiter, createApiRateLimiter } from './middleware/rateLimiter';

// Criar instancias
const authLimiter = createAuthRateLimiter();
const passwordLimiter = createPasswordRateLimiter();
const apiLimiter = createApiRateLimiter();

// Aplicar rate limiting global para /api/*
app.use('/api/', apiLimiter);

// Aplicar rate limiting especifico para endpoints criticos
// No endpoint de login (buscar e adicionar):
// app.post("/api/auth/login", authLimiter, ...);

// No endpoint de change-password (buscar e adicionar):
// app.post("/api/profile/change-password", passwordLimiter, ...);
```

**Step 4: Commit**

```bash
git add server/routes.ts server/__tests__/api/rateLimiting.test.ts
git commit -m "$(cat <<'EOF'
feat(security): apply rate limiting to API endpoints

- Global rate limit: 100 req/min for all /api/*
- Auth rate limit: 5 req/15min for login
- Password rate limit: 3 req/hour for password change
EOF
)"
```

---

## Task 7: Password Strength Validation

**Problema:** Sem validacao de forca de senha.

**Files:**
- Create: `shared/validators/passwordValidator.ts`
- Create: `shared/validators/__tests__/passwordValidator.test.ts`

**Step 1: Escrever teste que falha**

```typescript
// shared/validators/__tests__/passwordValidator.test.ts
import { describe, it, expect } from 'vitest';
import { validatePassword, PasswordStrength } from '../passwordValidator';

describe('validatePassword', () => {
  it('rejects password shorter than 8 characters', () => {
    const result = validatePassword('Abc123!');

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Senha deve ter pelo menos 8 caracteres');
  });

  it('rejects password without uppercase letter', () => {
    const result = validatePassword('abcdefg123!');

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Senha deve ter pelo menos uma letra maiuscula');
  });

  it('rejects password without lowercase letter', () => {
    const result = validatePassword('ABCDEFG123!');

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Senha deve ter pelo menos uma letra minuscula');
  });

  it('rejects password without number', () => {
    const result = validatePassword('Abcdefgh!');

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Senha deve ter pelo menos um numero');
  });

  it('accepts strong password', () => {
    const result = validatePassword('Abc12345!');

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.strength).toBe(PasswordStrength.STRONG);
  });

  it('classifies password strength correctly', () => {
    // Weak: only meets minimum requirements
    expect(validatePassword('Abcdef1!').strength).toBe(PasswordStrength.WEAK);

    // Medium: longer password
    expect(validatePassword('Abcdefgh12!').strength).toBe(PasswordStrength.MEDIUM);

    // Strong: long with special chars
    expect(validatePassword('Abcdefgh123!@#').strength).toBe(PasswordStrength.STRONG);
  });
});
```

**Step 2: Rodar teste para verificar falha**

Run: `npm run test -- shared/validators/__tests__/passwordValidator.test.ts`
Expected: FAIL - modulo nao existe

**Step 3: Criar implementacao**

```typescript
// shared/validators/passwordValidator.ts
export enum PasswordStrength {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong',
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: PasswordStrength;
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Verificacoes obrigatorias
  if (password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve ter pelo menos uma letra maiuscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve ter pelo menos uma letra minuscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve ter pelo menos um numero');
  }

  // Calcular forca
  let strength = PasswordStrength.WEAK;

  if (errors.length === 0) {
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length >= 12 && hasSpecialChar) {
      strength = PasswordStrength.STRONG;
    } else if (password.length >= 10 || hasSpecialChar) {
      strength = PasswordStrength.MEDIUM;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}
```

**Step 4: Rodar teste para verificar sucesso**

Run: `npm run test -- shared/validators/__tests__/passwordValidator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add shared/validators/passwordValidator.ts shared/validators/__tests__/passwordValidator.test.ts
git commit -m "$(cat <<'EOF'
feat(security): add password strength validation

- Require min 8 chars, uppercase, lowercase, number
- Calculate strength: weak, medium, strong
- Reusable in frontend and backend
EOF
)"
```

---

## Task 8: TRI Calculator - Consolidar e Testar

**Problema:** Logica TRI duplicada em 3 lugares.

**Files:**
- Create: `shared/calculations/triCalculator.ts`
- Create: `shared/calculations/__tests__/triCalculator.test.ts`

**Step 1: Escrever teste que falha**

```typescript
// shared/calculations/__tests__/triCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { TRICalculator, TRI_LIMITS } from '../triCalculator';

describe('TRICalculator', () => {
  describe('calculateLinear', () => {
    it('returns MIN score for 0% correct', () => {
      const score = TRICalculator.calculateLinear(0, 45, 'LC');

      expect(score).toBe(TRI_LIMITS.LC.min);
    });

    it('returns MAX score for 100% correct', () => {
      const score = TRICalculator.calculateLinear(45, 45, 'LC');

      expect(score).toBe(TRI_LIMITS.LC.max);
    });

    it('calculates linear interpolation for 50%', () => {
      const score = TRICalculator.calculateLinear(22, 44, 'MT');
      const expected = TRI_LIMITS.MT.min + 0.5 * (TRI_LIMITS.MT.max - TRI_LIMITS.MT.min);

      expect(score).toBeCloseTo(expected, 1);
    });

    it('handles different areas correctly', () => {
      const lcScore = TRICalculator.calculateLinear(45, 45, 'LC');
      const mtScore = TRICalculator.calculateLinear(45, 45, 'MT');

      expect(lcScore).toBe(TRI_LIMITS.LC.max);
      expect(mtScore).toBe(TRI_LIMITS.MT.max);
      expect(mtScore).toBeGreaterThan(lcScore); // MT tem range maior
    });
  });

  describe('calculateWithCoherence', () => {
    it('penalizes incoherent response pattern', () => {
      // Aluno acerta as dificeis mas erra as faceis = incoerente
      const coherentScore = TRICalculator.calculateWithCoherence({
        correctAnswers: 30,
        totalQuestions: 45,
        area: 'LC',
        answeredDifficult: 10,
        answeredEasy: 20,
        isCoherent: true,
      });

      const incoherentScore = TRICalculator.calculateWithCoherence({
        correctAnswers: 30,
        totalQuestions: 45,
        area: 'LC',
        answeredDifficult: 20,
        answeredEasy: 10,
        isCoherent: false,
      });

      expect(incoherentScore).toBeLessThan(coherentScore);
    });
  });

  describe('TRI_LIMITS', () => {
    it('has correct limits for all ENEM areas', () => {
      expect(TRI_LIMITS.LC).toEqual({ min: 299.6, max: 820.8 });
      expect(TRI_LIMITS.CH).toEqual({ min: 305.1, max: 823.0 });
      expect(TRI_LIMITS.CN).toEqual({ min: 300.0, max: 868.4 });
      expect(TRI_LIMITS.MT).toEqual({ min: 336.8, max: 958.6 });
    });
  });
});
```

**Step 2: Rodar teste para verificar falha**

Run: `npm run test -- shared/calculations/__tests__/triCalculator.test.ts`
Expected: FAIL - modulo nao existe

**Step 3: Criar implementacao**

```typescript
// shared/calculations/triCalculator.ts

/**
 * Limites TRI baseados em historico ENEM 2009-2023
 */
export const TRI_LIMITS = {
  LC: { min: 299.6, max: 820.8 },
  CH: { min: 305.1, max: 823.0 },
  CN: { min: 300.0, max: 868.4 },
  MT: { min: 336.8, max: 958.6 },
} as const;

export type TRIArea = keyof typeof TRI_LIMITS;

export interface CoherenceInput {
  correctAnswers: number;
  totalQuestions: number;
  area: TRIArea;
  answeredDifficult: number;
  answeredEasy: number;
  isCoherent: boolean;
}

export class TRICalculator {
  /**
   * Calculo TRI linear simples
   * TRI = MIN + (percentualAcertos × (MAX - MIN))
   */
  static calculateLinear(
    correctAnswers: number,
    totalQuestions: number,
    area: TRIArea
  ): number {
    if (totalQuestions === 0) return TRI_LIMITS[area].min;

    const percentage = correctAnswers / totalQuestions;
    const { min, max } = TRI_LIMITS[area];

    return min + percentage * (max - min);
  }

  /**
   * Calculo TRI com ajuste de coerencia pedagogica
   * Penaliza padroes de resposta incoerentes
   */
  static calculateWithCoherence(input: CoherenceInput): number {
    const baseScore = this.calculateLinear(
      input.correctAnswers,
      input.totalQuestions,
      input.area
    );

    if (input.isCoherent) {
      return baseScore;
    }

    // Penalidade de 5-15% para respostas incoerentes
    const coherencePenalty = 0.10; // 10% de penalidade
    const { min } = TRI_LIMITS[input.area];

    // Ajustar score mantendo dentro dos limites
    const adjustedScore = baseScore - (baseScore - min) * coherencePenalty;

    return Math.max(adjustedScore, min);
  }

  /**
   * Calcula media ponderada de todas as areas
   */
  static calculateOverallScore(scores: Partial<Record<TRIArea, number>>): number {
    const values = Object.values(scores).filter((v): v is number => v !== undefined);

    if (values.length === 0) return 0;

    return values.reduce((sum, score) => sum + score, 0) / values.length;
  }
}
```

**Step 4: Rodar teste para verificar sucesso**

Run: `npm run test -- shared/calculations/__tests__/triCalculator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add shared/calculations/triCalculator.ts shared/calculations/__tests__/triCalculator.test.ts
git commit -m "$(cat <<'EOF'
feat(calculations): consolidate TRI calculator

- Single source of truth for TRI calculations
- Linear interpolation with ENEM limits
- Coherence-based adjustments
- Shared between frontend and backend
EOF
)"
```

---

## Task 9: TCT Calculator - Melhorar Testes Existentes

**Problema:** Testes existentes podem nao cobrir edge cases.

**Files:**
- Modify: `server/src/calculations/__tests__/tctCalculator.test.ts`

**Step 1: Adicionar testes de edge cases**

```typescript
// server/src/calculations/__tests__/tctCalculator.test.ts - adicionar
describe('TCTCalculator - Edge Cases', () => {
  it('handles student with fewer answers than answer key', () => {
    const students = [createStudent('001', ['A', 'B'])]; // 2 respostas
    const answerKey = ['A', 'B', 'C', 'D', 'E']; // 5 questoes

    const results = TCTCalculator.calculate(students, answerKey);

    // Deve calcular baseado nas respostas disponiveis
    expect(results[0].averageScore).toBe(4); // 2/5 * 10
  });

  it('handles student with more answers than answer key', () => {
    const students = [createStudent('001', ['A', 'B', 'C', 'D', 'E', 'A', 'B'])];
    const answerKey = ['A', 'B', 'C']; // 3 questoes

    const results = TCTCalculator.calculate(students, answerKey);

    // Deve ignorar respostas extras
    expect(results[0].averageScore).toBe(10); // 3/3 * 10
  });

  it('handles blank answers (empty string)', () => {
    const students = [createStudent('001', ['A', '', 'C', '', 'E'])];
    const answerKey = ['A', 'B', 'C', 'D', 'E'];

    const results = TCTCalculator.calculate(students, answerKey);

    // Brancos sao contados como erros
    expect(results[0].averageScore).toBe(6); // 3/5 * 10
  });

  it('handles null answers', () => {
    const students = [createStudent('001', ['A', null as any, 'C'])];
    const answerKey = ['A', 'B', 'C'];

    const results = TCTCalculator.calculate(students, answerKey);

    expect(results[0].averageScore).toBeCloseTo(6.67, 1); // 2/3 * 10
  });

  it('rounds score to 2 decimal places', () => {
    const students = [createStudent('001', ['A', 'B', 'X'])];
    const answerKey = ['A', 'B', 'C'];

    const results = TCTCalculator.calculate(students, answerKey);

    // 2/3 = 0.6666... * 10 = 6.666...
    expect(results[0].averageScore).toBeCloseTo(6.67, 2);
  });
});
```

**Step 2: Rodar teste**

Run: `npm run test -- server/src/calculations/__tests__/tctCalculator.test.ts`
Expected: Pode falhar se edge cases nao estao tratados

**Step 3: Ajustar implementacao se necessario**

Verificar `server/src/calculations/tctCalculator.ts` e ajustar para tratar edge cases.

**Step 4: Commit**

```bash
git add server/src/calculations/__tests__/tctCalculator.test.ts server/src/calculations/tctCalculator.ts
git commit -m "$(cat <<'EOF'
test(tct): add edge case tests for TCTCalculator

- Handle fewer/more answers than key
- Handle blank and null answers
- Verify score rounding
EOF
)"
```

---

## Task 10: Rodar Todos os Testes e Verificar Cobertura

**Step 1: Rodar todos os testes**

```bash
npm run test
```

Expected: Todos os testes passando

**Step 2: Verificar cobertura**

```bash
npm run test:coverage
```

Expected: Cobertura aumentada significativamente

**Step 3: Verificar TypeScript**

```bash
npm run check
```

Expected: Sem erros de tipo

**Step 4: Commit final**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: verify test coverage and type safety

All tests passing, coverage improved from ~10% to ~40%+
EOF
)"
```

---

## Resumo de Progresso

| Task | Descricao | Arquivos |
|------|-----------|----------|
| 1 | Schema: questionContentSchema validation | shared/schema.ts, shared/__tests__/schema.test.ts |
| 2 | Schema: examDisciplineSchema type-safety | shared/schema.ts |
| 3 | Schema: examConfigurationSchema type-safety | shared/schema.ts |
| 4 | Auth: Unit tests para middleware | server/lib/__tests__/auth.test.ts |
| 5 | Security: Rate limiting middleware | server/middleware/rateLimiter.ts |
| 6 | Security: Aplicar rate limiting | server/routes.ts |
| 7 | Security: Password strength validation | shared/validators/passwordValidator.ts |
| 8 | Calculations: Consolidar TRI calculator | shared/calculations/triCalculator.ts |
| 9 | Calculations: Edge cases TCT calculator | server/src/calculations/__tests__/tctCalculator.test.ts |
| 10 | Verificacao: Rodar todos testes | - |

---

## Proximos Passos (Fase 2)

Apos completar esta fase, considerar:

1. **Frontend Tests**: React Testing Library para componentes
2. **Integration Tests**: Testes E2E com Playwright
3. **API Tests**: Supertest para todos endpoints
4. **Refatorar home.tsx**: Quebrar em componentes menores
5. **Logging estruturado**: Implementar winston/pino
