# ENEM Day 1 + Day 2 Merge Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the ENEM Day 1 + Day 2 merge functionality so that questionContents and student answers are correctly merged from separate Day 1 and Day 2 correction sessions.

**Architecture:** The merge function loads the saved Day 1 project and combines it with the current Day 2 data in state. The fix involves: (1) validating that the project hasn't already been merged, (2) ensuring questionContents merge correctly (Q1-90 + Q91-180 = 180), and (3) preventing duplicate responses when both days have the same data.

**Tech Stack:** React, TypeScript, Express.js, Supabase

---

## Problem Analysis

The current merge has these issues:
1. **Already-merged project detection**: When loading a project that was already merged (174 students with 180 answers), the merge uses the same data for both "Day 1" and "Day 2"
2. **Identical responses**: `Dia1[0-4]=D,B,D,A,E, Dia2[0-4]=D,B,D,A,E` - both slices return identical data because the project was already merged
3. **questionContents merge**: Server-side merge now works (180 items), but frontend flow allows re-merging

---

### Task 1: Add Already-Merged Detection

**Files:**
- Modify: `client/src/pages/home.tsx:4285-4320`

**Step 1: Add validation before merge**

In the `handleMesclarDia1Dia2` function, add detection for already-merged projects by checking if the loaded project has `dia2Processado: true` or if students already have 180 answers.

```typescript
// After line 4318 (after fetching projetoDia1)
// Add this validation block:

// Verificar se o projeto já foi mesclado anteriormente
const primeiroAlunoProjeto = projetoDia1.students[0];
const projetoJaMesclado = projetoDia1.dia2Processado === true ||
  (primeiroAlunoProjeto?.answers?.length >= 180);

if (projetoJaMesclado) {
  toast({
    title: "⚠️ Projeto já mesclado",
    description: "Este projeto já contém dados do Dia 1 + Dia 2. Para refazer o merge, delete o projeto e processe os dias separadamente.",
    variant: "destructive",
  });
  setTriV2Loading(false);
  return;
}

// Verificar se os alunos do Dia 2 (estado) são diferentes dos do projeto
const primeiroAlunoDia2 = students[0];
const respostasIguais = primeiroAlunoProjeto?.answers?.slice(0, 5).join(",") ===
  primeiroAlunoDia2?.answers?.slice(0, 5).join(",");

if (respostasIguais && primeiroAlunoDia2?.answers?.length <= 90) {
  toast({
    title: "⚠️ Dados duplicados",
    description: "Os alunos do Dia 2 parecem ser os mesmos do projeto carregado. Processe novos PDFs do Dia 2 antes de mesclar.",
    variant: "destructive",
  });
  setTriV2Loading(false);
  return;
}
```

**Step 2: Test manually**

1. Load a project that was already merged (Diagnóstica-Pré + Dia 2)
2. Try to click "Mesclar Dia 1 + Dia 2"
3. Should show error toast "Projeto já mesclado"

**Step 3: Commit**

```bash
git add client/src/pages/home.tsx
git commit -m "fix(merge): detect and prevent re-merging already-merged projects"
```

---

### Task 2: Add Visual Indicator for Merged Projects

**Files:**
- Modify: `client/src/pages/home.tsx` (project list dialog)

**Step 1: Find the project list rendering**

Search for where projects are displayed in the "Abrir Projeto" dialog and add a badge for merged projects.

**Step 2: Add merged indicator**

In the project list item rendering (around line 13141), the `dia2Processado` badge already exists. Verify it's working correctly:

```typescript
{projeto.dia2Processado && (
  <Badge variant="secondary" className="text-xs">
    Dia 2 ✓
  </Badge>
)}
```

Add a more prominent indicator for fully merged projects:

```typescript
{projeto.dia1Processado && projeto.dia2Processado && (
  <Badge variant="default" className="text-xs bg-green-600">
    ✅ Completo
  </Badge>
)}
```

**Step 3: Test manually**

1. Open the "Abrir Projeto" dialog
2. Verify merged projects show "✅ Completo" badge
3. Verify Day 1 only projects show "Dia 1 ✓"

**Step 4: Commit**

```bash
git add client/src/pages/home.tsx
git commit -m "feat(ui): add visual indicator for fully merged ENEM projects"
```

---

### Task 3: Fix Server-Side questionContents Merge Logging

**Files:**
- Modify: `server/routes.ts:3805-3835`

