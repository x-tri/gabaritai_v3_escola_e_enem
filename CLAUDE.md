# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GabaritAI is an educational platform for automated exam grading using OMR (Optical Mark Recognition). It processes scanned answer sheets, validates quality via ChatGPT Vision, calculates pedagogical scores (TRI/TCT), and generates educational insights. Primary target: ENEM (Brazilian national exam).

## Commands

```bash
# Development
npm run dev          # Start Express server (port 8080) with hot reload
npm run check        # TypeScript validation

# Build & Production
npm run build        # Bundle client + server (esbuild)
npm run start        # Run production server

# Database
npm run db:push      # Apply Drizzle migrations to Supabase

# Python Services (local dev only - production uses Fly.io)
cd python_omr_service && source venv/bin/activate && python app.py  # OMR on port 5002
cd python_tri_service && source venv/bin/activate && python app.py  # TRI on port 5003

# Deployment
flyctl deploy -a xtri-gabaritos-api     # Backend to Fly.io
flyctl deploy -a xtri-gabaritos-omr     # OMR service to Fly.io
flyctl deploy -a xtri-gabaritos-tri     # TRI service to Fly.io
vercel deploy                            # Frontend to Vercel
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel (Frontend)                         │
│                    xtri-gabarito.app                             │
│                    React + Vite + Radix UI                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │ /api/* proxy
┌─────────────────────────▼───────────────────────────────────────┐
│                     Fly.io (Backend)                             │
│                xtri-gabaritos-api.fly.dev                        │
│                Express + TypeScript (port 8080)                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ server/routes.ts - All API endpoints (~50 routes)        │   │
│  │ server/lib/auth.ts - JWT verification via Supabase       │   │
│  │ server/chatgptOMR.ts - OpenAI Vision integration         │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────┬─────────────────────────────────┬───────────────────┘
            │                                 │
┌───────────▼───────────┐       ┌─────────────▼─────────────┐
│   Fly.io (OMR)        │       │      Fly.io (TRI)         │
│ xtri-gabaritos-omr    │       │   xtri-gabaritos-tri      │
│ Flask + OpenCV        │       │   Flask + NumPy           │
│ Port 5002             │       │   Port 5003               │
└───────────────────────┘       └───────────────────────────┘
            │                                 │
            └─────────────┬───────────────────┘
                          │
              ┌───────────▼───────────┐
              │      Supabase         │
              │ PostgreSQL + Auth     │
              │ RLS by role           │
              └───────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `server/routes.ts` | All API endpoints - add new routes here |
| `server/lib/auth.ts` | JWT middleware: `requireAuth`, `requireRole` |
| `server/chatgptOMR.ts` | OpenAI Vision for quality validation |
| `client/src/App.tsx` | React router with role-based routes |
| `client/src/contexts/AuthContext.tsx` | Auth state management |
| `shared/schema.ts` | Zod schemas shared between client/server |
| `shared/database.types.ts` | Auto-generated Supabase types |

## Adding an API Endpoint

```typescript
// In server/routes.ts
app.post("/api/my-endpoint", requireAuth, requireRole(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const data = MySchema.parse(req.body);
    // ... logic
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

Roles: `SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `STUDENT`

## Environment Variables (Required)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Frontend Supabase endpoint |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase key |
| `SUPABASE_URL` | Backend Supabase endpoint |
| `SUPABASE_SERVICE_KEY` | Admin Supabase key (service_role) |
| `OPENAI_API_KEY` | ChatGPT Vision & analysis |

## PDF Processing Pipeline

1. **Upload** → Multer handles multipart/form-data
2. **PDF to Images** → Sharp converts pages to PNG
3. **OMR** → Python service detects marked answers
4. **Quality Check** → ChatGPT Vision validates scan quality
5. **Student Lookup** → QR code (`XTRI-XXXXXX`) maps to `students.sheet_code`
6. **Score Calculation** → TRI (Item Response Theory) or TCT
7. **Storage** → Results saved to Supabase

## CORS Configuration

Allowed origins are in `server/index.ts`. Add new domains to `allowedOrigins` array:
- Production: `https://xtri-gabarito.app`
- Vercel previews: `https://*.vercel.app`
- Local: `http://localhost:5173`, `http://localhost:3000`

## Database

- **ORM**: Drizzle with PostgreSQL dialect
- **Migrations**: `supabase/migrations/` (SQL files)
- **RLS**: Row-Level Security policies enforce role-based access
- **Types**: Run `npm run db:generate` after schema changes

## TypeScript Path Aliases

```typescript
import { MySchema } from "@shared/schema";  // → shared/schema.ts
import { supabase } from "@/lib/supabase";  // → client/src/lib/supabase.ts
```

## Testing Locally

1. Start backend: `npm run dev`
2. Access: `http://localhost:8080`
3. For OMR testing, either:
   - Start local Python service, or
   - Set `USE_MODAL=true` to use Modal.com cloud service
