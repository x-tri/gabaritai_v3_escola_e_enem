import { describe, it, expect } from 'vitest';
import { TCTCalculator } from '../tctCalculator';
import type { StudentData } from '@shared/schema';

// Helper function to create valid StudentData
function createStudent(id: string, answers: string[]): StudentData {
  return {
    id,
    studentNumber: id,
    studentName: `Student ${id}`,
    answers,
    pageNumber: 1,
  };
}

describe('TCTCalculator', () => {
  describe('calculate', () => {
    it('should calculate 100% score (10.0) when all answers are correct', () => {
      const students = [createStudent('001', ['A', 'B', 'C', 'D', 'E'])];
      const answerKey = ['A', 'B', 'C', 'D', 'E'];

      const results = TCTCalculator.calculate(students, answerKey);

      expect(results).toHaveLength(1);
      expect(results[0].averageScore).toBe(10);
    });

    it('should calculate 0% score when all answers are wrong', () => {
      const students = [createStudent('001', ['B', 'C', 'D', 'E', 'A'])];
      const answerKey = ['A', 'B', 'C', 'D', 'E'];

      const results = TCTCalculator.calculate(students, answerKey);

      expect(results[0].averageScore).toBe(0);
    });

    it('should calculate partial score correctly (40% = 4.0)', () => {
      const students = [createStudent('001', ['A', 'B', 'X', 'X', 'X'])]; // 2 correct, 3 wrong
      const answerKey = ['A', 'B', 'C', 'D', 'E'];

      const results = TCTCalculator.calculate(students, answerKey);

      expect(results[0].averageScore).toBe(4); // 2/5 * 10 = 4
    });

    it('should be case-insensitive', () => {
      const students = [createStudent('001', ['a', 'b', 'c'])];
      const answerKey = ['A', 'B', 'C'];

      const results = TCTCalculator.calculate(students, answerKey);

      expect(results[0].averageScore).toBe(10);
    });

    it('should handle multiple students', () => {
      const students = [
        createStudent('001', ['A', 'B', 'C']),
        createStudent('002', ['A', 'X', 'X']),
        createStudent('003', ['X', 'X', 'X']),
      ];
      const answerKey = ['A', 'B', 'C'];

      const results = TCTCalculator.calculate(students, answerKey);

      expect(results).toHaveLength(3);
      expect(results[0].averageScore).toBe(10); // 3/3 = 100%
      expect(results[1].averageScore).toBeCloseTo(3.33, 1); // 1/3 ~ 33%
      expect(results[2].averageScore).toBe(0); // 0/3 = 0%
    });

    it('should calculate by area when areas are provided', () => {
      const students = [
        createStudent('001', ['A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E']),
      ];
      const answerKey = ['A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E'];
      const areas = [
        { area: 'Area1', start: 1, end: 5 },
        { area: 'Area2', start: 6, end: 10 },
      ];

      const results = TCTCalculator.calculate(students, answerKey, areas);

      expect(results[0].areaScores).toBeDefined();
      expect(results[0].areaScores.Area1).toBe(10);
      expect(results[0].areaScores.Area2).toBe(10);
    });

    it('should calculate partial area scores correctly', () => {
      const students = [
        createStudent('001', ['A', 'B', 'X', 'X', 'X', 'A', 'B', 'C', 'D', 'E']),
      ];
      const answerKey = ['A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E'];
      const areas = [
        { area: 'Area1', start: 1, end: 5 },
        { area: 'Area2', start: 6, end: 10 },
      ];

      const results = TCTCalculator.calculate(students, answerKey, areas);

      expect(results[0].areaScores.Area1).toBe(4); // 2/5 * 10 = 4
      expect(results[0].areaScores.Area2).toBe(10); // 5/5 * 10 = 10
      expect(results[0].averageScore).toBe(7); // (4 + 10) / 2 = 7
    });

    it('should throw error for empty student list', () => {
      expect(() => TCTCalculator.calculate([], ['A', 'B'])).toThrow(
        'Lista de alunos vazia'
      );
    });

    it('should throw error for empty answer key', () => {
      expect(() =>
        TCTCalculator.calculate([createStudent('001', ['A'])], [])
      ).toThrow('Gabarito não fornecido');
    });

    it('should return studentId in results', () => {
      const students = [createStudent('ABC123', ['A', 'B', 'C'])];
      const answerKey = ['A', 'B', 'C'];

      const results = TCTCalculator.calculate(students, answerKey);

      expect(results[0].studentId).toBe('ABC123');
    });

    it('should handle empty areaScores when no areas defined', () => {
      const students = [createStudent('001', ['A', 'B', 'C'])];
      const answerKey = ['A', 'B', 'C'];

      const results = TCTCalculator.calculate(students, answerKey);

      expect(results[0].areaScores).toEqual({});
    });
  });

  describe('Edge Cases', () => {
    it('handles student with fewer answers than answer key', () => {
      const students = [createStudent('001', ['A', 'B'])]; // 2 answers
      const answerKey = ['A', 'B', 'C', 'D', 'E']; // 5 questions

      const results = TCTCalculator.calculate(students, answerKey);

      // 2 correct out of 5 total questions = 40%
      expect(results[0].averageScore).toBe(4);
    });

    it('handles student with more answers than answer key', () => {
      const students = [createStudent('001', ['A', 'B', 'C', 'D', 'E', 'A', 'B'])]; // 7 answers
      const answerKey = ['A', 'B', 'C']; // 3 questions

      const results = TCTCalculator.calculate(students, answerKey);

      // 3 correct out of 3 questions = 100%
      expect(results[0].averageScore).toBe(10);
    });

    it('handles blank answers (empty string) as incorrect', () => {
      const students = [createStudent('001', ['A', '', 'C', '', 'E'])];
      const answerKey = ['A', 'B', 'C', 'D', 'E'];

      const results = TCTCalculator.calculate(students, answerKey);

      // 3 correct (A, C, E) out of 5 = 60%
      expect(results[0].averageScore).toBe(6);
    });

    it('handles undefined answers as incorrect', () => {
      const answers: (string | undefined)[] = ['A', undefined, 'C'];
      const students = [{
        id: '001',
        studentNumber: '001',
        studentName: 'Student 001',
        answers: answers as string[],
        pageNumber: 1,
      }];
      const answerKey = ['A', 'B', 'C'];

      const results = TCTCalculator.calculate(students, answerKey);

      // 2 correct (A, C) out of 3 = 66.67%
      expect(results[0].averageScore).toBeCloseTo(6.67, 2);
    });

    it('rounds score to 2 decimal places', () => {
      const students = [createStudent('001', ['A', 'B', 'X'])];
      const answerKey = ['A', 'B', 'C'];

      const results = TCTCalculator.calculate(students, answerKey);

      // 2/3 = 0.6666... * 10 = 6.666...
      expect(results[0].averageScore).toBe(6.67);
    });

    it('handles completely empty answers array', () => {
      const students = [createStudent('001', [])];
      const answerKey = ['A', 'B', 'C'];

      const results = TCTCalculator.calculate(students, answerKey);

      expect(results[0].averageScore).toBe(0);
    });

    it('handles single question exam', () => {
      const students = [createStudent('001', ['A'])];
      const answerKey = ['A'];

      const results = TCTCalculator.calculate(students, answerKey);

      expect(results[0].averageScore).toBe(10);
    });

    it('handles area calculation with mismatched answer lengths', () => {
      const students = [createStudent('001', ['A', 'B'])]; // only 2 answers
      const answerKey = ['A', 'B', 'C', 'D', 'E'];
      const areas = [
        { area: 'Area1', start: 1, end: 3 },
        { area: 'Area2', start: 4, end: 5 },
      ];

      const results = TCTCalculator.calculate(students, answerKey, areas);

      // Area1: 2/3 correct = 6.67
      // Area2: 0/2 correct = 0
      expect(results[0].areaScores.Area1).toBeCloseTo(6.67, 2);
      expect(results[0].areaScores.Area2).toBe(0);
    });

    it('uses custom maxScore correctly', () => {
      const students = [createStudent('001', ['A', 'B', 'C', 'D', 'E'])];
      const answerKey = ['A', 'B', 'C', 'D', 'E'];

      const results = TCTCalculator.calculate(students, answerKey, undefined, { maxScore: 100 });

      expect(results[0].averageScore).toBe(100);
    });
  });
});
