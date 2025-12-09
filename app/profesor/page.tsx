"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Star,
  Calendar,
  MessageSquare,
  User,
  TrendingUp,
  TrendingDown,
  Brain,
  Download,
  BarChart3,
  GraduationCap,
  BookOpen,
  LogOut,
  Loader2,
  Trash2, // Nuevo icono para borrar
  FileText
} from "lucide-react";
import {
  getEvaluationsAction,
  generatePDFReportAction,
  generateCourseAnalysisAction,
  deleteEvaluationAction, // Importamos la acción de eliminar
} from "@/lib/server-actions";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { signOutToLogin } from "@/actions/signout.action";
import { toast } from "sonner";

// --- COMPONENTE PARA ESTRELLAS ---
function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-4 w-4",
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-none text-muted-foreground"
          )}
        />
      ))}
      <span className="text-sm text-muted-foreground ml-1">{rating}/5</span>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function ProfessorDashboard() {
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [allEvaluations, setAllEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de carga y UI
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [courseAnalysis, setCourseAnalysis] = useState("");
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // 1. CARGAR DATOS (Desde Base de Datos)
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getEvaluationsAction("all");
      setAllEvaluations(data);
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar las evaluaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 2. FILTRAR EVALUACIONES
  const filteredEvaluations = useMemo(() => {
    if (selectedCourse === "all") return allEvaluations;
    return allEvaluations.filter((ev) => ev.course === selectedCourse);
  }, [selectedCourse, allEvaluations]);

  // 3. LISTA DE CURSOS
  const coursesList = useMemo(() => {
    const coursesMap = new Map();
    allEvaluations.forEach((ev) => {
      if (!coursesMap.has(ev.course)) {
        coursesMap.set(ev.course, ev.courseName);
      }
    });
    return Array.from(coursesMap.entries()).map(([code, name]) => ({
      code,
      name,
      count: allEvaluations.filter((e) => e.course === code).length
    }));
  }, [allEvaluations]);

  // 4. CALCULAR ESTADÍSTICAS
  const stats = useMemo(() => {
    if (filteredEvaluations.length === 0) return null;

    const total = filteredEvaluations.length;
    const avgPart = filteredEvaluations.reduce((a, b) => a + b.participation, 0) / total;
    const avgClar = filteredEvaluations.reduce((a, b) => a + b.clarity, 0) / total;
    const avgPace = filteredEvaluations.reduce((a, b) => a + b.pace, 0) / total;
    const overall = (avgPart + avgClar + avgPace) / 3;

    const aspects = { "Participación": avgPart, "Claridad": avgClar, "Ritmo": avgPace };
    const sortedAspects = Object.entries(aspects).sort(([,a], [,b]) => b - a);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeekCount = filteredEvaluations.filter(e => new Date(e.date) >= oneWeekAgo).length;

    return {
      overallAverage: parseFloat(overall.toFixed(1)),
      totalEvaluations: total,
      averageParticipation: parseFloat(avgPart.toFixed(1)),
      averageClarity: parseFloat(avgClar.toFixed(1)),
      averagePace: parseFloat(avgPace.toFixed(1)),
      bestAspect: sortedAspects[0][0],
      improvementArea: sortedAspects[sortedAspects.length - 1][0],
      thisWeekEvaluations: thisWeekCount,
      weeklyProgress: Math.min(100, (thisWeekCount / 4) * 100)
    };
  }, [filteredEvaluations]);

  // --- ACCIONES ---

  // ELIMINAR EVALUACIÓN
  const handleDeleteEvaluation = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta evaluación?")) return;
    setIsDeleting(id);
    try {
      const result = await deleteEvaluationAction(id);
      if (result.success) {
        toast.success("Evaluación eliminada correctamente");
        setAllEvaluations(prev => prev.filter(ev => ev.id !== id));
      } else {
        toast.error("Error al eliminar");
      }
    } catch (e) {
      toast.error("Error inesperado");
    } finally {
      setIsDeleting(null);
    }
  };

  // GENERAR PDF (CON FIX DE COLORES)
  const handleGeneratePDF = async () => {
    if (!stats) return;
    setIsGeneratingPDF(true);
    try {
      const htmlContent = await generatePDFReportAction(filteredEvaluations, stats);
      const html2pdf = (await import("html2pdf.js")).default;

      const element = document.createElement("div");
      element.innerHTML = htmlContent;
      element.style.width = "800px"; 
      
      // FIX: Forzar colores estándar (Blanco/Negro)
      element.style.backgroundColor = "#ffffff"; 
      element.style.color = "#000000";

      const opt = {
        margin: 10, 
        filename: `reporte-${selectedCourse}-${new Date().toISOString().split("T")[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: "#ffffff" },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt as any).from(element).save();
      toast.success("Reporte PDF descargado");

    } catch (error) {
      console.error("Error PDF:", error);
      toast.error("Error al generar PDF. Revisa la consola.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ANÁLISIS IA
  const handleGenerateCourseAnalysis = async () => {
    if (selectedCourse === "all") {
      setCourseAnalysis("Por favor selecciona un curso específico.");
      return;
    }
    setIsGeneratingAnalysis(true);
    try {
      const result = await generateCourseAnalysisAction(selectedCourse, filteredEvaluations);
      if (result.success && result.analysis) {
        setCourseAnalysis(result.analysis);
        toast.success("Análisis generado");
      }
    } catch (error) {
      toast.error("Error de conexión con IA");
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  const getSelectedCourseName = () => {
    if (selectedCourse === "all") return "Todos los Cursos";
    return coursesList.find(c => c.code === selectedCourse)?.name || "Curso Seleccionado";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-balance">Panel del Docente</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Revise las evaluaciones de sus estudiantes y análisis de IA
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF || filteredEvaluations.length === 0}
              >
                {isGeneratingPDF ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</>
                ) : (
                  <><Download className="mr-2 h-4 w-4" /> Descargar Reporte</>
                )}
              </Button>
              <Button onClick={signOutToLogin} variant={"destructive"} size="icon">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Selector de Curso */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Seleccionar Curso
                </CardTitle>
                <CardDescription>
                  Elija el curso para ver las evaluaciones específicas de sus estudiantes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex-1 min-w-[300px]">
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Selecciona un curso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center justify-between w-full">
                            <span>Todos mis cursos</span>
                            <Badge variant="secondary" className="ml-2">{allEvaluations.length}</Badge>
                          </div>
                        </SelectItem>
                        {coursesList.map((course) => (
                          <SelectItem key={course.code} value={course.code}>
                            <div className="flex items-center justify-between w-full">
                              <span className="truncate max-w-[250px]">{course.name}</span>
                              <Badge variant="secondary" className="ml-2 flex-shrink-0">{course.count}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>{filteredEvaluations.length} evaluaciones visibles</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estadísticas Principales */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-blue-700 flex items-center gap-2">
                      <Star className="h-4 w-4" /> Promedio General
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-800">{stats.overallAverage}</div>
                    <div className="text-sm text-blue-600">de 5.0 estrellas</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-green-700 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" /> Total Evaluaciones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-800">{stats.totalEvaluations}</div>
                    <div className="text-sm text-green-600">
                      {selectedCourse === "all" ? "en todos los cursos" : "en este curso"}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-purple-700 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Recientes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-800">{stats.thisWeekEvaluations}</div>
                    <div className="text-sm text-purple-600">esta semana</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Análisis de IA */}
            {selectedCourse !== "all" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        Análisis IA Gemini - {getSelectedCourseName()}
                      </CardTitle>
                      <CardDescription>
                        Análisis detallado basado en las evaluaciones recibidas
                      </CardDescription>
                    </div>
                    <Button
                      onClick={handleGenerateCourseAnalysis}
                      disabled={isGeneratingAnalysis}
                      size="sm"
                    >
                      {isGeneratingAnalysis ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</>
                      ) : (
                        <><Brain className="mr-2 h-4 w-4" /> Generar Análisis</>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {courseAnalysis ? (
                    <div className="bg-muted/50 rounded-lg p-4 border border-primary/10">
                      <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                        {courseAnalysis}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Haga clic en "Generar Análisis" para obtener recomendaciones.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pestañas: Evaluaciones y Estadísticas */}
            <Tabs defaultValue="evaluations" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="evaluations">Evaluaciones de Estudiantes</TabsTrigger>
                <TabsTrigger value="statistics">Estadísticas Detalladas</TabsTrigger>
              </TabsList>

              <TabsContent value="evaluations" className="space-y-4">
                {filteredEvaluations.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Star className="h-12 w-12 mb-4 opacity-20" />
                      <p>No hay evaluaciones para mostrar.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredEvaluations.map((ev: any) => (
                      <Card key={ev.id} className="group hover:shadow-md transition-all relative">
                        {/* BOTÓN ELIMINAR */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-8 w-8 shadow-sm"
                            onClick={() => handleDeleteEvaluation(ev.id)}
                            disabled={isDeleting === ev.id}
                            title="Eliminar evaluación"
                          >
                            {isDeleting === ev.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>

                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="space-y-3 flex-1">
                              <div>
                                <h3 className="font-semibold text-lg">{ev.courseName}</h3>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(ev.date).toLocaleDateString("es-ES")}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {ev.studentName}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <span className="text-xs font-medium">Participación</span>
                                  <StarDisplay rating={ev.participation} />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-xs font-medium">Claridad</span>
                                  <StarDisplay rating={ev.clarity} />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-xs font-medium">Ritmo</span>
                                  <StarDisplay rating={ev.pace} />
                                </div>
                              </div>

                              {ev.comments && (
                                <div className="bg-muted/30 rounded-lg p-3 flex items-start gap-2">
                                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <p className="text-sm text-muted-foreground italic">"{ev.comments}"</p>
                                </div>
                              )}
                            </div>

                            {ev.aiAnalysis && (
                              <div className="md:w-72 bg-blue-50/50 rounded-lg p-3 border border-blue-100 h-fit">
                                <div className="flex items-center gap-2 mb-2">
                                  <Brain className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium text-xs text-blue-700">Análisis Rápido IA</span>
                                </div>
                                <p className="text-xs text-blue-900 leading-relaxed">{ev.aiAnalysis}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="statistics" className="space-y-6">
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader><CardTitle>Distribución de Calificaciones</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm"><span>Participación</span><span className="font-medium">{stats.averageParticipation}/5</span></div>
                          <Progress value={stats.averageParticipation * 20} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm"><span>Claridad</span><span className="font-medium">{stats.averageClarity}/5</span></div>
                          <Progress value={stats.averageClarity * 20} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm"><span>Ritmo</span><span className="font-medium">{stats.averagePace}/5</span></div>
                          <Progress value={stats.averagePace * 20} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardTitle>Resumen de Desempeño</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" /><span className="text-sm font-medium">Mejor Aspecto</span></div>
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">{stats.bestAspect}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                          <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-orange-600" /><span className="text-sm font-medium">Área de Mejora</span></div>
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">{stats.improvementArea}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Resumen Rápido */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Resumen General</CardTitle></CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">{stats?.overallAverage || 0}</div>
                <div className="flex justify-center mb-2">
                  <StarDisplay rating={Math.round(stats?.overallAverage || 0)} />
                </div>
                <p className="text-sm text-muted-foreground">Calificación promedio</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Mis Cursos</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <div
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedCourse === "all" ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"}`}
                  onClick={() => setSelectedCourse("all")}
                >
                  <div>
                    <p className="font-medium text-sm">Todos los Cursos</p>
                    <p className="text-xs text-muted-foreground">{allEvaluations.length} evaluaciones</p>
                  </div>
                </div>
                {coursesList.map((c) => (
                  <div
                    key={c.code}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedCourse === c.code ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"}`}
                    onClick={() => setSelectedCourse(c.code)}
                  >
                    <div>
                      <p className="font-medium text-sm truncate w-40">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.count} evaluaciones</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}