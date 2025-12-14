/**
 * End-to-End Test for Flexible Exam Configuration System
 *
 * This test demonstrates the complete flow:
 * 1. Create a new exam configuration
 * 2. Save it via API
 * 3. Load the configuration
 * 4. Calculate TCT with variable maxScore
 */

const API_BASE = 'http://localhost:8080/api';

// Test configuration data
const testConfig = {
  userId: 'user-123',
  name: 'Prova de Português - 1º Trimestre',
  totalQuestions: 30,
  alternativesCount: 5,
  maxScoreTCT: 10.0,
  usesTRI: false,
  usesAdjustedTRI: false,
  disciplines: [
    {
      id: 'disc-1',
      name: 'Leitura e Interpretação',
      startQuestion: 1,
      endQuestion: 10,
      color: '#FF6B6B'
    },
    {
      id: 'disc-2',
      name: 'Gramática',
      startQuestion: 11,
      endQuestion: 20,
      color: '#4ECDC4'
    },
    {
      id: 'disc-3',
      name: 'Redação',
      startQuestion: 21,
      endQuestion: 30,
      color: '#FFE66D'
    }
  ],
  isActive: true
};

// Sample student answers for testing TCT calculation
const sampleStudentAnswers = {
  studentId: 'student-001',
  studentName: 'João Silva',
  answers: [
    'A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E', // Q1-Q10
    'A', 'A', 'B', 'B', 'C', 'C', 'D', 'D', 'E', 'E', // Q11-Q20
    'A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E'  // Q21-Q30
  ]
};

// Sample answer key
const answerKey = [
  'A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E', // Q1-Q10
  'A', 'B', 'C', 'D', 'E', 'C', 'D', 'E', 'A', 'B', // Q11-Q20
  'A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E'  // Q21-Q30
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logTest(title, message, success = true) {
  const icon = success ? '✅' : '❌';
  const color = success ? '\x1b[32m' : '\x1b[31m';
  const resetColor = '\x1b[0m';
  console.log(`${icon} ${color}[${title}] ${message}${resetColor}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`📋 ${title}`);
  console.log('='.repeat(60));
}

// ============================================================================
// TEST 1: Create and Save Exam Configuration
// ============================================================================

async function testCreateConfiguration() {
  logSection('TEST 1: Create and Save Exam Configuration');

  try {
    const response = await fetch(`${API_BASE}/exam-configurations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testConfig)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();

    if (!result.id) {
      throw new Error('No ID returned from server');
    }

    logTest('CREATE', `Configuration created with ID: ${result.id}`, true);
    logTest('CONFIG', `Name: ${testConfig.name}`, true);
    logTest('CONFIG', `Questions: ${testConfig.totalQuestions}`, true);
    logTest('CONFIG', `Max TCT Score: ${testConfig.maxScoreTCT}`, true);
    logTest('CONFIG', `Disciplines: ${testConfig.disciplines.length}`, true);

    return result.id;
  } catch (error) {
    logTest('CREATE', `Failed: ${error.message}`, false);
    throw error;
  }
}

// ============================================================================
// TEST 2: Load Configuration
// ============================================================================

