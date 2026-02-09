import os
from datetime import datetime
from typing import Optional, Dict, Any, List
import random
from app_log import logger

# ============================================================
# SUPABASE CLIENT
# ============================================================
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

supabase_client = None

def get_supabase():
    """Retorna cliente Supabase (lazy initialization)."""
    global supabase_client
    if supabase_client is None and SUPABASE_URL and SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Supabase client initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize Supabase: {e}")
    return supabase_client


def lookup_student_by_sheet_code(sheet_code: str) -> Optional[Dict[str, Any]]:
    """
    Busca dados do aluno pelo sheet_code no Supabase.

    Ordem de busca:
    1. Tabela 'students' (alunos importados via CSV com sheet_code)
    2. Tabela 'answer_sheet_students' (sistema de batches com QR pré-cadastrado)
    """
    client = get_supabase()
    if not client:
        logger.warning("Supabase not configured, skipping student lookup")
        return None

    try:
        # 1. Buscar na tabela 'students' (novo fluxo - alunos com sheet_code)
        response = client.table('students') \
            .select('id, name, matricula, turma, school_id, schools(name)') \
            .eq('sheet_code', sheet_code) \
            .single() \
            .execute()

        if response.data:
            data = response.data
            school = data.get('schools', {}) or {}
            logger.info(f"Student found in 'students' table: {data.get('name')}")
            return {
                'id': data['id'],
                'student_name': data['name'],
                'enrollment': data.get('matricula'),
                'class_name': data.get('turma'),
                'school_id': data.get('school_id'),
                'school_name': school.get('name'),
                'source': 'students'
            }
    except Exception as e:
        # Não encontrou na tabela students, tentar answer_sheet_students
        logger.debug(f"Not found in students table: {e}")

    try:
        # 2. Buscar na tabela 'answer_sheet_students' (fluxo legado de batches)
        response = client.table('answer_sheet_students') \
            .select('id, student_name, enrollment_code, class_name, batch_id, answer_sheet_batches(exam_id, school_id, name)') \
            .eq('sheet_code', sheet_code) \
            .single() \
            .execute()

        if response.data:
            data = response.data
            batch = data.get('answer_sheet_batches', {}) or {}
            logger.info(f"Student found in 'answer_sheet_students' table: {data.get('student_name')}")
            return {
                'id': data['id'],
                'student_name': data['student_name'],
                'enrollment': data.get('enrollment_code'),
                'class_name': data.get('class_name'),
                'batch_id': data.get('batch_id'),
                'exam_id': batch.get('exam_id'),
                'school_id': batch.get('school_id'),
                'batch_name': batch.get('name'),
                'source': 'answer_sheet_students'
            }
        else:
            logger.warning(f"No student found for sheet_code: {sheet_code}")
            return None

    except Exception as e:
        logger.error(f"Supabase lookup error: {e}")
        return None


def save_omr_result(sheet_code: str, answers: list, stats: dict) -> bool:
    """
    Salva resultado do OMR no Supabase.
    Tabela: answer_sheet_students
    """
    client = get_supabase()
    if not client:
        logger.warning("Supabase not configured, skipping result save")
        return False

    try:
        response = client.table('answer_sheet_students') \
            .update({
                'answers': answers,
                'answered_count': stats['answered'],
                'blank_count': stats['blank'],
                'double_marked_count': stats['double_marked'],
                'processed_at': 'now()'
            }) \
            .eq('sheet_code', sheet_code) \
            .execute()

        if response.data:
            logger.info(f"OMR result saved for {sheet_code}")
            return True
        return False

    except Exception as e:
        logger.error(f"Supabase save error: {e}")
        return False


def generate_sheet_code() -> str:
    """
    Gera código único no formato XTRI-XXXXXX.
    Usa apenas caracteres sem ambiguidade: A-Z (exceto I, O, L) e 2-9.
    """
    # Caracteres sem ambiguidade visual
    chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    code = ''.join(random.choice(chars) for _ in range(6))
    return f"XTRI-{code}"


def create_batch(name: str, exam_id: str = None, school_id: str = None) -> Optional[Dict[str, Any]]:
    """
    Cria um novo lote de gabaritos no Supabase.
    Tabela: answer_sheet_batches
    """
    client = get_supabase()
    if not client:
        logger.warning("Supabase not configured, cannot create batch")
        return None

    try:
        response = client.table('answer_sheet_batches').insert({
            'name': name,
            'exam_id': exam_id,
            'school_id': school_id,
            'status': 'pending',
            'created_at': datetime.utcnow().isoformat()
        }).execute()

        if response.data:
            batch = response.data[0]
            logger.info(f"Batch created: {batch['id']}")
            return batch
        return None

    except Exception as e:
        logger.error(f"Supabase batch creation error: {e}")
        return None


def create_students_batch(batch_id: str, students: List[Dict]) -> List[Dict]:
    """
    Cria múltiplos alunos com sheet_codes únicos.
    Tabela: answer_sheet_students
    """
    client = get_supabase()
    if not client:
        logger.warning("Supabase not configured, cannot create students")
        return []

    try:
        # Gerar sheet_codes únicos para cada aluno
        records = []
        for student in students:
            sheet_code = generate_sheet_code()
            records.append({
                'batch_id': batch_id,
                'sheet_code': sheet_code,
                'student_name': student.get('student_name', student.get('nome', '')),
                'enrollment_code': student.get('enrollment_code', student.get('matricula', '')),
                'class_name': student.get('class_name', student.get('turma', '')),
                'created_at': datetime.utcnow().isoformat()
            })

        response = client.table('answer_sheet_students').insert(records).execute()

        if response.data:
            logger.info(f"Created {len(response.data)} students for batch {batch_id}")
            return response.data
        return []

    except Exception as e:
        logger.error(f"Supabase students creation error: {e}")
        return []


def get_batch_status(batch_id: str) -> Optional[Dict[str, Any]]:
    """
    Retorna status do lote com contagens.
    """
    client = get_supabase()
    if not client:
        return None

    try:
        # Buscar batch
        batch_resp = client.table('answer_sheet_batches') \
            .select('*') \
            .eq('id', batch_id) \
            .single() \
            .execute()

        if not batch_resp.data:
            return None

        # Buscar alunos do batch
        students_resp = client.table('answer_sheet_students') \
            .select('id, sheet_code, student_name, processed_at') \
            .eq('batch_id', batch_id) \
            .execute()

        students = students_resp.data or []
        total = len(students)
        processed = sum(1 for s in students if s.get('processed_at'))

        return {
            'batch': batch_resp.data,
            'total_students': total,
            'processed_count': processed,
            'pending_count': total - processed,
            'students': students
        }

    except Exception as e:
        logger.error(f"Supabase batch status error: {e}")
        return None


def get_batch_students_for_pdf(batch_id: str) -> List[Dict]:
    """
    Retorna lista de alunos para gerar PDF.
    """
    client = get_supabase()
    if not client:
        return []

    try:
        response = client.table('answer_sheet_students') \
            .select('sheet_code, student_name, enrollment_code, class_name') \
            .eq('batch_id', batch_id) \
            .order('student_name') \
            .execute()

        return response.data or []

    except Exception as e:
        logger.error(f"Supabase get students error: {e}")
        return []

