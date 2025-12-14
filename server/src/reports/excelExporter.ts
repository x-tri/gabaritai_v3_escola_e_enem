import ExcelJS from "exceljs";
import type { StudentData, ExamStatistics } from "@shared/schema";

/**
 * Interface para opções de exportação Excel
 */
export interface ExcelExportOptions {
  students: StudentData[];
  answerKey?: string[];
  questionContents?: Array<{ questionNumber: number; answer: string; content: string }>;
  statistics?: ExamStatistics;
  includeTRI?: boolean;
  triScores?: Map<string, number>;
  triScoresByArea?: Map<string, Record<string, number>>;
}

/**
 * Exportador de Excel com formatação rica
 * Equivalente ao XlsxWriter + Pandas em Python
 * Permite formatação condicional, cores, estilos, etc.
 */
export class ExcelExporter {
  /**
   * Gera arquivo Excel com formatação rica
   * @param options Opções de exportação
   * @returns Buffer do arquivo Excel
   */
  static async generateExcel(options: ExcelExportOptions): Promise<Buffer> {
    console.log("[EXCEL] ✅ Usando ExcelExporter V2 com aba TCT e colunas de acertos!");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "GabaritAI";
    workbook.created = new Date();
    workbook.modified = new Date();

    const { students, answerKey, questionContents, statistics, includeTRI, triScores, triScoresByArea } = options;

    // Validar alunos
    const validatedStudents = students.filter(
      s => s.id && s.studentNumber && s.studentName && Array.isArray(s.answers)
    );

    if (validatedStudents.length === 0) {
      throw new Error("Nenhum dado de aluno válido fornecido");
    }

    const maxAnswers = Math.max(...validatedStudents.map(s => s.answers?.length || 0));
    const hasGrading = !!(answerKey && answerKey.length > 0);

    // ===== ABA 1: ALUNOS =====
    const shouldIncludeTRI = !!(includeTRI && triScores);
    await this.createStudentsSheet(workbook, validatedStudents, answerKey || [], maxAnswers, hasGrading, shouldIncludeTRI, triScores, triScoresByArea);

    // ===== ABA 2: NOTAS TCT (NOVA!) =====
    if (hasGrading) {
      await this.createTCTScoresSheet(workbook, validatedStudents, triScoresByArea);
    }

    // ===== ABA 3: GABARITO =====
    if (hasGrading && answerKey) {
      await this.createAnswerKeySheet(workbook, answerKey, questionContents);
    }

    // ===== ABA 4: ESTATÍSTICAS =====
    if (statistics) {
      await this.createStatisticsSheet(workbook, statistics);
    }

    // ===== ABA 5: ANÁLISE POR QUESTÃO =====
    if (statistics?.questionStats && statistics.questionStats.length > 0) {
      await this.createQuestionAnalysisSheet(workbook, statistics.questionStats);
    }

    // Gerar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Cria aba de alunos com formatação condicional
   */
  private static async createStudentsSheet(
    workbook: ExcelJS.Workbook,
    students: StudentData[],
    answerKey: string[],
    maxAnswers: number,
    hasGrading: boolean,
    includeTRI: boolean,
    triScores?: Map<string, number>,
    triScoresByArea?: Map<string, Record<string, number>>
  ): Promise<void> {
    const sheet = workbook.addWorksheet("Alunos");

    // Definir cabeçalhos - REORGANIZADO: Acertos + TRI por área
    const headers = ["#", "Matrícula", "Nome", "Turma"];
    if (hasGrading) {
      headers.push("Acertos", "Erros", "Nota TCT", "Nota TRI");
      
      // Adicionar colunas de acertos e TRI por área (organizadas juntas)
      if (includeTRI && triScoresByArea) {
        headers.push("Acerto LC", "LC TRI", "Acerto CH", "CH TRI", "Acerto CN", "CN TRI", "Acerto MT", "MT TRI");
      }
    }
    headers.push("Confiança (%)", "Página");
    
    // Adicionar colunas de questões
    for (let i = 1; i <= maxAnswers; i++) {
      headers.push(`Q${i}`);
    }

    // Adicionar cabeçalhos
    sheet.addRow(headers);

    // Formatar cabeçalho
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" }, // Azul
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 20;

    // Adicionar dados dos alunos
    students.forEach((student, index) => {
      const row: (string | number)[] = [
        index + 1,
        student.studentNumber || "",
        student.studentName || "",
        this.extractTurmaFromStudent(student) || "",
      ];

      if (hasGrading) {
        // Acertos totais
        const totalCorrect = student.correctAnswers || 0;
        const totalWrong = student.wrongAnswers || 0;
        
        // TCT: score já é de 0-10
        const notaTCT = student.score !== undefined ? parseFloat(student.score.toFixed(2)) : 0;
        
        row.push(totalCorrect, totalWrong, notaTCT);
        
        // TRI Geral
        if (includeTRI && triScores) {
          const triScore = triScores.get(student.id);
          row.push(triScore !== undefined ? parseFloat(triScore.toFixed(1)) : "N/A");
        } else {
          row.push("N/A");
        }
        
        // Acertos e TRI por área (organizados: Acerto LC, LC TRI, Acerto CH, CH TRI, etc.)
        if (includeTRI && triScoresByArea) {
          const areaScores = triScoresByArea.get(student.id) || {};
          const areaCorrectAnswers = (student as any).areaCorrectAnswers || {};
          
          // LC
          row.push(areaCorrectAnswers.LC !== undefined ? areaCorrectAnswers.LC : "N/A");
          row.push(areaScores.LC !== undefined && areaScores.LC > 0 ? parseFloat(areaScores.LC.toFixed(1)) : "N/A");
          
          // CH
          row.push(areaCorrectAnswers.CH !== undefined ? areaCorrectAnswers.CH : "N/A");
          row.push(areaScores.CH !== undefined && areaScores.CH > 0 ? parseFloat(areaScores.CH.toFixed(1)) : "N/A");
          
          // CN
          row.push(areaCorrectAnswers.CN !== undefined ? areaCorrectAnswers.CN : "N/A");
          row.push(areaScores.CN !== undefined && areaScores.CN > 0 ? parseFloat(areaScores.CN.toFixed(1)) : "N/A");
          
          // MT
          row.push(areaCorrectAnswers.MT !== undefined ? areaCorrectAnswers.MT : "N/A");
          row.push(areaScores.MT !== undefined && areaScores.MT > 0 ? parseFloat(areaScores.MT.toFixed(1)) : "N/A");
        }
      }

      row.push(
        student.confidence !== undefined ? Math.round(student.confidence) : "N/A",
        student.pageNumber || 1
      );

      // Adicionar respostas
      for (let i = 0; i < maxAnswers; i++) {
        const answer = student.answers?.[i] || "";
        row.push(answer);
      }

      const excelRow = sheet.addRow(row);

      // Formatação condicional para questões
      if (hasGrading && answerKey) {
        const answerStartCol = headers.length - maxAnswers;
        for (let i = 0; i < maxAnswers; i++) {
          const colIndex = answerStartCol + i + 1; // +1 porque Excel é 1-indexed
          const cell = excelRow.getCell(colIndex);
          const studentAnswer = student.answers?.[i]?.toUpperCase() || "";
          const correctAnswer = answerKey[i]?.toUpperCase() || "";

          if (studentAnswer && correctAnswer) {
            if (studentAnswer === correctAnswer) {
              // VERDE: Resposta correta
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFC6EFCE" }, // Verde pastel
              };
              cell.font = { color: { argb: "FF006100" }, bold: true };
            } else {
              // VERMELHO: Resposta errada
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFC7CE" }, // Vermelho pastel
              };
              cell.font = { color: { argb: "FF9C0006" }, bold: true };
            }
          }
        }

        // Formatação condicional para nota TCT (coluna 7)
        const notaCol = 7;
        const notaCell = excelRow.getCell(notaCol);
        const nota = student.score || 0;
        
        if (nota >= 6.0) {
          // Verde: Aprovado
          notaCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC6EFCE" },
          };
          notaCell.font = { color: { argb: "FF006100" }, bold: true };
        } else if (nota >= 4.0) {
          // Amarelo: Atenção
          notaCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFE699" },
          };
          notaCell.font = { color: { argb: "FF9C5700" }, bold: true };
        } else {
          // Vermelho: Reprovado
          notaCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFC7CE" },
          };
          notaCell.font = { color: { argb: "FF9C0006" }, bold: true };
        }
      }
    });

    // Ajustar larguras das colunas
    sheet.getColumn(1).width = 5; // #
    sheet.getColumn(2).width = 12; // Matrícula
    sheet.getColumn(3).width = 25; // Nome
    sheet.getColumn(4).width = 10; // Turma
    
    if (hasGrading) {
      sheet.getColumn(5).width = 9; // Acertos
      sheet.getColumn(6).width = 7; // Erros
      sheet.getColumn(7).width = 10; // Nota TCT
      sheet.getColumn(8).width = 10; // Nota TRI
      
      if (includeTRI && triScoresByArea) {
        // Acerto LC, LC TRI, Acerto CH, CH TRI, Acerto CN, CN TRI, Acerto MT, MT TRI
        sheet.getColumn(9).width = 10; // Acerto LC
        sheet.getColumn(10).width = 8; // LC TRI
        sheet.getColumn(11).width = 10; // Acerto CH
        sheet.getColumn(12).width = 8; // CH TRI
        sheet.getColumn(13).width = 10; // Acerto CN
        sheet.getColumn(14).width = 8; // CN TRI
        sheet.getColumn(15).width = 10; // Acerto MT
        sheet.getColumn(16).width = 8; // MT TRI
      }
    }

    // Congelar primeira linha e primeiras colunas
    sheet.views = [
      {
        state: "frozen",
        ySplit: 1,
        xSplit: 4, // Congelar até a coluna Turma
      },
    ];
  }

  /**
   * Cria aba de notas TCT por área - NOVA!
   */
  private static async createTCTScoresSheet(
    workbook: ExcelJS.Workbook,
    students: StudentData[],
    triScoresByArea?: Map<string, Record<string, number>>
  ): Promise<void> {
    const sheet = workbook.addWorksheet("Notas TCT");

    // Cabeçalhos
    const headers = [
      "#", 
      "Matrícula", 
      "Nome", 
      "Turma",
      "TCT Total",
      "LC Acertos",
      "LC TCT",
      "CH Acertos", 
      "CH TCT",
      "CN Acertos",
      "CN TCT",
      "MT Acertos",
      "MT TCT"
    ];
    
    sheet.addRow(headers);

    // Formatar cabeçalho
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF70AD47" }, // Verde escuro
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 22;

    // Dados dos alunos
    students.forEach((student, index) => {
      const areaCorrectAnswers = (student as any).areaCorrectAnswers || {};
      
      // Acertos por área
      const lcAcertos = areaCorrectAnswers.LC !== undefined ? areaCorrectAnswers.LC : null;
      const chAcertos = areaCorrectAnswers.CH !== undefined ? areaCorrectAnswers.CH : null;
      const cnAcertos = areaCorrectAnswers.CN !== undefined ? areaCorrectAnswers.CN : null;
      const mtAcertos = areaCorrectAnswers.MT !== undefined ? areaCorrectAnswers.MT : null;
      
      // TCT por área (acertos × 0.222) - máximo 10.0
      const lcTCT = lcAcertos !== null ? parseFloat((lcAcertos * 0.222).toFixed(2)) : null;
      const chTCT = chAcertos !== null ? parseFloat((chAcertos * 0.222).toFixed(2)) : null;
      const cnTCT = cnAcertos !== null ? parseFloat((cnAcertos * 0.222).toFixed(2)) : null;
      const mtTCT = mtAcertos !== null ? parseFloat((mtAcertos * 0.222).toFixed(2)) : null;
      
      // TCT Total (score do aluno ou média das áreas disponíveis)
      const tctTotal = student.score !== undefined ? parseFloat(student.score.toFixed(2)) : 0;
      
      const row = sheet.addRow([
        index + 1,
        student.studentNumber || "",
        student.studentName || "",
        this.extractTurmaFromStudent(student) || "",
        tctTotal,
        lcAcertos !== null ? lcAcertos : "N/A",
        lcTCT !== null ? lcTCT : "N/A",
        chAcertos !== null ? chAcertos : "N/A",
        chTCT !== null ? chTCT : "N/A",
        cnAcertos !== null ? cnAcertos : "N/A",
        cnTCT !== null ? cnTCT : "N/A",
        mtAcertos !== null ? mtAcertos : "N/A",
        mtTCT !== null ? mtTCT : "N/A",
      ]);

      // Formatação condicional para TCT Total
      const tctTotalCell = row.getCell(5);
      if (tctTotal >= 6.0) {
        tctTotalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } };
        tctTotalCell.font = { color: { argb: "FF006100" }, bold: true };
      } else if (tctTotal >= 4.0) {
        tctTotalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE699" } };
        tctTotalCell.font = { color: { argb: "FF9C5700" }, bold: true };
      } else {
        tctTotalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } };
        tctTotalCell.font = { color: { argb: "FF9C0006" }, bold: true };
      }

      // Formatação para TCT por área (colunas 7, 9, 11, 13)
      [7, 9, 11, 13].forEach(colIdx => {
        const cell = row.getCell(colIdx);
        const value = cell.value;
        if (typeof value === 'number') {
          if (value >= 6.0) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } };
            cell.font = { color: { argb: "FF006100" }, bold: true };
          } else if (value >= 4.0) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE699" } };
            cell.font = { color: { argb: "FF9C5700" }, bold: true };
          } else {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } };
            cell.font = { color: { argb: "FF9C0006" }, bold: true };
          }
        }
      });
    });

    // Ajustar larguras
    sheet.getColumn(1).width = 5;
    sheet.getColumn(2).width = 12;
    sheet.getColumn(3).width = 25;
    sheet.getColumn(4).width = 10;
    sheet.getColumn(5).width = 10; // TCT Total
    sheet.getColumn(6).width = 11; // LC Acertos
    sheet.getColumn(7).width = 9;  // LC TCT
    sheet.getColumn(8).width = 11; // CH Acertos
    sheet.getColumn(9).width = 9;  // CH TCT
    sheet.getColumn(10).width = 11; // CN Acertos
    sheet.getColumn(11).width = 9;  // CN TCT
    sheet.getColumn(12).width = 11; // MT Acertos
    sheet.getColumn(13).width = 9;  // MT TCT

    // Congelar primeira linha
    sheet.views = [{ state: "frozen", ySplit: 1, xSplit: 4 }];
  }

  /**
   * Cria aba de gabarito
   */
  private static async createAnswerKeySheet(
    workbook: ExcelJS.Workbook,
    answerKey: string[],
    questionContents?: Array<{ questionNumber: number; answer: string; content: string }>
  ): Promise<void> {
    const sheet = workbook.addWorksheet("Gabarito");

    // Cabeçalhos
    const headers = ["Questão", "Resposta Correta", "Conteúdo"];
    sheet.addRow(headers);

    // Formatar cabeçalho
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Dados
    if (questionContents && questionContents.length > 0) {
      questionContents.forEach(qc => {
        sheet.addRow([qc.questionNumber || 0, qc.answer, qc.content || ""]);
      });
    } else {
      answerKey.forEach((answer, index) => {
        sheet.addRow([index + 1, answer, ""]);
      });
    }

    // Ajustar larguras
    sheet.getColumn(1).width = 10;
    sheet.getColumn(2).width = 18;
    sheet.getColumn(3).width = 40;
  }

  /**
   * Cria aba de estatísticas
   */
  private static async createStatisticsSheet(
    workbook: ExcelJS.Workbook,
    statistics: ExamStatistics
  ): Promise<void> {
    const sheet = workbook.addWorksheet("Estatísticas");

    // Cabeçalhos
    sheet.addRow(["Estatística", "Valor"]);

    // Formatar cabeçalho
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };

    // Dados
    sheet.addRow(["Total de Alunos", statistics.totalStudents]);
    sheet.addRow(["Média Geral", statistics.averageScore.toFixed(2)]);
    sheet.addRow(["Maior Nota", statistics.highestScore.toFixed(2)]);
    sheet.addRow(["Menor Nota", statistics.lowestScore.toFixed(2)]);

    // Ajustar larguras
    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 15;
  }

  /**
   * Cria aba de análise por questão com formatação condicional
   */
  private static async createQuestionAnalysisSheet(
    workbook: ExcelJS.Workbook,
    questionStats: Array<{
      questionNumber: number;
      correctCount: number;
      wrongCount: number;
      correctPercentage: number;
      content?: string;
    }>
  ): Promise<void> {
    const sheet = workbook.addWorksheet("Análise por Questão");

    // Cabeçalhos
    const headers = ["Questão", "Acertos", "Erros", "% Acertos", "Conteúdo"];
    sheet.addRow(headers);

    // Formatar cabeçalho
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Dados com formatação condicional
    questionStats.forEach(stat => {
      const row = sheet.addRow([
        stat.questionNumber,
        stat.correctCount,
        stat.wrongCount,
        stat.correctPercentage.toFixed(1),
        stat.content || "",
      ]);

      // Formatação condicional baseada na porcentagem
      const percentageCell = row.getCell(4); // Coluna "% Acertos"
      const percentage = stat.correctPercentage;

      if (percentage < 40) {
        // VERMELHO: Questão difícil (poucos acertos)
        percentageCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFC7CE" },
        };
        percentageCell.font = { color: { argb: "FF9C0006" }, bold: true };
      } else if (percentage >= 40 && percentage <= 70) {
        // AMARELO: Questão média
        percentageCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFE699" },
        };
        percentageCell.font = { color: { argb: "FF9C5700" }, bold: true };
      } else if (percentage > 70) {
        // VERDE: Questão fácil (muitos acertos)
        percentageCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFC6EFCE" },
        };
        percentageCell.font = { color: { argb: "FF006100" }, bold: true };
      }
    });

    // Ajustar larguras
    sheet.getColumn(1).width = 10;
    sheet.getColumn(2).width = 10;
    sheet.getColumn(3).width = 10;
    sheet.getColumn(4).width = 12;
    sheet.getColumn(5).width = 40;
  }

  /**
   * Extrai turma do objeto student (helper)
   */
  private static extractTurmaFromStudent(student: StudentData): string | null {
    // Tentar usar turma do objeto se disponível
    if ((student as any).turma) {
      return (student as any).turma;
    }
    // Fallback: tentar extrair de studentNumber
    const turmaMatch = student.studentNumber?.match(/(\d{2,3})/);
    return turmaMatch ? turmaMatch[1] : null;
  }
}
