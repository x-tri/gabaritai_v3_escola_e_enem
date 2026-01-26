-- ============================================================================
-- MIGRATION: Corrige school_id nos projetos baseado nas turmas dos alunos
-- ============================================================================
-- Problema: A migration anterior só atualizou projetos com "Marista" no nome,
-- deixando projetos do Literato com school_id NULL.
--
-- Solução: Identificar projetos pela turma dos alunos:
-- - Turmas com "EM3" (EM3VA, EM3VB, etc.) = Literato
-- - Turmas simples (A, B, C, D, E, 1A, 2A, 3A, etc.) = Marista
-- ============================================================================

-- 1. Primeiro, encontrar o school_id do Literato
-- (assumindo que existe uma escola com "Literato" no nome ou slug similar)
DO $$
DECLARE
    v_literato_school_id UUID;
    v_marista_school_id UUID := '50c6894c-f97d-482f-b208-c8c35d3adea3'; -- Marista já conhecido
    v_updated_count INTEGER;
BEGIN
    -- Buscar Literato pelo nome ou slug
    SELECT id INTO v_literato_school_id
    FROM schools
    WHERE name ILIKE '%Literato%' OR slug ILIKE '%literato%'
    LIMIT 1;

    IF v_literato_school_id IS NULL THEN
        RAISE NOTICE 'Escola Literato não encontrada. Verificando outras opções...';

        -- Tentar encontrar qualquer escola que não seja Marista
        SELECT id INTO v_literato_school_id
        FROM schools
        WHERE id != v_marista_school_id
          AND active = true
        LIMIT 1;
    END IF;

    IF v_literato_school_id IS NULL THEN
        RAISE EXCEPTION 'Não foi possível encontrar a escola Literato';
    END IF;

    RAISE NOTICE 'Literato school_id: %', v_literato_school_id;
    RAISE NOTICE 'Marista school_id: %', v_marista_school_id;

    -- 2. Atualizar projetos do Literato (turmas com EM3)
    UPDATE projetos
    SET school_id = v_literato_school_id
    WHERE school_id IS NULL
      AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(students) AS student
          WHERE student->>'turma' ILIKE 'EM3%'
             OR student->>'turma' ILIKE 'EM2%'
             OR student->>'turma' ILIKE 'EM1%'
      );

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Projetos atualizados para Literato: %', v_updated_count;

    -- 3. Atualizar projetos do Marista (turmas restantes com NULL school_id)
    -- Turmas do Marista são geralmente letras simples ou números+letras (1A, 2B, etc.)
    UPDATE projetos
    SET school_id = v_marista_school_id
    WHERE school_id IS NULL
      AND students IS NOT NULL
      AND jsonb_array_length(students) > 0;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Projetos atualizados para Marista: %', v_updated_count;

    -- 4. Verificar resultados
    RAISE NOTICE '--- Resumo Final ---';
    RAISE NOTICE 'Projetos Literato: %', (SELECT COUNT(*) FROM projetos WHERE school_id = v_literato_school_id);
    RAISE NOTICE 'Projetos Marista: %', (SELECT COUNT(*) FROM projetos WHERE school_id = v_marista_school_id);
    RAISE NOTICE 'Projetos sem escola: %', (SELECT COUNT(*) FROM projetos WHERE school_id IS NULL);

END $$;

-- 5. Criar comentário explicativo
COMMENT ON COLUMN projetos.school_id IS 'ID da escola proprietária do projeto. Atribuído baseado nas turmas dos alunos: EM* = Literato, outras = Marista';
