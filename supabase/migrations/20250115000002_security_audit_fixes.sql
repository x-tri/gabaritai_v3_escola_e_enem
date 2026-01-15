-- ============================================================================
-- MIGRATION: Security Audit Fixes
-- Data: 2025-01-15
-- Descrição: Corrige problemas de segurança identificados na auditoria
-- ============================================================================

-- ============================================================================
-- 1. REVOGAR PERMISSÕES EXCESSIVAS DO ROLE anon
-- ============================================================================
-- O role anon (usuários não autenticados) não deveria ter acesso a essas tabelas
-- RLS protege, mas é uma camada extra de segurança

REVOKE ALL ON answer_sheet_batches FROM anon;
REVOKE ALL ON answer_sheet_students FROM anon;
REVOKE ALL ON projetos_escola FROM anon;
REVOKE ALL ON students FROM anon;

-- Manter apenas SELECT em schools para permitir lookup de escola no login
-- (necessário para a tela de primeiro acesso)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON schools FROM anon;

-- ============================================================================
-- 2. CORRIGIR POLICIES DE answer_sheet_batches
-- As policies atuais verificam roles que não existem (admin, coordinator, teacher)
-- ============================================================================

-- Remover policies com roles incorretos
DROP POLICY IF EXISTS "Admins full access to batches" ON answer_sheet_batches;
DROP POLICY IF EXISTS "Coordinators manage school batches" ON answer_sheet_batches;
DROP POLICY IF EXISTS "Teachers view school batches" ON answer_sheet_batches;

-- Criar policies com roles corretos
-- Super admin tem acesso total
CREATE POLICY "super_admin_full_access_batches" ON answer_sheet_batches
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- School admin pode gerenciar batches da própria escola
CREATE POLICY "school_admin_manage_batches" ON answer_sheet_batches
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'school_admin'
      AND profiles.school_id = answer_sheet_batches.school_id
    )
  );

-- Alunos podem ver batches da própria escola (somente SELECT)
CREATE POLICY "student_view_school_batches" ON answer_sheet_batches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
      AND profiles.school_id = answer_sheet_batches.school_id
    )
  );

-- ============================================================================
-- 3. CORRIGIR POLICIES DE answer_sheet_students
-- ============================================================================

-- Remover policies com roles incorretos
DROP POLICY IF EXISTS "Admins full access to sheet students" ON answer_sheet_students;
DROP POLICY IF EXISTS "Coordinators manage school sheet students" ON answer_sheet_students;
DROP POLICY IF EXISTS "Teachers view school sheet students" ON answer_sheet_students;

-- Super admin tem acesso total
CREATE POLICY "super_admin_full_access_sheet_students" ON answer_sheet_students
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- School admin pode gerenciar sheet students da própria escola
CREATE POLICY "school_admin_manage_sheet_students" ON answer_sheet_students
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM answer_sheet_batches b
      JOIN profiles p ON p.id = auth.uid()
      WHERE b.id = answer_sheet_students.batch_id
      AND p.role = 'school_admin'
      AND p.school_id = b.school_id
    )
  );

-- Alunos podem ver seus próprios sheet_students (via sheet_code)
CREATE POLICY "student_view_own_sheet_students" ON answer_sheet_students
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN profiles p ON p.id = auth.uid()
      WHERE s.profile_id = p.id
      AND s.sheet_code = answer_sheet_students.sheet_code
    )
  );

-- ============================================================================
-- 4. CORRIGIR POLICIES DE exams
-- ============================================================================

-- Remover policy com roles incorretos
DROP POLICY IF EXISTS "Admins manage exams" ON exams;

-- School admin pode gerenciar exams da própria escola
CREATE POLICY "school_admin_manage_exams" ON exams
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'school_admin'
      AND profiles.school_id = exams.school_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'school_admin'
      AND profiles.school_id = exams.school_id
    )
  );

