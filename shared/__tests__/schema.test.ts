import { describe, it, expect } from 'vitest';
import {
  studentDataSchema,
  answerKeySchema,
  examTemplateSchema,
  questionContentSchema,
  examDisciplineSchema,
  examConfigurationSchema,
} from '../schema';

describe('Schema Validation', () => {
  describe('studentDataSchema', () => {
    it('should accept valid student data with required fields', () => {
      const validStudent = {
        id: 'student-001',
        studentNumber: '12345',
        studentName: 'Joao Silva',
        answers: ['A', 'B', 'C', 'D', 'E'],
        pageNumber: 1,
      };

      const result = studentDataSchema.safeParse(validStudent);
      expect(result.success).toBe(true);
    });

    it('should accept student with optional turma field', () => {
      const studentWithTurma = {
        id: 'student-001',
        studentNumber: '12345',
        studentName: 'Joao Silva',
        answers: ['A', 'B'],
        pageNumber: 1,
        turma: '3A',
      };

      const result = studentDataSchema.safeParse(studentWithTurma);
      expect(result.success).toBe(true);
    });

    it('should reject student without id', () => {
      const invalidStudent = {
        studentNumber: '12345',
        studentName: 'Joao Silva',
        answers: ['A'],
        pageNumber: 1,
      };

      const result = studentDataSchema.safeParse(invalidStudent);
      expect(result.success).toBe(false);
    });

    it('should reject student without studentNumber', () => {
      const invalidStudent = {
        id: 'student-001',
        studentName: 'Joao Silva',
        answers: ['A'],
        pageNumber: 1,
      };

      const result = studentDataSchema.safeParse(invalidStudent);
      expect(result.success).toBe(false);
    });

    it('should reject student without answers array', () => {
      const invalidStudent = {
        id: 'student-001',
        studentNumber: '12345',
        studentName: 'Joao Silva',
        pageNumber: 1,
      };

      const result = studentDataSchema.safeParse(invalidStudent);
      expect(result.success).toBe(false);
    });

    it('should reject student without pageNumber', () => {
      const invalidStudent = {
        id: 'student-001',
        studentNumber: '12345',
        studentName: 'Joao Silva',
        answers: ['A'],
      };

      const result = studentDataSchema.safeParse(invalidStudent);
      expect(result.success).toBe(false);
    });

    it('should accept empty answers array', () => {
      const studentWithEmptyAnswers = {
        id: 'student-001',
        studentNumber: '12345',
        studentName: 'Joao Silva',
        answers: [],
        pageNumber: 1,
      };

      const result = studentDataSchema.safeParse(studentWithEmptyAnswers);
      expect(result.success).toBe(true);
    });
  });

  describe('answerKeySchema', () => {
    it('should accept valid answer key', () => {
      const validKey = {
        id: 'key-001',
        name: 'Prova de Matematica',
        answers: ['A', 'B', 'C', 'D', 'E'],
        createdAt: '2024-01-15T10:00:00Z',
      };

      const result = answerKeySchema.safeParse(validKey);
      expect(result.success).toBe(true);
    });

    it('should reject answer key without id', () => {
      const invalidKey = {
        name: 'Prova de Matematica',
        answers: ['A', 'B', 'C'],
        createdAt: '2024-01-15T10:00:00Z',
      };

      const result = answerKeySchema.safeParse(invalidKey);
      expect(result.success).toBe(false);
    });

    it('should reject answer key without name', () => {
      const invalidKey = {
        id: 'key-001',
        answers: ['A', 'B', 'C'],
        createdAt: '2024-01-15T10:00:00Z',
      };

      const result = answerKeySchema.safeParse(invalidKey);
      expect(result.success).toBe(false);
    });

    it('should reject answer key without answers', () => {
      const invalidKey = {
        id: 'key-001',
        name: 'Prova de Matematica',
        createdAt: '2024-01-15T10:00:00Z',
      };

      const result = answerKeySchema.safeParse(invalidKey);
      expect(result.success).toBe(false);
    });
  });

  describe('examTemplateSchema', () => {
    it('should accept valid exam template', () => {
      const validTemplate = {
        id: 'template-001',
        name: 'ENEM',
        totalQuestions: 180,
        validAnswers: ['A', 'B', 'C', 'D', 'E'],
        passingScore: 60,
        createdAt: '2024-01-15T10:00:00Z',
      };

      const result = examTemplateSchema.safeParse(validTemplate);
      expect(result.success).toBe(true);
    });

    it('should accept template with optional description', () => {
      const templateWithDesc = {
        id: 'template-001',
        name: 'ENEM',
        description: 'Exame Nacional do Ensino Medio',
        totalQuestions: 180,
        validAnswers: ['A', 'B', 'C', 'D', 'E'],
        passingScore: 60,
        createdAt: '2024-01-15T10:00:00Z',
      };

      const result = examTemplateSchema.safeParse(templateWithDesc);
      expect(result.success).toBe(true);
    });

    it('should reject template without totalQuestions', () => {
      const invalidTemplate = {
        id: 'template-001',
        name: 'ENEM',
        validAnswers: ['A', 'B', 'C', 'D', 'E'],
        passingScore: 60,
        createdAt: '2024-01-15T10:00:00Z',
      };

      const result = examTemplateSchema.safeParse(invalidTemplate);
      expect(result.success).toBe(false);
    });
  });

  describe('questionContentSchema', () => {
    it('rejects invalid question number (negative)', () => {
      const result = questionContentSchema.safeParse({
        questionNumber: -1,
        answer: 'A',
        content: 'Matematica',
      });

      expect(result.success).toBe(false);
    });

    it('rejects invalid question number (zero)', () => {
      const result = questionContentSchema.safeParse({
        questionNumber: 0,
        answer: 'A',
        content: 'Matematica',
      });

      expect(result.success).toBe(false);
    });

    it('rejects invalid answer (not A-E)', () => {
      const result = questionContentSchema.safeParse({
        questionNumber: 1,
        answer: 'Z',
        content: 'Matematica',
      });

      expect(result.success).toBe(false);
    });

    it('rejects empty content', () => {
      const result = questionContentSchema.safeParse({
        questionNumber: 1,
        answer: 'A',
        content: '',
      });

      expect(result.success).toBe(false);
    });

    it('accepts valid question content with uppercase answer', () => {
      const result = questionContentSchema.safeParse({
        questionNumber: 1,
        answer: 'A',
        content: 'Matematica - Funcoes',
      });

      expect(result.success).toBe(true);
    });

    it('accepts valid question content with lowercase answer', () => {
      const result = questionContentSchema.safeParse({
        questionNumber: 1,
        answer: 'e',
        content: 'Portugues - Interpretacao',
      });

      expect(result.success).toBe(true);
    });

    it('accepts all valid answers A-E', () => {
      const validAnswers = ['A', 'B', 'C', 'D', 'E', 'a', 'b', 'c', 'd', 'e'];

      for (const answer of validAnswers) {
        const result = questionContentSchema.safeParse({
          questionNumber: 1,
          answer,
          content: 'Test content',
        });

        expect(result.success).toBe(true);
      }
    });

    it('rejects non-integer question number', () => {
      const result = questionContentSchema.safeParse({
        questionNumber: 1.5,
        answer: 'A',
        content: 'Matematica',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('examDisciplineSchema', () => {
    it('rejects when endQuestion < startQuestion', () => {
      const result = examDisciplineSchema.safeParse({
        id: 'disc-1',
        name: 'Matematica',
        startQuestion: 10,
        endQuestion: 5,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('>=');
      }
    });

    it('rejects negative startQuestion', () => {
      const result = examDisciplineSchema.safeParse({
        id: 'disc-1',
        name: 'Matematica',
        startQuestion: -1,
        endQuestion: 10,
      });

      expect(result.success).toBe(false);
    });

    it('rejects zero startQuestion', () => {
      const result = examDisciplineSchema.safeParse({
        id: 'disc-1',
        name: 'Matematica',
        startQuestion: 0,
        endQuestion: 10,
      });

      expect(result.success).toBe(false);
    });

    it('rejects empty name', () => {
      const result = examDisciplineSchema.safeParse({
        id: 'disc-1',
        name: '',
        startQuestion: 1,
        endQuestion: 10,
      });

      expect(result.success).toBe(false);
    });

    it('accepts valid discipline', () => {
      const result = examDisciplineSchema.safeParse({
        id: 'disc-1',
        name: 'Matematica',
        startQuestion: 1,
        endQuestion: 45,
        color: '#FF0000',
      });

      expect(result.success).toBe(true);
    });

    it('accepts discipline without optional color', () => {
      const result = examDisciplineSchema.safeParse({
        id: 'disc-1',
        name: 'Linguagens',
        startQuestion: 1,
        endQuestion: 45,
      });

      expect(result.success).toBe(true);
    });

    it('accepts equal start and end question', () => {
      const result = examDisciplineSchema.safeParse({
        id: 'disc-1',
        name: 'Redacao',
        startQuestion: 1,
        endQuestion: 1,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('examConfigurationSchema', () => {
    const validDisciplines = [
      { id: 'd1', name: 'LC', startQuestion: 1, endQuestion: 45 },
      { id: 'd2', name: 'MT', startQuestion: 46, endQuestion: 90 },
    ];

    const baseConfig = {
      userId: 'user-1',
      name: 'ENEM Simulado',
      totalQuestions: 90,
      alternativesCount: 5,
      maxScoreTCT: 10,
      disciplines: validDisciplines,
    };

    it('rejects overlapping disciplines', () => {
      const result = examConfigurationSchema.safeParse({
        ...baseConfig,
        disciplines: [
          { id: 'd1', name: 'LC', startQuestion: 1, endQuestion: 50 },
          { id: 'd2', name: 'MT', startQuestion: 40, endQuestion: 90 }, // overlap 40-50
        ],
      });

      expect(result.success).toBe(false);
    });

    it('rejects when disciplines dont cover all questions', () => {
      const result = examConfigurationSchema.safeParse({
        ...baseConfig,
        disciplines: [
          { id: 'd1', name: 'LC', startQuestion: 1, endQuestion: 40 }, // faltam 41-90
        ],
      });

      expect(result.success).toBe(false);
    });

    it('rejects invalid alternativesCount (not 4 or 5)', () => {
      const result = examConfigurationSchema.safeParse({
        ...baseConfig,
        alternativesCount: 3,
      });

      expect(result.success).toBe(false);
    });

    it('accepts alternativesCount of 4', () => {
      const result = examConfigurationSchema.safeParse({
        ...baseConfig,
        alternativesCount: 4,
      });

      expect(result.success).toBe(true);
    });

    it('accepts alternativesCount of 5', () => {
      const result = examConfigurationSchema.safeParse({
        ...baseConfig,
        alternativesCount: 5,
      });

      expect(result.success).toBe(true);
    });

    it('rejects name with less than 3 characters', () => {
      const result = examConfigurationSchema.safeParse({
        ...baseConfig,
        name: 'AB',
      });

      expect(result.success).toBe(false);
    });

    it('rejects totalQuestions less than 5', () => {
      const result = examConfigurationSchema.safeParse({
        ...baseConfig,
        totalQuestions: 4,
        disciplines: [
          { id: 'd1', name: 'LC', startQuestion: 1, endQuestion: 4 },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('rejects totalQuestions greater than 500', () => {
      const result = examConfigurationSchema.safeParse({
        ...baseConfig,
        totalQuestions: 501,
        disciplines: [
          { id: 'd1', name: 'LC', startQuestion: 1, endQuestion: 501 },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('rejects empty disciplines array', () => {
      const result = examConfigurationSchema.safeParse({
        ...baseConfig,
        disciplines: [],
      });

      expect(result.success).toBe(false);
    });

    it('accepts valid ENEM configuration (90 questions, 2 areas)', () => {
      const result = examConfigurationSchema.safeParse({
        userId: 'user-1',
        name: 'ENEM Dia 1',
        totalQuestions: 90,
        alternativesCount: 5,
        maxScoreTCT: 10,
        usesTRI: true,
        disciplines: [
          { id: 'd1', name: 'Linguagens', startQuestion: 1, endQuestion: 45 },
          { id: 'd2', name: 'Ciencias Humanas', startQuestion: 46, endQuestion: 90 },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('accepts valid ENEM configuration (180 questions, 4 areas)', () => {
      const result = examConfigurationSchema.safeParse({
        userId: 'user-1',
        name: 'ENEM Completo',
        totalQuestions: 180,
        alternativesCount: 5,
        maxScoreTCT: 10,
        usesTRI: true,
        usesAdjustedTRI: true,
        disciplines: [
          { id: 'd1', name: 'Linguagens', startQuestion: 1, endQuestion: 45 },
          { id: 'd2', name: 'Ciencias Humanas', startQuestion: 46, endQuestion: 90 },
          { id: 'd3', name: 'Ciencias Natureza', startQuestion: 91, endQuestion: 135 },
          { id: 'd4', name: 'Matematica', startQuestion: 136, endQuestion: 180 },
        ],
      });

      expect(result.success).toBe(true);
    });
  });
});
