import { TRIDataLoader, TRIDataEntry } from "../data/triDataLoader";
import type { StudentData } from "@shared/schema";

/**
 * Limites históricos TRI por área (baseado nos dados ENEM 2009-2023)
 * MIN = nota TRI para 0 acertos (média dos anos recentes)
 * MAX = nota TRI para 45 acertos (média dos anos recentes)
 */
export const TRI_LIMITS: Record<string, { min: number; max: number }> = {
  LC: { min: 299.6, max: 820.8 },  // Linguagens e Códigos
  CH: { min: 305.1, max: 823.0 },  // Ciências Humanas
  CN: { min: 300.0, max: 868.4 },  // Ciências da Natureza
  MT: { min: 336.8, max: 958.6 },  // Matemática
};

/**
 * Interface para resultado do cálculo TRI
 */
export interface TRICalculationResult {
  studentId: string;
  correctAnswers: number;
  triScore: number | null;
  triMin: number | null;
  triMax: number | null;
  indiceCoerencia?: number;
}

/**
 * Interface para resultado do cálculo TRI adaptativo (provas customizadas)
 */
export interface TRIAdaptiveResult {
  studentId: string;
  correctAnswers: number;
  totalQuestions: number;
  percentageCorrect: number;
  triScore: number;
  triMin: number;
  triMax: number;
  confiabilidade: string;
}

/**
 * Interface para estatísticas de questões
 */
export interface QuestionStats {
  questionNumber: number;
  correctPercentage: number;
}

/**
 * Calculadora TRI com fator de coerência
 * Responsável por calcular notas TRI baseadas em dados históricos e coerência das respostas
 */
export class TRICalculator {
  /**
   * Obtém o peso de coerência baseado na porcentagem de acerto da questão
   * @param porcentagem Porcentagem de acerto (0.0 a 1.0)
   * @returns Peso de coerência (1 a 5)
   */
  private static getCategoriaPeso(porcentagem: number): number {
    const p = porcentagem * 100; // converter 0.2 para 20
    if (p >= 80) return 5; // Muito Fácil
    if (p >= 60) return 4; // Fácil
    if (p >= 40) return 3; // Média
    if (p >= 20) return 2; // Difícil
    return 1; // Muito Difícil (0 a 19%)
  }

  /**
   * Calcula o desvio padrão de um array de valores
   * Usa fórmula otimizada para melhor performance
   * @param valores Array de números
   * @returns Desvio padrão
   */
  private static calcularDesvioPadrao(valores: number[]): number {
    if (valores.length === 0) return 0;
    if (valores.length === 1) return 0;
    
    // Calcular média
    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    
    // Calcular variância (usando reduce otimizado)
    const variancia = valores.reduce((sum, val) => {
      const diff = val - media;
      return sum + (diff * diff);
    }, 0) / valores.length;
    
    return Math.sqrt(variancia);
  }

  /**
   * Busca dados históricos TRI para uma área, acertos e ano específicos
   * @param triData Dados TRI carregados
   * @param area Área do conhecimento (CH, CN, MT, LC)
   * @param acertos Número de acertos
   * @param ano Ano da prova
   * @returns Entrada TRI encontrada ou null
   */
  private static findTRIEntry(
    triData: TRIDataEntry[],
    area: string,
    acertos: number,
    ano: number
  ): TRIDataEntry | null {
    // Normalizar área para maiúsculas (garantir compatibilidade)
    const areaNormalizada = area.toUpperCase();
    
    // Limitar acertos ao range válido (0-45)
    const acertosLimitados = Math.max(0, Math.min(45, acertos));
    
    // Buscar para o ano específico
    let triEntry = triData.find(
      entry => entry.area.toUpperCase() === areaNormalizada && entry.acertos === acertosLimitados && entry.ano === ano
    );

    // Se não encontrou, tentar o ano mais recente disponível
    if (!triEntry) {
      const anosDisponiveis = [...new Set(triData.filter(e => e.area.toUpperCase() === areaNormalizada).map(e => e.ano))].sort((a, b) => b - a);
      console.log(`[TRICalculator] Não encontrado para ano ${ano}, tentando anos disponíveis:`, anosDisponiveis);

      for (const anoAlternativo of anosDisponiveis) {
        triEntry = triData.find(
          entry => entry.area.toUpperCase() === areaNormalizada && entry.acertos === acertosLimitados && entry.ano === anoAlternativo
        );
        if (triEntry) {
          console.log(`[TRICalculator] Usando dados do ano ${anoAlternativo} para área ${areaNormalizada}, acertos ${acertosLimitados}`);
          break;
        }
      }
    }
    
    // Log de debug se não encontrou
    if (!triEntry) {
      console.warn(`[TRICalculator] Dados não encontrados: área=${areaNormalizada}, acertos=${acertosLimitados}, ano=${ano}`);
      // Tentar encontrar dados próximos para debug
      const similarEntries = triData.filter(
        e => e.area.toUpperCase() === areaNormalizada && Math.abs(e.acertos - acertosLimitados) <= 2
      );
      if (similarEntries.length > 0) {
        console.log(`[TRICalculator] Entradas similares encontradas:`, similarEntries.slice(0, 3).map(e => `ano=${e.ano}, acertos=${e.acertos}`));
      }
    }

    return triEntry || null;
  }

