"use client"

import { useState, useEffect } from "react" // Importamos useEffect
import { EvaluationForm } from "@/components/evaluation-form"
import { RecentEvaluations } from "@/components/recent-evaluations"
import { StatsSidebar } from "@/components/stats-sidebar"
import { CourseAnalysis } from "@/components/course-analysis" 
import { GraduationCap, Menu, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { evaluateClassAction, getAllCoursesAction } from "@/lib/server-actions" // Importamos getAllCoursesAction
import { signOutToLogin } from "@/actions/signout.action"
import { toast } from "sonner"

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedCourse, setSelectedCourse] = useState("")
  
  // ESTADO PARA CURSOS REALES
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // 1. Cargar cursos reales al entrar
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const result = await getAllCoursesAction();
        if (result.success && result.courses) {
          setCourses(result.courses);
        }
      } catch (error) {
        console.error("Error cargando cursos");
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  const handleEvaluationSubmit = async (data: any) => {
    try {
      // Buscamos el nombre real del curso en nuestra lista descargada
      const selectedCourseObj = courses.find(c => c.code === data.course);
      const courseNameReal = selectedCourseObj ? selectedCourseObj.name : data.course;

      const result = await evaluateClassAction({
        course: data.course,
        courseName: courseNameReal, // Usamos el nombre real de la BD
        participation: data.participation,
        clarity: data.clarity,
        pace: data.pace,
        comments: data.comments,
        studentName: data.studentName,
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to process evaluation")
      }

      toast.success("Evaluación enviada correctamente")
      setRefreshKey((prev) => prev + 1)
      
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al enviar")
    }
  }

  const handleCourseChange = (course: string) => {
    setSelectedCourse(course)
    setRefreshKey((prev) => prev + 1)
  }

  if (loadingCourses) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 w-full">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex justify-between w-full items-center">
                <div>
                  <h1 className="text-xl font-bold text-balance">Evaluador de Clases</h1>
                  <p className="text-sm text-muted-foreground hidden sm:block">
                    Mejora la calidad educativa con evaluaciones en tiempo real
                  </p>
                </div>
                <Button onClick={signOutToLogin} variant="destructive" size="sm">
                  Cerrar Sesión
                </Button>
              </div>
            </div>

            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden ml-2">
                <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="mt-6">
                  <StatsSidebar key={`sidebar-${refreshKey}`} selectedCourse={selectedCourse} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            {/* Pasamos la lista de cursos reales al formulario */}
            <EvaluationForm
              onSubmit={handleEvaluationSubmit}
              selectedCourse={selectedCourse}
              onCourseChange={handleCourseChange}
              coursesList={courses} // <--- NUEVA PROP
            />

            <Tabs defaultValue="recent" className="w-full">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="recent">Evaluaciones Recientes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="recent" className="space-y-4">
                <RecentEvaluations key={`evaluations-${refreshKey}`} selectedCourse={selectedCourse} />
              </TabsContent>
              
              
            </Tabs>
          </div>

          <div className="hidden lg:block">
            <StatsSidebar key={`sidebar-desktop-${refreshKey}`} selectedCourse={selectedCourse} />
          </div>
        </div>
      </div>
    </div>
  )
}