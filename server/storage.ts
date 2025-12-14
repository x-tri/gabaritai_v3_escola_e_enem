import { randomUUID } from "crypto";
import type { StudentData, ProcessingSession, ProcessedPage, ExamConfiguration, InsertExamConfiguration } from "@shared/schema";

export interface IStorage {
  createSession(fileName: string, totalPages: number): Promise<ProcessingSession>;
  updateSession(id: string, updates: Partial<ProcessingSession>): Promise<ProcessingSession | undefined>;
  getSession(id: string): Promise<ProcessingSession | undefined>;
  addStudentToSession(sessionId: string, student: StudentData): Promise<void>;
}

export class MemStorage implements IStorage {
  private sessions: Map<string, ProcessingSession>;
  private examConfigurations: Map<string, ExamConfiguration>;

  constructor() {
    this.sessions = new Map();
    this.examConfigurations = new Map();
  }

  async createSession(fileName: string, totalPages: number): Promise<ProcessingSession> {
    const id = randomUUID();
    const session: ProcessingSession = {
      id,
      fileName,
      totalPages,
      processedPages: 0,
      status: "uploading",
      pages: [],
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(id, session);
    return session;
  }

  async updateSession(id: string, updates: Partial<ProcessingSession>): Promise<ProcessingSession | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updated = { ...session, ...updates };
    this.sessions.set(id, updated);
    return updated;
  }

  async getSession(id: string): Promise<ProcessingSession | undefined> {
    return this.sessions.get(id);
  }

  async addStudentToSession(sessionId: string, student: StudentData): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const pageIndex = session.pages.findIndex(p => p.pageNumber === student.pageNumber);
    if (pageIndex >= 0) {
      session.pages[pageIndex].students.push(student);
    } else {
      session.pages.push({
        pageNumber: student.pageNumber,
        status: "completed",
        students: [student],
      });
    }
    this.sessions.set(sessionId, session);
  }

  // ============================================================================
  // EXAM CONFIGURATION METHODS - SISTEMA DE PROVAS PERSONALIZÁVEIS
  // ============================================================================

  async saveExamConfiguration(config: ExamConfiguration): Promise<string> {
    const id = config.id || randomUUID();
    const now = new Date().toISOString();

    const configWithTimestamps: ExamConfiguration = {
      ...config,
      id,
      createdAt: config.createdAt || now,
      updatedAt: now,
    };

    this.examConfigurations.set(id, configWithTimestamps);
    return id;
  }

  async getExamConfiguration(id: string): Promise<ExamConfiguration | null> {
    return this.examConfigurations.get(id) || null;
  }

  async loadExamConfigurations(): Promise<Record<string, ExamConfiguration>> {
    const result: Record<string, ExamConfiguration> = {};
    for (const [id, config] of this.examConfigurations.entries()) {
      result[id] = config;
    }
    return result;
  }

  async deleteExamConfiguration(id: string): Promise<void> {
    this.examConfigurations.delete(id);
  }

  async createExamConfiguration(config: InsertExamConfiguration): Promise<ExamConfiguration> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const newConfig: ExamConfiguration = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.examConfigurations.set(id, newConfig);
    return newConfig;
  }

  async updateExamConfiguration(
    id: string,
    updates: Partial<InsertExamConfiguration>
  ): Promise<ExamConfiguration | null> {
    const existing = this.examConfigurations.get(id);
    if (!existing) {
      return null;
    }

    const updated: ExamConfiguration = {
      ...existing,
      ...updates,
      id,
      createdAt: existing.createdAt,
    };

    this.examConfigurations.set(id, updated);
    return updated;
  }

  async listUserExamConfigurations(userId: string): Promise<ExamConfiguration[]> {
    const configs: ExamConfiguration[] = [];
    for (const config of this.examConfigurations.values()) {
      if (config.userId === userId && config.isActive) {
        configs.push(config);
      }
    }
    return configs;
  }
}

export const storage = new MemStorage();
