import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRICalculator, TRI_LIMITS, TRIAdaptiveResult } from '../triCalculator';
import type { StudentData } from '@shared/schema';

// Mock TRIDataLoader for calculate() method
vi.mock('../../data/triDataLoader', () => ({
  TRIDataLoader: {
    load: vi.fn().mockResolvedValue([]),
  },
}));

function createStudent(id: string, answers: string[]): StudentData {
  return {
    id,
    studentNumber: id,
    studentName: `Student ${id}`,
    answers,
    pageNumber: 1,
  };
}

describe('TRICalculator', () => {
  describe('TRI_LIMITS', () => {
    it('has correct limits for all ENEM areas', () => {
      expect(TRI_LIMITS.LC).toEqual({ min: 299.6, max: 820.8 });
      expect(TRI_LIMITS.CH).toEqual({ min: 305.1, max: 823.0 });
      expect(TRI_LIMITS.CN).toEqual({ min: 300.0, max: 868.4 });
      expect(TRI_LIMITS.MT).toEqual({ min: 336.8, max: 958.6 });
    });

    it('MT has the highest max score', () => {
      const maxScores = Object.values(TRI_LIMITS).map(l => l.max);
      const mtMax = TRI_LIMITS.MT.max;

      expect(mtMax).toBe(Math.max(...maxScores));
    });

    it('LC has the lowest min score', () => {
      const minScores = Object.values(TRI_LIMITS).map(l => l.min);
      const lcMin = TRI_LIMITS.LC.min;

      expect(lcMin).toBe(Math.min(...minScores));
    });
  });

  describe('calculateSingleTRI', () => {
    it('returns MIN score for 0% correct', () => {
      const score = TRICalculator.calculateSingleTRI(0, 45, 'LC');

      expect(score).toBe(TRI_LIMITS.LC.min);
    });

    it('returns MAX score for 100% correct', () => {
      const score = TRICalculator.calculateSingleTRI(45, 45, 'LC');

      expect(score).toBe(TRI_LIMITS.LC.max);
    });

    it('calculates linear interpolation for 50%', () => {
      const score = TRICalculator.calculateSingleTRI(22, 44, 'MT');
      const expected = TRI_LIMITS.MT.min + 0.5 * (TRI_LIMITS.MT.max - TRI_LIMITS.MT.min);

      expect(score).toBeCloseTo(expected, 1);
    });

    it('handles different areas correctly', () => {
      const lcScore = TRICalculator.calculateSingleTRI(45, 45, 'LC');
      const mtScore = TRICalculator.calculateSingleTRI(45, 45, 'MT');

      expect(lcScore).toBe(TRI_LIMITS.LC.max);
      expect(mtScore).toBe(TRI_LIMITS.MT.max);
      expect(mtScore).toBeGreaterThan(lcScore);
    });

    it('normalizes area to uppercase', () => {
      const lcLower = TRICalculator.calculateSingleTRI(20, 40, 'lc');
      const lcUpper = TRICalculator.calculateSingleTRI(20, 40, 'LC');

      expect(lcLower).toBe(lcUpper);
    });

    it('falls back to LC for unknown area', () => {
      const unknownScore = TRICalculator.calculateSingleTRI(20, 40, 'UNKNOWN');
      const lcScore = TRICalculator.calculateSingleTRI(20, 40, 'LC');

      expect(unknownScore).toBe(lcScore);
    });

    it('handles 0 total questions without division error', () => {
      const score = TRICalculator.calculateSingleTRI(0, 0, 'LC');

      expect(score).toBe(TRI_LIMITS.LC.min);
    });

    it('rounds score to 1 decimal place', () => {
      // 13/45 = 0.2888... → should round
      const score = TRICalculator.calculateSingleTRI(13, 45, 'LC');
      const decimals = score.toString().split('.')[1]?.length || 0;

      expect(decimals).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateForCustomExam', () => {
    it('calculates correct TRI for all students', () => {
      const students = [
        createStudent('001', ['A', 'B', 'C', 'D', 'E']),
        createStudent('002', ['A', 'B', 'C', 'X', 'X']),
        createStudent('003', ['X', 'X', 'X', 'X', 'X']),
      ];
      const answerKey = ['A', 'B', 'C', 'D', 'E'];

      const results = TRICalculator.calculateForCustomExam(students, 'LC', answerKey, 5);

      expect(results).toHaveLength(3);
      expect(results[0].correctAnswers).toBe(5); // 100%
      expect(results[1].correctAnswers).toBe(3); // 60%
      expect(results[2].correctAnswers).toBe(0); // 0%
    });

    it('assigns correct confidence levels based on question count', () => {
      const students = [createStudent('001', ['A', 'B', 'C', 'D', 'E'])];
      const answerKey = ['A', 'B', 'C', 'D', 'E'];

      const result5 = TRICalculator.calculateForCustomExam(students, 'LC', answerKey, 5);
      const result15 = TRICalculator.calculateForCustomExam(students, 'LC', answerKey, 15);
      const result25 = TRICalculator.calculateForCustomExam(students, 'LC', answerKey, 25);
      const result40 = TRICalculator.calculateForCustomExam(students, 'LC', answerKey, 40);

      expect(result5[0].confiabilidade).toBe('BAIXA');
      expect(result15[0].confiabilidade).toBe('BOA');
      expect(result25[0].confiabilidade).toBe('MUITO_BOA');
      expect(result40[0].confiabilidade).toBe('EXCELENTE');
    });

    it('returns correct triMin and triMax for area', () => {
      const students = [createStudent('001', ['A'])];
      const answerKey = ['A'];

      const lcResult = TRICalculator.calculateForCustomExam(students, 'LC', answerKey, 1);
      const mtResult = TRICalculator.calculateForCustomExam(students, 'MT', answerKey, 1);

      expect(lcResult[0].triMin).toBe(TRI_LIMITS.LC.min);
      expect(lcResult[0].triMax).toBe(TRI_LIMITS.LC.max);
      expect(mtResult[0].triMin).toBe(TRI_LIMITS.MT.min);
      expect(mtResult[0].triMax).toBe(TRI_LIMITS.MT.max);
    });

    it('calculates correct percentage', () => {
      const students = [createStudent('001', ['A', 'B', 'X', 'X', 'X'])];
      const answerKey = ['A', 'B', 'C', 'D', 'E'];

      const results = TRICalculator.calculateForCustomExam(students, 'LC', answerKey, 5);

      expect(results[0].percentageCorrect).toBe(40); // 2/5 = 40%
    });

    it('handles case-insensitive answer comparison', () => {
      const students = [createStudent('001', ['a', 'b', 'c'])];
      const answerKey = ['A', 'B', 'C'];

      const results = TRICalculator.calculateForCustomExam(students, 'LC', answerKey, 3);

      expect(results[0].correctAnswers).toBe(3);
    });

    it('handles empty answers as incorrect', () => {
      const students = [createStudent('001', ['A', '', 'C', '', 'E'])];
      const answerKey = ['A', 'B', 'C', 'D', 'E'];

      const results = TRICalculator.calculateForCustomExam(students, 'LC', answerKey, 5);

      expect(results[0].correctAnswers).toBe(3);
    });
  });

  describe('calculateCorrectAnswers (via calculateForCustomExam)', () => {
    it('handles student with fewer answers than answer key', () => {
      const students = [createStudent('001', ['A', 'B'])]; // 2 answers
      const answerKey = ['A', 'B', 'C', 'D', 'E']; // 5 questions

      const results = TRICalculator.calculateForCustomExam(students, 'LC', answerKey, 5);

      // Only 2 questions answered, both correct
      expect(results[0].correctAnswers).toBe(2);
    });

    it('handles student with more answers than answer key', () => {
      const students = [createStudent('001', ['A', 'B', 'C', 'D', 'E', 'A', 'B'])];
      const answerKey = ['A', 'B', 'C']; // 3 questions

      const results = TRICalculator.calculateForCustomExam(students, 'LC', answerKey, 3);

      // Only first 3 answers compared
      expect(results[0].correctAnswers).toBe(3);
    });
  });
});
