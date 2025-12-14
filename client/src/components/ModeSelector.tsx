import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { School, GraduationCap, FileText, Settings } from "lucide-react";

export type AppMode = "selector" | "escola" | "enem";

interface ModeSelectorProps {
  onSelect: (mode: "escola" | "enem") => void;
}

export function ModeSelector({ onSelect }: ModeSelectorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            GabaritAI
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Selecione o modo de trabalho
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* PROVAS DA ESCOLA */}
          <Card
            className="cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-2 hover:border-green-500 bg-white dark:bg-slate-800"
            onClick={() => onSelect("escola")}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 p-4 bg-green-100 dark:bg-green-900/30 rounded-full w-fit">
                <School className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl text-green-700 dark:text-green-400">
                Provas da Escola
              </CardTitle>
              <CardDescription className="text-base">
                Configure provas personalizadas com suas disciplinas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <FileText className="h-4 w-4 text-green-500" />
                  Quantidade de questões livre (5 a 180)
                </li>
                <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Settings className="h-4 w-4 text-green-500" />
                  Disciplinas totalmente customizadas
                </li>
                <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <FileText className="h-4 w-4 text-green-500" />
                  Nota máxima configurável (10, 100, etc.)
                </li>
                <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <FileText className="h-4 w-4 text-green-500" />
                  TRI adaptado por interpolação
                </li>
                <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <FileText className="h-4 w-4 text-green-500" />
                  Usa o mesmo cartão de respostas
                </li>
              </ul>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Ideal para provas bimestrais, simulados internos e avaliações personalizadas
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ENEM */}
          <Card
            className="cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-2 hover:border-blue-500 bg-white dark:bg-slate-800"
            onClick={() => onSelect("enem")}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full w-fit">
                <GraduationCap className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl text-blue-700 dark:text-blue-400">
                ENEM
              </CardTitle>
              <CardDescription className="text-base">
                Simulados no padrão oficial do ENEM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Dia 1: Linguagens + Ciências Humanas
                </li>
                <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Dia 2: Natureza + Matemática
                </li>
                <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <FileText className="h-4 w-4 text-blue-500" />
                  TRI oficial (tabela ENEM)
                </li>
                <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <FileText className="h-4 w-4 text-blue-500" />
                  45 questões por área
                </li>
                <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Merge automático Dia 1 + Dia 2
                </li>
              </ul>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Formato oficial do ENEM com LC, CH, CN e MT
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500 dark:text-slate-400">
          Você pode trocar de modo a qualquer momento
        </div>
      </div>
    </div>
  );
}
