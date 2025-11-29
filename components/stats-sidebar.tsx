"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Star,
  BarChart3,
  Brain,
  Download,
  FileText,
  Loader2
} from "lucide-react";
import {
  getEvaluationsAction,
  generatePDFReportAction,
  generateCourseAnalysisAction,
} from "@/lib/server-actions";

interface StatsSidebarProps {
  selectedCourse?: string;
}

export function StatsSidebar({ selectedCourse }: StatsSidebarProps) {
  // Estado para almacenar las estadísticas calculadas y las evaluaciones crudas
  const [stats, setStats] = useState({
    overallAverage: 0,
    totalEvaluations: 0,
    averageParticipation: 0,
    averageClarity: 0,
    averagePace: 0,
    bestAspect: "N/A",
    improvementArea: "N/A",
    thisWeekEvaluations: 0,
    weeklyProgress: 0,
  });
  
  const [rawEvaluations, setRawEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);

  // EFECTO PRINCIPAL: Cargar datos y calcular estadísticas
  useEffect(() => {
    const loadAndCalculate = async () => {
      setLoading(true);
      try {
        // 1. Traemos los datos reales de la BD
        const data = await getEvaluationsAction(selectedCourse || "all");
        setRawEvaluations(data);

        if (data.length === 0) {
          setStats({
            overallAverage: 0,
            totalEvaluations: 0,
            averageParticipation: 0,
            averageClarity: 0,
            averagePace: 0,
            bestAspect: "N/A",
            improvementArea: "N/A",
            thisWeekEvaluations: 0,
            weeklyProgress: 0,
          });
          return;
        }

        // 2. Cálculos matemáticos
        const totalPart = data.reduce((sum, e) => sum + e.participation, 0);
        const totalClar = data.reduce((sum, e) => sum + e.clarity, 0);
        const totalPace = data.reduce((sum, e) => sum + e.pace, 0);
        const count = data.length;

        const avgPart = totalPart / count;
        const avgClar = totalClar / count;
        const avgPace = totalPace / count;
        const overall = (avgPart + avgClar + avgPace) / 3;

        // Calcular mejor y peor aspecto
        const aspects = {
          "Participación": avgPart,
          "Claridad": avgClar,
          "Ritmo": avgPace
        };
        
        // Ordenamos aspectos de mayor a menor
        const sortedAspects = Object.entries(aspects).sort(([,a], [,b]) => b - a);
        const bestAspectName = sortedAspects[0][0];
        const worstAspectName = sortedAspects[sortedAspects.length - 1][0];

        // Evaluaciones de esta semana (Simulado basado en fechas reales)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const thisWeekCount = data.filter((e: any) => new Date(e.date) >= oneWeekAgo).length;

        setStats({
          overallAverage: parseFloat(overall.toFixed(1)),
          totalEvaluations: count,
          averageParticipation: parseFloat(avgPart.toFixed(1)),
          averageClarity: parseFloat(avgClar.toFixed(1)),
          averagePace: parseFloat(avgPace.toFixed(1)),
          bestAspect: bestAspectName,
          improvementArea: worstAspectName,
          thisWeekEvaluations: thisWeekCount,
          weeklyProgress: Math.min(100, (thisWeekCount / 4) * 100) // Meta de 4 por semana
        });

      } catch (error) {
        console.error("Error calculando stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAndCalculate();
  }, [selectedCourse]);

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const htmlContent = await generatePDFReportAction(rawEvaluations, stats);

      const html2pdf = (await import("html2pdf.js")).default;
      
      const element = document.createElement("div");
      element.innerHTML = htmlContent;
      element.style.width = "800px";
      
      // --- FIX DEL COLOR ---
      element.style.backgroundColor = "#ffffff";
      element.style.color = "#000000";
      // ---------------------

      const opt = {
        margin:       10, 
        filename:     `reporte-${selectedCourse || "general"}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2,
            backgroundColor: "#ffffff" // <--- FIX
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt as any).from(element).save();

    } catch (error) {
      console.error("Error generando PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // HANDLER: Generar Análisis de Curso
  const handleGenerateCourseAnalysis = async () => {
    if (!selectedCourse) return;
    setIsGeneratingAnalysis(true);
    try {
      const result = await generateCourseAnalysisAction(selectedCourse, rawEvaluations);

      if (result.success && result.analysis) {
        // Descargar como archivo de texto simple
        const blob = new Blob([result.analysis], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `analisis-ia-${selectedCourse}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error generando análisis:", error);
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Course Filter Info */}
      {selectedCourse && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-primary">
              Filtrado por curso
            </CardTitle>
            <CardDescription className="text-xs">
              Mostrando datos específicos del curso seleccionado
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Overall Average */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            {selectedCourse ? "Promedio del Curso" : "Promedio General"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-primary">
              {stats.overallAverage || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              de 5.0 estrellas
            </div>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(stats.overallAverage || 0)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-gray-200 text-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Progress - Only show for general stats */}
      {!selectedCourse && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Progreso Semanal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Evaluaciones recientes
              </span>
              <span className="font-medium">
                {stats.thisWeekEvaluations}/4
              </span>
            </div>
            <Progress value={stats.weeklyProgress} className="h-2" />
            <div className="text-xs text-muted-foreground text-center">
              {Math.round(stats.weeklyProgress)}% de tu objetivo semanal
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights with PDF Generation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Análisis IA Gemini
              </CardTitle>
              <CardDescription className="text-xs">
                Basado en {stats.totalEvaluations} evaluaciones
              </CardDescription>
            </div>
            <div className="flex gap-1">
              {selectedCourse && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateCourseAnalysis}
                  disabled={isGeneratingAnalysis || stats.totalEvaluations === 0}
                  className="h-8 w-8 p-0 bg-transparent"
                  title="Generar análisis detallado"
                >
                  {isGeneratingAnalysis ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <FileText className="h-3 w-3" />
                  )}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF || stats.totalEvaluations === 0}
                className="h-8 w-8 p-0 bg-transparent"
                title="Descargar reporte PDF"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-xs font-medium">Mejor aspecto</span>
            </div>
            <Badge
              variant="outline"
              className="text-xs bg-green-50 text-green-700 border-green-200"
            >
              {stats.bestAspect}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-3 w-3 text-orange-500" />
              <span className="text-xs font-medium">Área de mejora</span>
            </div>
            <Badge
              variant="outline"
              className="text-xs bg-orange-50 text-orange-600 border-orange-200"
            >
              {stats.improvementArea}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Estadísticas Detalladas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Total evaluaciones
            </span>
            <span className="font-semibold">{stats.totalEvaluations}</span>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
               <span>Promedio Participación</span>
               <span className="font-medium">{stats.averageParticipation}</span>
            </div>
            <Progress value={stats.averageParticipation * 20} className="h-1.5" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
               <span>Promedio Claridad</span>
               <span className="font-medium">{stats.averageClarity}</span>
            </div>
            <Progress value={stats.averageClarity * 20} className="h-1.5" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
               <span>Promedio Ritmo</span>
               <span className="font-medium">{stats.averagePace}</span>
            </div>
            <Progress value={stats.averagePace * 20} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}