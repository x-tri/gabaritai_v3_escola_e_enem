import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Read env
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/SUPABASE_SERVICE_KEY=(.+)/);

const supabaseUrl = urlMatch?.[1]?.trim() || '';
const supabaseKey = keyMatch?.[1]?.trim() || '';

const supabase = createClient(supabaseUrl, supabaseKey);
const studentId = 'c2fa3c85-0a86-44fa-9fd9-337424b47470';

async function test() {
  // 1. Check profile
  console.log('=== Profile ===');
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, student_number, name')
    .eq('id', studentId)
    .single();
  console.log(profile);

  if (!profile?.student_number) {
    console.log('No student_number found in profile!');
    return;
  }

  // 2. Check projetos
  console.log('\n=== Projetos ===');
  const { data: projetos } = await supabase
    .from('projetos')
    .select('id, nome, students')
    .limit(5);

  for (const p of projetos || []) {
    console.log('\nProjeto:', p.nome, '(' + p.id + ')');
    const students = (p.students as any[]) || [];
    console.log('  Total students:', students.length);

    // Check if our student exists
    const found = students.find((s: any) =>
      s.studentNumber === profile.student_number ||
      s.matricula === profile.student_number
    );

    if (found) {
      console.log('  ✅ FOUND student', profile.student_number);
      console.log('     studentNumber in projeto:', found.studentNumber || found.matricula);
    } else {
      // Show sample student numbers
      const sampleNumbers = students.slice(0, 3).map((s: any) => s.studentNumber || s.matricula);
      console.log('  ❌ Student', profile.student_number, 'NOT found');
      console.log('     Sample studentNumbers:', sampleNumbers.join(', '));
    }
  }
}

test();
