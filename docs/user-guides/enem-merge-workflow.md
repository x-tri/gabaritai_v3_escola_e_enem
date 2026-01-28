# ENEM Day 1 + Day 2 Merge Workflow

## Correct Flow

### Step 1: Process Day 1
1. Select template "ENEM - Dia 1"
2. Upload Day 1 answer sheet PDFs
3. Import Day 1 CSV (questions 1-90)
4. Calculate TRI
5. Save project with name like "Diagnostica 3A"

### Step 2: Process Day 2
1. **DO NOT** load the Day 1 project
2. Select template "ENEM - Dia 2"
3. Upload Day 2 answer sheet PDFs (new PDFs!)
4. Import Day 2 CSV (questions 91-180)
5. Calculate TRI
6. Click "Mesclar Dia 1 + Dia 2" button
7. Select the Day 1 project from the list
8. System will merge both days automatically

## Common Mistakes

### Loading Day 1 project before processing Day 2
- This copies Day 1 students to state
- Merge will use same data for both days
- Result: Duplicate answers instead of merged

### Re-merging an already merged project
- System will show error "Projeto ja mesclado"
- Delete the project and start fresh if needed

## Correct Approach

Keep Day 1 and Day 2 processing separate:
- Day 1: Process -> Save
- Day 2: Process -> Merge (picks Day 1 from database)

## Visual Indicators

In the project list ("Abrir Projeto" dialog):
- **Dia 1+2 Completo** (green badge): Project has been merged successfully
- **Dia 2**: Only Day 2 processed
- **Dia 1**: Only Day 1 processed

## After Merge

The merged project will have:
- 180 questions (Q1-90 from Day 1, Q91-180 from Day 2)
- TRI scores for all 4 areas (LC, CH, CN, MT)
- Flag `dia2Processado: true` to prevent re-merge