-- ============================================================================
-- 5. CORRIGIR POLICIES DE student_answers
-- ============================================================================

-- Remover policies com roles incorretos
DROP POLICY IF EXISTS "Admins view all answers" ON student_answers;
DROP POLICY IF EXISTS "Admins update answers" ON student_answers;
DROP POLICY IF EXISTS "Admins manage answers" ON student_answers;

-- School admin pode ver respostas da própria escola
CREATE POLICY "school_admin_view_answers" ON student_answers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'school_admin'
      AND profiles.school_id = student_answers.school_id
    )
  );

-- School admin pode inserir respostas na própria escola
CREATE POLICY "school_admin_insert_answers" ON student_answers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'school_admin'
      AND profiles.school_id = student_answers.school_id
    )
  );

-- School admin pode atualizar respostas da própria escola
CREATE POLICY "school_admin_update_answers" ON student_answers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'school_admin'
      AND profiles.school_id = student_answers.school_id
    )
  );

-- ============================================================================
-- 6. REMOVER POLICIES DUPLICADAS DE profiles
-- ============================================================================

-- Manter apenas a versão mais recente
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
-- Mantém: users_update_own_profile

-- ============================================================================
-- 7. ADICIONAR POLICY PARA students - permitir alunos verem dados básicos
-- da própria escola (para ranking, etc.)
-- ============================================================================

-- Verificar se policy já existe antes de criar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'students'
    AND policyname = 'student_view_school_students'
  ) THEN
    CREATE POLICY "student_view_school_students" ON students
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
          AND p.role = 'student'
          AND p.school_id = students.school_id
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 8. GARANTIR SERVICE_ROLE BYPASS EM TODAS AS TABELAS
-- (caso alguma tabela não tenha)
-- ============================================================================

-- schools
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'schools'
    AND policyname = 'service_role_bypass_schools'
  ) THEN
    CREATE POLICY "service_role_bypass_schools" ON schools
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname = 'service_role_bypass_profiles'
  ) THEN
    CREATE POLICY "service_role_bypass_profiles" ON profiles
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- exams
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'exams'
    AND policyname = 'service_role_bypass_exams'
  ) THEN
    CREATE POLICY "service_role_bypass_exams" ON exams
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- student_answers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_answers'
    AND policyname = 'service_role_bypass_student_answers'
  ) THEN
    CREATE POLICY "service_role_bypass_student_answers" ON student_answers
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- students
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'students'
    AND policyname = 'service_role_bypass_students'
  ) THEN
    CREATE POLICY "service_role_bypass_students" ON students
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- projetos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'projetos'
    AND policyname = 'service_role_bypass_projetos'
  ) THEN
    CREATE POLICY "service_role_bypass_projetos" ON projetos
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON POLICY "super_admin_full_access_batches" ON answer_sheet_batches IS 'Super admin tem acesso total a todos os batches';
COMMENT ON POLICY "school_admin_manage_batches" ON answer_sheet_batches IS 'School admin gerencia batches da própria escola';
COMMENT ON POLICY "student_view_school_batches" ON answer_sheet_batches IS 'Alunos podem ver batches da própria escola';

COMMENT ON POLICY "super_admin_full_access_sheet_students" ON answer_sheet_students IS 'Super admin tem acesso total';
COMMENT ON POLICY "school_admin_manage_sheet_students" ON answer_sheet_students IS 'School admin gerencia sheet students da própria escola';

COMMENT ON POLICY "school_admin_manage_exams" ON exams IS 'School admin gerencia exams da própria escola';

COMMENT ON POLICY "school_admin_view_answers" ON student_answers IS 'School admin vê respostas da própria escola';
COMMENT ON POLICY "school_admin_insert_answers" ON student_answers IS 'School admin insere respostas na própria escola';
COMMENT ON POLICY "school_admin_update_answers" ON student_answers IS 'School admin atualiza respostas da própria escola';