  /**
   * Calcula o número de acertos de um aluno baseado nas respostas e gabarito
   * @param student Dados do aluno
   * @param answerKey Gabarito oficial
   * @returns Número de acertos
   */
  private static calculateCorrectAnswers(student: StudentData, answerKey?: string[]): number {
    if (student.correctAnswers !== undefined && student.correctAnswers !== null) {
      return student.correctAnswers;
    }

    if (answerKey && student.answers) {
      return student.answers.reduce((count: number, answer: string | undefined, idx: number) => {
        if (answer && answerKey[idx] && answer.toUpperCase() === answerKey[idx].toUpperCase()) {
          return count + 1;
        }
        return count;
      }, 0);
    }

    return 0;
  }

  /**
   * Calcula notas TRI para uma lista de alunos
   * @param students Lista de alunos
   * @param area Área do conhecimento (CH, CN, MT, LC)
   * @param ano Ano da prova
   * @param questionStats Estatísticas de acerto por questão (opcional)
   * @param answerKey Gabarito oficial (opcional)
   * @returns Array com resultados do cálculo TRI
   */
  static async calculate(
    students: StudentData[],
    area: string,
    ano: number,
    questionStats?: QuestionStats[],
    answerKey?: string[]
  ): Promise<{ results: TRICalculationResult[]; usarCoerencia: boolean }> {
    if (!students || students.length === 0) {
      throw new Error("Lista de alunos vazia");
    }

    if (!area || !ano) {
      throw new Error("Área e ano são obrigatórios");
    }

    const triData = await TRIDataLoader.load();

    // Normalizar área para maiúsculas
    const areaNormalizada = area.toUpperCase();

    // Criar mapa de estatísticas das questões (porcentagem de acerto)
    const statsMap = new Map<number, number>();
    if (questionStats && questionStats.length > 0) {
      questionStats.forEach(stat => {
        statsMap.set(stat.questionNumber, stat.correctPercentage / 100); // Converter para 0.0-1.0
      });
    }

    // Verificar se há variação suficiente nas questões
    const porcentagens = Array.from(statsMap.values());
    const desvioPadrao = this.calcularDesvioPadrao(porcentagens);
    const usarCoerencia = desvioPadrao >= 0.03 && statsMap.size > 0;

    console.log(`[TRICalculator] Processando ${students.length} alunos para área ${areaNormalizada}, ano ${ano}`);
    console.log(`[TRICalculator] Total de entradas no CSV: ${triData.length}`);
    console.log(`[TRICalculator] Entradas disponíveis para área ${areaNormalizada}:`, 
      triData.filter(e => e.area === areaNormalizada).length);
    console.log(`[TRICalculator] Anos disponíveis para área ${areaNormalizada}:`, 
      [...new Set(triData.filter(e => e.area === areaNormalizada).map(e => e.ano))].sort((a, b) => a - b));
    console.log(`[TRICalculator] Usando coerência: ${usarCoerencia}`);

    const results: TRICalculationResult[] = students.map(student => {
      // Calcular acertos
      const correctAnswers = this.calculateCorrectAnswers(student, answerKey);

      // Buscar dados históricos (usar área normalizada)
      const triEntry = this.findTRIEntry(triData, areaNormalizada, correctAnswers, ano);

      if (!triEntry) {
        console.log(`[TRICalculator] Dados não encontrados para: área=${area}, acertos=${correctAnswers}, ano=${ano}, studentId=${student.id}`);
        return {
          studentId: student.id,
          correctAnswers,
          triScore: null,
          triMin: null,
          triMax: null,
        };
      }

      console.log(`[TRICalculator] Dados encontrados para studentId=${student.id}, acertos=${correctAnswers}: min=${triEntry.min}, max=${triEntry.max}, media=${triEntry.media}`);

      // Se não há variação suficiente ou não há estatísticas, usar média
      if (!usarCoerencia || correctAnswers === 0 || correctAnswers === 45) {
        return {
          studentId: student.id,
          correctAnswers,
          triScore: triEntry.media,
          triMin: triEntry.min,
          triMax: triEntry.max,
        };
      }

      // Calcular coerência
      const questoesDetalhadas: Array<{
        id: number;
        pct: number;
        peso: number;
        acertou: boolean;
      }> = [];

      for (let i = 0; i < student.answers.length; i++) {
        const questionNum = i + 1;
        const pct = statsMap.get(questionNum) || 0;
        const peso = this.getCategoriaPeso(pct);
        const studentAnswer = student.answers[i]?.toUpperCase() || "";
        const correctAnswer = (answerKey?.[i] || "").toUpperCase();
        const acertou = studentAnswer !== "" && studentAnswer === correctAnswer;

        questoesDetalhadas.push({
          id: questionNum,
          pct,
          peso,
          acertou,
        });
      }

      // Ordenar da mais fácil (maior pct) para mais difícil
      const questoesOrdenadas = [...questoesDetalhadas].sort((a, b) => b.pct - a.pct);

      // Score ideal: soma dos pesos das N questões mais fáceis
      const scoreIdeal = questoesOrdenadas
        .slice(0, correctAnswers)
        .reduce((sum, q) => sum + q.peso, 0);

      // Score real: soma dos pesos das questões que o aluno realmente acertou
      const scoreReal = questoesDetalhadas
        .filter(q => q.acertou)
        .reduce((sum, q) => sum + q.peso, 0);

      // Calcular índice de coerência (0.0 a 1.0)
      const indiceCoerencia = scoreIdeal > 0 ? scoreReal / scoreIdeal : 0;
      const indiceCoerenciaLimitado = Math.max(0.0, Math.min(1.0, indiceCoerencia));

      // Interpolar entre min e max baseado na coerência
      const rangeNota = triEntry.max - triEntry.min;
      const notaFinal = triEntry.min + (rangeNota * indiceCoerenciaLimitado);

      return {
        studentId: student.id,
        correctAnswers,
        triScore: notaFinal,
        triMin: triEntry.min,
        triMax: triEntry.max,
        indiceCoerencia: indiceCoerenciaLimitado,
      };
    });

    const validResults = results.filter(r => r.triScore !== null && r.triScore !== undefined);
    console.log(`[TRICalculator] Resultados finais: ${validResults.length} válidos de ${results.length} total`);

    return { results, usarCoerencia };
  }