**Step 1: Remove debug logging**

The debug logging we added earlier should be cleaned up for production. Keep essential logging but remove verbose debug output.

```typescript
// Replace the debug block with cleaner logging:
if (questionContents && questionContents.length > 0 && projetoExistente.questionContents && projetoExistente.questionContents.length > 0) {
  const questionContentsMap = new Map<number, { questionNumber: number; content: string; answer?: string }>();

  for (const item of projetoExistente.questionContents) {
    if (item && typeof item.questionNumber === 'number') {
      questionContentsMap.set(item.questionNumber, item);
    }
  }

  for (const item of questionContents) {
    if (item && typeof item.questionNumber === 'number') {
      questionContentsMap.set(item.questionNumber, item);
    }
  }

  questionContentsFinal = Array.from(questionContentsMap.values())
    .sort((a, b) => a.questionNumber - b.questionNumber);

  console.log(`[PROJETOS] questionContents merged: ${questionContentsFinal.length} items`);
}
```

**Step 2: Commit**

```bash
git add server/routes.ts
git commit -m "refactor(projetos): clean up questionContents merge logging"
```

---

### Task 4: Clean Up Frontend Debug Logging

**Files:**
- Modify: `client/src/pages/home.tsx`

**Step 1: Remove debug console.logs**

Remove or reduce the debug logging we added:
- Line ~2840-2843: `[SAVE DEBUG]` logs
- Line ~4310-4336: `[MERGE]` verbose debug logs
- Line ~5688-5720: `[IMPORT DEBUG]` logs

Keep essential logs but remove verbose debugging:

```typescript
// Around line 2840, remove these lines:
// const qcNumbers = questionContents.map(qc => qc.questionNumber);
// console.log(`[SAVE DEBUG] questionContents count: ${questionContents.length}`);
// console.log(`[SAVE DEBUG] questionNumbers: min=${Math.min(...qcNumbers)}, max=${Math.max(...qcNumbers)}`);
// console.log(`[SAVE DEBUG] primeiro 3: ${qcNumbers.slice(0, 3).join(', ')}`);
// console.log(`[SAVE DEBUG] últimos 3: ${qcNumbers.slice(-3).join(', ')}`);
```

**Step 2: Commit**

```bash
git add client/src/pages/home.tsx
git commit -m "refactor(home): remove verbose debug logging"
```

---

### Task 5: Add User Flow Documentation

**Files:**
- Create: `docs/user-guides/enem-merge-workflow.md`

**Step 1: Write workflow documentation**

```markdown
# ENEM Day 1 + Day 2 Merge Workflow

## Correct Flow

### Step 1: Process Day 1
1. Select template "ENEM - Dia 1"
2. Upload Day 1 answer sheet PDFs
3. Import Day 1 CSV (questions 1-90)
4. Calculate TRI
5. Save project with name like "Diagnóstica 3ºA"

### Step 2: Process Day 2
1. **DO NOT** load the Day 1 project
2. Select template "ENEM - Dia 2"
3. Upload Day 2 answer sheet PDFs (new PDFs!)
4. Import Day 2 CSV (questions 91-180)
5. Calculate TRI
6. Click "Mesclar Dia 1 + Dia 2" button
7. Select the Day 1 project from the list
8. System will merge both days automatically

### Common Mistakes

❌ **Loading Day 1 project before processing Day 2**
- This copies Day 1 students to state
- Merge will use same data for both days

❌ **Re-merging an already merged project**
- System will show error "Projeto já mesclado"
- Delete the project and start fresh if needed

✅ **Correct: Keep Day 1 and Day 2 processing separate**
- Day 1: Process → Save
- Day 2: Process → Merge (picks Day 1 from database)
```

**Step 2: Commit**

```bash
git add docs/user-guides/enem-merge-workflow.md
git commit -m "docs: add ENEM merge workflow guide"
```

---

## Testing Checklist

After implementing all tasks, verify:

- [ ] Loading an already-merged project and clicking merge shows error
- [ ] New Day 2 processing (without loading project) can merge correctly
- [ ] questionContents shows 180 items after merge (Q1-90 + Q91-180)
- [ ] Student answers are correctly merged (90 + 90 = 180)
- [ ] TRI is calculated for all 4 areas (LC, CH, CN, MT)
- [ ] Project list shows "✅ Completo" badge for merged projects
