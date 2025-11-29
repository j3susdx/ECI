"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, Loader2, AlertCircle } from "lucide-react";
import { 
  getEvaluationsAction, 
  generateCourseAnalysisAction 
} from "@/lib/server-actions";

interface CourseAnalysisProps {
  selectedCourse?: string;
}

export function CourseAnalysis({ selectedCourse }: CourseAnalysisProps) {
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [evaluations, setEvaluations] = useState<any[]>([]);

  // 1. Cargar datos y calcular estadísticas cuando cambia el curso
  useEffect(() => {
    const loadCourseData = async () => {
      if (!selectedCourse) return;
      
      setLoadingData(true);
      try {
        // Traer evaluaciones reales de la BD
        const data = await getEvaluationsAction(selectedCourse);
        setEvaluations(data);

        if (data.length > 0) {
          // Calcular estadísticas matemáticas
          const total = data.length;
          const sumP = data.reduce((acc, curr) => acc + curr.participation, 0);
          const sumC = data.reduce((acc, curr) => acc + curr.clarity, 0);
          const sumR = data.reduce((acc, curr) => acc + curr.pace, 0);

          const avgP = sumP / total;
          const avgC = sumC / total;
          const avgR = sumR / total;
          const overall = (avgP + avgC + avgR) / 3;

          setStats({
            totalEvaluations: total,
            overallAverage: overall.toFixed(1),
            averageParticipation: avgP.toFixed(1),
            averageClarity: avgC.toFixed(1),
            averagePace: avgR.toFixed(1),
            courseName: data[0].courseName // Tomamos el nombre del primer registro
          });
        } else {
          setStats(null);
        }
        // Limpiar análisis anterior al cambiar curso
        setAnalysisResult("");
      } catch (error) {
        console.error("Error cargando curso:", error);
      } finally {
        setLoadingData(false);
      }
    };

    loadCourseData();
  }, [selectedCourse]);

  // 2. Generar Análisis con IA
  const handleGenerateAnalysis = async () => {
    if (!selectedCourse || evaluations.length === 0) return;

    setIsGenerating(true);
    try {
      const result = await generateCourseAnalysisAction(selectedCourse, evaluations);

      if (result.success && result.analysis) {
        setAnalysisResult(result.analysis);
      }
    } catch (error) {
      console.error("Error generating analysis:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- RENDERIZADO ---

  if (!selectedCourse) {
    return (
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BookOpen className="h-10 w-10 mb-2 opacity-20" />
          <p>Selecciona un curso arriba para ver el análisis.</p>
        </CardContent>
      </Card>
    );
  }

  if (loadingData) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  if (!stats || evaluations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Análisis del Curso
          </CardTitle>
          <CardDescription>
            Análisis detallado del curso seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">No hay datos suficientes</h3>
            <p className="text-sm text-muted-foreground">
              Se necesitan evaluaciones para generar análisis del curso.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Análisis del Curso
              </CardTitle>
              <CardDescription>
                {stats.courseName}
              </CardDescription>
            </div>
            <Button
              onClick={handleGenerateAnalysis}
              disabled={isGenerating}
              size="sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Generar Análisis IA
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Grid de Estadísticas (Tu diseño original) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {stats.totalEvaluations}
              </div>
              <div className="text-xs text-muted-foreground uppercase font-medium mt-1">
                Evaluaciones
              </div>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {stats.overallAverage}
              </div>
              <div className="text-xs text-muted-foreground uppercase font-medium mt-1">Promedio</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="text-2xl font-bold text-green-700">
                {stats.averageParticipation}
              </div>
              <div className="text-xs text-green-800 uppercase font-medium mt-1">
                Participación
              </div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="text-2xl font-bold text-green-700">
                {stats.averageClarity}
              </div>
              <div className="text-xs text-green-800 uppercase font-medium mt-1">Claridad</div>
            </div>
          </div>

          {/* Resultado del Análisis IA */}
          {analysisResult && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-5 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 mb-3 text-blue-700">
                <Brain className="h-5 w-5" />
                <span className="font-semibold text-sm">
                  Análisis Inteligente Gemini
                </span>
              </div>
              <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                {analysisResult}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}