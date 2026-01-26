-- ============================================================================
-- MIGRATION: Adiciona school_id à tabela projetos para multi-tenancy
-- ============================================================================

-- Adicionar coluna school_id (nullable para não quebrar projetos existentes)
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE SET NULL;

-- Criar índice para busca por escola
CREATE INDEX IF NOT EXISTS idx_projetos_school_id ON projetos(school_id);

-- Atualizar projetos existentes baseado no nome (Marista RN -> Marista Natal)
UPDATE projetos
SET school_id = '50c6894c-f97d-482f-b208-c8c35d3adea3'
WHERE nome ILIKE '%Marista RN%' OR nome ILIKE '%Marista Natal%';

-- Comentário
COMMENT ON COLUMN projetos.school_id IS 'ID da escola proprietária do projeto (para multi-tenancy)';
