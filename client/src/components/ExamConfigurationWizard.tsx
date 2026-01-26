import { useState, useCallback } from "react";
import { Plus, Trash2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ExamConfiguration, ExamDiscipline } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface ExamConfigurationWizardProps {
  onSave: (config: ExamConfiguration) => void;
  onCancel: () => void;
  userId: string;
}

const COLORS = [
  "#FF6B6B", // Vermelho
  "#4ECDC4", // Turquesa
  "#FFE66D", // Amarelo
  "#95E1D3", // Menta
  "#C7CEEA", // Lavanda
  "#FF8B94", // Rosa
  "#B4A7D6", // Roxo
  "#FFB4B4", // Rosa pálida
];

export function ExamConfigurationWizard({
  onSave,
  onCancel,
  userId,
}: ExamConfigurationWizardProps) {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [alternativesCount, setAlternativesCount] = useState<4 | 5>(5);
  const [maxScoreTCT, setMaxScoreTCT] = useState(10.0);
  const [usesTRI, setUsesTRI] = useState(false);
  const [usesAdjustedTRI, setUsesAdjustedTRI] = useState(false);
  const [disciplines, setDisciplines] = useState<ExamDiscipline[]>([
    {
      id: "1",
      name: "Disciplina 1",
      startQuestion: 1,
      endQuestion: 10,
      color: COLORS[0],
    },
  ]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Validações
  const getQuestionsInUse = useCallback(() => {
    const used = new Set<number>();
    for (const disc of disciplines) {
      for (let i = disc.startQuestion; i <= disc.endQuestion; i++) {
        used.add(i);
      }
    }
    return used;
  }, [disciplines]);

  const questionsInUse = getQuestionsInUse();
  const uncoveredQuestions = Array.from({ length: totalQuestions }, (_, i) => i + 1).filter(
    (q) => !questionsInUse.has(q)
  );

  const hasOverlap = (() => {
    const seen = new Set<number>();
    for (const disc of disciplines) {
      for (let i = disc.startQuestion; i <= disc.endQuestion; i++) {
        if (seen.has(i)) return true;
        seen.add(i);
      }
    }
    return false;
  })();

  const isCoverageComplete = questionsInUse.size === totalQuestions && !hasOverlap;

  // Adicionar disciplina
  const handleAddDiscipline = () => {
    const lastEnd = disciplines[disciplines.length - 1]?.endQuestion || 0;
    const newDisc: ExamDiscipline = {
      id: Date.now().toString(),
      name: `Disciplina ${disciplines.length + 1}`,
      startQuestion: Math.min(lastEnd + 1, totalQuestions),
      endQuestion: Math.min(lastEnd + 10, totalQuestions),
      color: COLORS[disciplines.length % COLORS.length],
    };
    setDisciplines([...disciplines, newDisc]);
  };

  // Atualizar disciplina
  const handleUpdateDiscipline = (id: string, updates: Partial<ExamDiscipline>) => {
    setDisciplines(
      disciplines.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  // Deletar disciplina
  const handleDeleteDiscipline = (id: string) => {
    setDisciplines(disciplines.filter((d) => d.id !== id));
    setShowDeleteConfirm(null);
  };

  // Salvar configuração
  const handleSave = async () => {
    // Validações básicas
    if (!name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da prova é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (name.length < 3) {
      toast({
        title: "Erro",
        description: "Nome deve ter no mínimo 3 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (disciplines.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos uma disciplina",
        variant: "destructive",
      });
      return;
    }

    if (hasOverlap) {
      toast({
        title: "Erro",
        description: "Detectada sobreposição entre disciplinas",
        variant: "destructive",
      });
      return;
    }

    if (!isCoverageComplete) {
      toast({
        title: "Erro",
        description: `Todas as questões devem ser alocadas. Questões não alocadas: ${uncoveredQuestions.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const config: ExamConfiguration = {
        userId,
        name,
        totalQuestions,
        alternativesCount,
        maxScoreTCT,
        usesTRI,
        usesAdjustedTRI,
        disciplines,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch("/api/exam-configurations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar configuração");
      }

      const result = await response.json();

      toast({
        title: "Sucesso!",
        description: `Configuração "${name}" criada com sucesso!`,
      });

      // Retornar a configuração completa com o ID
      onSave({ ...config, id: result.id });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configuração",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Prova *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Prova de Português - 1º Trimestre"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalQuestions">Total de Questões *</Label>
              <Input
                id="totalQuestions"
                type="number"
                min={5}
                max={500}
                value={totalQuestions}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 5;
                  setTotalQuestions(Math.max(5, Math.min(500, value)));
                }}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="alternatives">Alternativas por Questão *</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md border hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="alternativesCount"
                    checked={alternativesCount === 4}
                    onChange={() => setAlternativesCount(4)}
                    className="h-4 w-4"
                  />
                  <span className="font-medium">4 alternativas (A-D)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md border hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="alternativesCount"
                    checked={alternativesCount === 5}
                    onChange={() => setAlternativesCount(5)}
                    className="h-4 w-4"
                  />
                  <span className="font-medium">5 alternativas (A-E)</span>
                </label>
              </div>
              {/* Visualização das alternativas disponíveis */}
              <div className="flex gap-2 mt-3 items-center">
                <span className="text-sm text-muted-foreground">Opções disponíveis:</span>
                <div className="flex gap-1">
                  {["A", "B", "C", "D", "E"].map((letter, idx) => (
                    <div
                      key={letter}
                      className={`w-8 h-8 rounded-md border-2 flex items-center justify-center font-bold text-sm transition-all ${
                        idx < alternativesCount
                          ? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-950 dark:border-blue-400 dark:text-blue-300"
                          : "bg-gray-100 border-gray-300 text-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-500 opacity-50"
                      }`}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {totalQuestions < 10 && (
            <div className="flex gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Menos de 10 questões: TRI terá BAIXA confiabilidade</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuração de Avaliação */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração de Avaliação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="maxScore">Nota Máxima (TCT) *</Label>
            <Input
              id="maxScore"
              type="number"
              step={0.1}
              min={0.5}
              max={100}
              value={maxScoreTCT}
              onChange={(e) => setMaxScoreTCT(parseFloat(e.target.value) || 10.0)}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Ex: 10.0 (padrão), 2.5 (trabalho), 100 (vestibular)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={usesTRI} onCheckedChange={setUsesTRI} />
            <Label htmlFor="usesTRI">Usar análise TRI (Teoria de Resposta ao Item)</Label>
          </div>

          {usesTRI && (
            <div className="ml-6 flex items-center gap-3">
              <Switch checked={usesAdjustedTRI} onCheckedChange={setUsesAdjustedTRI} />
              <Label>Ajustar TRI para número de questões (interpolar tabela ENEM)</Label>
            </div>
          )}

          {usesTRI && totalQuestions < 20 && (
            <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Com {totalQuestions} questões, a escala TRI terá confiabilidade moderada. Recomendamos 20+ questões.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disciplinas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Divisão por Disciplinas</CardTitle>
          <div className="text-sm text-muted-foreground">
            Cobertura: {questionsInUse.size}/{totalQuestions}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de disciplinas */}
          <div className="space-y-3">
            {disciplines.map((disc) => (
              <div
                key={disc.id}
                className="flex items-end gap-3 p-3 border rounded-md bg-gray-50"
              >
                <div className="flex-1">
                  <Label className="text-xs">Nome da Disciplina</Label>
                  <Input
                    value={disc.name}
                    onChange={(e) =>
                      handleUpdateDiscipline(disc.id, { name: e.target.value })
                    }
                    placeholder="Ex: Matemática"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Questão Inicial</Label>
                  <Input
                    type="number"
                    min={1}
                    max={totalQuestions}
                    value={disc.startQuestion}
                    onChange={(e) =>
                      handleUpdateDiscipline(disc.id, {
                        startQuestion: parseInt(e.target.value) || 1,
                      })
                    }
                    className="mt-1 w-24"
                  />
                </div>

                <div>
                  <Label className="text-xs">Questão Final</Label>
                  <Input
                    type="number"
                    min={1}
                    max={totalQuestions}
                    value={disc.endQuestion}
                    onChange={(e) =>
                      handleUpdateDiscipline(disc.id, {
                        endQuestion: parseInt(e.target.value) || totalQuestions,
                      })
                    }
                    className="mt-1 w-24"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded border cursor-pointer"
                    style={{ backgroundColor: disc.color }}
                    onClick={() => {
                      const currentIndex = COLORS.indexOf(disc.color!);
                      const nextColor = COLORS[(currentIndex + 1) % COLORS.length];
                      handleUpdateDiscipline(disc.id, { color: nextColor });
                    }}
                    title="Clique para mudar a cor"
                  />
                  <AlertDialog open={showDeleteConfirm === disc.id} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(disc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deletar disciplina?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja deletar a disciplina "{disc.name}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteDiscipline(disc.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Deletar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>

          {/* Botão adicionar */}
          <Button
            variant="outline"
            onClick={handleAddDiscipline}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Disciplina
          </Button>

          {/* Avisos de validação */}
          {hasOverlap && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Sobreposição detectada entre disciplinas!</span>
            </div>
          )}

          {uncoveredQuestions.length > 0 && (
            <div className="flex gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Questões não alocadas: {uncoveredQuestions.join(", ")}</span>
            </div>
          )}

          {isCoverageComplete && (
            <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>✅ Todas as questões estão alocadas corretamente!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botões de ação */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isCoverageComplete || isSaving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? "Salvando..." : "Salvar Configuração"}
        </Button>
      </div>
    </div>
  );
}
