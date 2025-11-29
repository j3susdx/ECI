"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Calendar, MessageSquare, User, Loader2, GraduationCap } from "lucide-react"; // Agregamos GraduationCap
import { cn } from "@/lib/utils";
import { getEvaluationsAction } from "@/lib/server-actions";

function StarDisplay({ rating }: { rating: number }) {
  return <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={cn("h-3 w-3", s<=rating?"fill-yellow-400 text-yellow-400":"text-gray-200")} />)}</div>;
}

export function RecentEvaluations({ selectedCourse }: { selectedCourse?: string }) {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getEvaluationsAction(selectedCourse || "all").then(setEvaluations).finally(() => setLoading(false));
  }, [selectedCourse]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin h-6 w-6 text-primary"/></div>;
  if (evaluations.length === 0) return <Card><CardContent className="py-10 text-center text-muted-foreground">No hay evaluaciones.</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{selectedCourse ? "Evaluaciones del Curso" : "Recientes"}</CardTitle>
        <CardDescription>{evaluations.length} opiniones registradas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {evaluations.slice(0, 10).map((ev) => (
          <div key={ev.id} className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
            <div className="space-y-1">
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-sm">{ev.courseName}</h4>
                <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                   <GraduationCap className="h-3 w-3" /> 
                   {/* AQUÍ SE MUESTRA EL DOCENTE */}
                   <span>{ev.professorName}</span>
                </div>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/> {new Date(ev.date).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><User className="h-3 w-3"/> {ev.studentName}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
               <div><span className="text-muted-foreground">Part</span> <StarDisplay rating={ev.participation}/></div>
               <div><span className="text-muted-foreground">Clar</span> <StarDisplay rating={ev.clarity}/></div>
               <div><span className="text-muted-foreground">Ritmo</span> <StarDisplay rating={ev.pace}/></div>
            </div>

            {ev.comments && <div className="flex gap-2 text-xs bg-muted/30 p-2 rounded"><MessageSquare className="h-3 w-3 mt-0.5 text-muted-foreground"/> <span className="italic text-muted-foreground">"{ev.comments}"</span></div>}
            {ev.aiAnalysis && <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100"><strong>IA:</strong> {ev.aiAnalysis}</div>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}