  /**
   * Calcula TRI para provas customizadas usando INTERPOLAÇÃO LINEAR SIMPLES
   *
   * Fórmula: TRI = MIN + (percentualAcertos * (MAX - MIN))
   *
   * Onde:
   * - percentualAcertos = acertos / totalQuestoes (0.0 a 1.0)
   * - MIN = nota TRI mínima histórica da área (0 acertos no ENEM)
   * - MAX = nota TRI máxima histórica da área (45 acertos no ENEM)
   *
   * Exemplo para LC com 10 questões:
   * - 10/10 acertos (100%) → 299.6 + (1.0 × (820.8 - 299.6)) = 820.8 (máximo)
   * - 0/10 acertos (0%)   → 299.6 + (0.0 × (820.8 - 299.6)) = 299.6 (mínimo)
   * - 5/10 acertos (50%)  → 299.6 + (0.5 × (820.8 - 299.6)) = 560.2
   *
   * @param students Lista de alunos
   * @param area Área do conhecimento (CH, CN, MT, LC)
   * @param answerKey Gabarito oficial
   * @param totalQuestions Total de questões na prova customizada
   * @returns Array com resultados do cálculo TRI adaptativo
   */
  static calculateForCustomExam(
    students: StudentData[],
    area: string,
    answerKey: string[],
    totalQuestions: number
  ): TRIAdaptiveResult[] {
    console.log(`[TRICalculator] === Cálculo TRI Adaptativo para Prova Customizada ===`);
    console.log(`[TRICalculator] Área: ${area}, Total Questões: ${totalQuestions}`);
    console.log(`[TRICalculator] Total de alunos: ${students.length}`);

    // Normalizar área para maiúsculas
    const areaNormalizada = area.toUpperCase();

    // Obter limites TRI para a área
    const limits = TRI_LIMITS[areaNormalizada];
    if (!limits) {
      console.error(`[TRICalculator] Área desconhecida: ${areaNormalizada}. Usando LC como fallback.`);
    }
    const { min: triMin, max: triMax } = limits || TRI_LIMITS.LC;
    const triRange = triMax - triMin;

    console.log(`[TRICalculator] Limites TRI para ${areaNormalizada}: MIN=${triMin}, MAX=${triMax}`);

    // Determinar confiabilidade baseada no número de questões
    let confiabilidade: string;
    if (totalQuestions < 10) {
      confiabilidade = "BAIXA";
    } else if (totalQuestions < 15) {
      confiabilidade = "MODERADA";
    } else if (totalQuestions < 20) {
      confiabilidade = "BOA";
    } else if (totalQuestions < 30) {
      confiabilidade = "MUITO_BOA";
    } else {
      confiabilidade = "EXCELENTE";
    }

    console.log(`[TRICalculator] Confiabilidade: ${confiabilidade}`);

    const results: TRIAdaptiveResult[] = students.map(student => {
      // Calcular acertos
      const correctAnswers = this.calculateCorrectAnswers(student, answerKey);

      // Calcular percentual de acertos (0.0 a 1.0)
      const percentageCorrect = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

      // INTERPOLAÇÃO LINEAR SIMPLES
      // TRI = MIN + (percentual × (MAX - MIN))
      const triScore = triMin + (percentageCorrect * triRange);

      console.log(`[TRICalculator] Aluno ${student.id}: ${correctAnswers}/${totalQuestions} (${(percentageCorrect * 100).toFixed(1)}%) → TRI = ${triScore.toFixed(1)}`);

      return {
        studentId: student.id,
        correctAnswers,
        totalQuestions,
        percentageCorrect: Math.round(percentageCorrect * 100 * 10) / 10, // ex: 75.5%
        triScore: Math.round(triScore * 10) / 10, // Arredondar para 1 casa decimal
        triMin,
        triMax,
        confiabilidade,
      };
    });

    console.log(`[TRICalculator] === Cálculo TRI Adaptativo Concluído ===`);
    return results;
  }

  /**
   * Versão simplificada para calcular TRI de um único aluno em prova customizada
   * Útil para cálculos rápidos sem precisar criar array de alunos
   *
   * @param correctAnswers Número de acertos
   * @param totalQuestions Total de questões
   * @param area Área do conhecimento (CH, CN, MT, LC)
   * @returns Nota TRI calculada
   */
  static calculateSingleTRI(
    correctAnswers: number,
    totalQuestions: number,
    area: string
  ): number {
    const areaNormalizada = area.toUpperCase();
    const limits = TRI_LIMITS[areaNormalizada] || TRI_LIMITS.LC;
    const { min: triMin, max: triMax } = limits;

    const percentageCorrect = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const triScore = triMin + (percentageCorrect * (triMax - triMin));

    return Math.round(triScore * 10) / 10;
  }
}