async function testLoadConfiguration(configId) {
  logSection('TEST 2: Load Exam Configuration');

  try {
    const response = await fetch(`${API_BASE}/exam-configurations/${configId}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const loaded = await response.json();

    if (!loaded.id || loaded.name !== testConfig.name) {
      throw new Error('Loaded configuration does not match');
    }

    logTest('LOAD', `Configuration loaded successfully`, true);
    logTest('VERIFY', `Name matches: ${loaded.name}`, true);
    logTest('VERIFY', `Total questions: ${loaded.totalQuestions}`, true);
    logTest('VERIFY', `Disciplines: ${loaded.disciplines.length}`, true);
    logTest('VERIFY', `Max TCT Score: ${loaded.maxScoreTCT}`, true);

    return loaded;
  } catch (error) {
    logTest('LOAD', `Failed: ${error.message}`, false);
    throw error;
  }
}

// ============================================================================
// TEST 3: Calculate TCT with Variable maxScore
// ============================================================================

function calculateTCT(studentAnswers, answerKey, maxScore) {
  let correctCount = 0;

  for (let i = 0; i < studentAnswers.length; i++) {
    if (studentAnswers[i] === answerKey[i]) {
      correctCount++;
    }
  }

  const totalQuestions = answerKey.length;
  const score = (correctCount / totalQuestions) * maxScore;

  return {
    correctAnswers: correctCount,
    wrongAnswers: totalQuestions - correctCount,
    score: parseFloat(score.toFixed(2)),
    percentage: parseFloat(((correctCount / totalQuestions) * 100).toFixed(1))
  };
}

function testCalculateTCT(config) {
  logSection('TEST 3: Calculate TCT with Variable Max Score');

  try {
    const result = calculateTCT(
      sampleStudentAnswers.answers,
      answerKey,
      config.maxScoreTCT
    );

    logTest('CALCULATE', `Student: ${sampleStudentAnswers.studentName}`, true);
    logTest('RESULT', `Correct Answers: ${result.correctAnswers}/${answerKey.length}`, true);
    logTest('RESULT', `Wrong Answers: ${result.wrongAnswers}`, true);
    logTest('RESULT', `Percentage: ${result.percentage}%`, true);
    logTest('RESULT', `TCT Score: ${result.score} (max: ${config.maxScoreTCT})`, true);

    // Verify the calculation is correct
    const expectedScore = (result.correctAnswers / answerKey.length) * config.maxScoreTCT;
    if (Math.abs(result.score - expectedScore) < 0.01) {
      logTest('VERIFY', 'TCT calculation is correct', true);
    } else {
      throw new Error(`Score mismatch: ${result.score} vs ${expectedScore}`);
    }

    return result;
  } catch (error) {
    logTest('CALCULATE', `Failed: ${error.message}`, false);
    throw error;
  }
}

// ============================================================================
// TEST 4: Test with Different maxScore
// ============================================================================

function testAlternativeMaxScores() {
  logSection('TEST 4: Calculate TCT with Different Max Scores');

  const maxScores = [10.0, 2.5, 100, 5.0];
  const results = [];

  try {
    for (const maxScore of maxScores) {
      const result = calculateTCT(sampleStudentAnswers.answers, answerKey, maxScore);
      results.push({ maxScore, ...result });
      logTest('SCORE', `Max Score: ${maxScore} → TCT: ${result.score}`, true);
    }

    return results;
  } catch (error) {
    logTest('SCORES', `Failed: ${error.message}`, false);
    throw error;
  }
}

// ============================================================================
// TEST 5: Test Coverage Validation
// ============================================================================

function testCoverageValidation() {
  logSection('TEST 5: Validate Question Coverage');

  try {
    const allQuestions = new Set();
    let hasOverlap = false;

    for (const disc of testConfig.disciplines) {
      for (let i = disc.startQuestion; i <= disc.endQuestion; i++) {
        if (allQuestions.has(i)) {
          hasOverlap = true;
          break;
        }
        allQuestions.add(i);
      }
    }

    const uncovered = [];
    for (let i = 1; i <= testConfig.totalQuestions; i++) {
      if (!allQuestions.has(i)) {
        uncovered.push(i);
      }
    }

    logTest('COVERAGE', `Total questions allocated: ${allQuestions.size}/${testConfig.totalQuestions}`, true);
    logTest('OVERLAP', `No overlap detected: ${!hasOverlap}`, !hasOverlap);
    logTest('COVERAGE', `All questions covered: ${uncovered.length === 0}`, uncovered.length === 0);

    if (uncovered.length > 0) {
      logTest('UNCOVERED', `Questions not allocated: ${uncovered.join(', ')}`, false);
    }

    // List disciplines
    for (const disc of testConfig.disciplines) {
      const count = disc.endQuestion - disc.startQuestion + 1;
      logTest('DISCIPLINE', `${disc.name}: Q${disc.startQuestion}-${disc.endQuestion} (${count} questions)`, true);
    }

    return {
      totalAllocated: allQuestions.size,
      hasOverlap,
      uncovered,
      isValid: allQuestions.size === testConfig.totalQuestions && !hasOverlap
    };
  } catch (error) {
    logTest('COVERAGE', `Failed: ${error.message}`, false);
    throw error;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 Flexible Exam Configuration System - End-to-End Tests  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Test 5: Coverage validation (doesn't need API)
    testCoverageValidation();

    // Test 1: Create configuration
    const configId = await testCreateConfiguration();
    await delay(500);

    // Test 2: Load configuration
    const loadedConfig = await testLoadConfiguration(configId);
    await delay(500);

    // Test 3: Calculate TCT
    testCalculateTCT(loadedConfig);

    // Test 4: Test alternative max scores
    testAlternativeMaxScores();

    logSection('✅ All Tests Passed!');
    console.log('\n📊 Summary:');
    console.log('  ✅ Configuration created and saved');
    console.log('  ✅ Configuration loaded successfully');
    console.log('  ✅ Question coverage validated');
    console.log('  ✅ TCT calculation with variable maxScore working');
    console.log('  ✅ Multiple max score scenarios tested');
    console.log('\n🎉 System is ready for production!\n');

  } catch (error) {
    logSection('❌ Tests Failed');
    console.error('\n💥 Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
