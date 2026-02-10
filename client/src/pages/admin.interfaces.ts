export interface ImportResult {
  matricula: string;
  nome: string;
  turma: string;
  email: string;
  senha: string;
  status: 'created' | 'updated' | 'error';
  message?: string;
}

export interface ImportResponse {
  success: boolean;
  summary: {
    total: number;
    created: number;
    updated: number;
    errors: number;
  };
  results: ImportResult[];
}

export interface Student {
  id: string;
  name: string;
  email: string;
  student_number: string | null;
  turma: string | null;
  created_at: string;
  profile_id: string
}

export interface StudentsResponse {
  success: boolean;
  students: Student[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  turmas: string[];
}

export interface Turma {
  nome: string;
  alunosCount: number;
}

export interface TurmaAluno {
  id: string;
  name: string;
  student_number: string | null;
  turma: string | null;
  email: string;
}

export interface School {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Simulado {
  id: string;
  title: string;
  school_id: string;
  schools?: { id: string; name: string };
  status: string;
  total_questions: number;
  template_type: string;
  created_at: string;
  alunos_count?: number;
}

export interface Coordinator {
  id: string;
  email: string;
  name: string;
  role: string;
  school_id: string | null;
  allowed_series: string[] | null;
  created_at: string;
  schools?: { id: string; name: string } | null;
}

export interface AdminMessage {
    id: string;
    title: string;
    content: string;
    target_type: 'students' | 'schools';
    filter_school_ids: string[] | null;
    filter_turmas: string[] | null;
    filter_series: string[] | null;
    created_at: string;
    expires_at: string;
    recipients_count?: number;
  }