"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Star, Mic, MicOff, Send, Loader2, Volume2, GraduationCap, LogOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { evaluateClassAction, getAllCoursesAction } from "@/lib/server-actions";
import { signOutToLogin } from "@/actions/signout.action";
import Avatar3D from "@/components/Avatar3D";

// Subcomponente Estrellas
function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={cn(
              "transition-all duration-200 hover:scale-110 active:scale-95",
              star <= value ? "text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" : "text-slate-700 hover:text-slate-500"
            )}
          >
            <Star className={cn("h-8 w-8", star <= value ? "fill-current" : "")} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function StudentPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [ratings, setRatings] = useState({ participation: 0, clarity: 0, pace: 0 });
  const [comment, setComment] = useState("");

  const [isListening, setIsListening] = useState(false);
  const [isAvatarTalking, setIsAvatarTalking] = useState(false);
  const [aiResponse, setAiResponse] = useState("");

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
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // --- MICRÓFONO (Compatible con Opera/Chrome) ---
  const toggleMic = () => {
    if (!("webkitSpeechRecognition" in window)) {
      toast.error("Tu navegador no soporta voz. Intenta con Chrome o Edge.");
      return;
    }

    if (isListening) {
      window.speechSynthesis.cancel();
      setIsListening(false);
      return;
    }

    // @ts-ignore
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "es-ES";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Te escucho... habla ahora.");
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join("");

      if (event.results[0].isFinal) {
        setComment((prev) => prev + (prev ? " " : "") + transcript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error("No pude escucharte bien.");
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  // --- HABLA DEL AVATAR ---
  const speakResponse = (text: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.rate = 1.1;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsAvatarTalking(true);
    utterance.onend = () => setIsAvatarTalking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = async () => {
    if (!selectedCourse) return toast.error("Selecciona un curso primero");
    if (!ratings.participation || !ratings.clarity || !ratings.pace) return toast.error("Completa las estrellas");
    if (!comment) return toast.error("Dime tu opinión");

    setIsSubmitting(true);

    const courseObj = courses.find(c => c.code === selectedCourse);
    const courseNameReal = courseObj ? courseObj.name : selectedCourse;

    try {
      const result = await evaluateClassAction({
        course: selectedCourse,
        courseName: courseNameReal,
        ...ratings,
        comments: comment,
        studentName: "Estudiante",
      });

      if (result.success) {
        toast.success("¡Enviado!");

        // Manejo seguro de la respuesta de IA
        const summaryText = result.insights?.summary || "Evaluación registrada correctamente.";
        setAiResponse(summaryText);
        speakResponse(`Gracias. He registrado tu evaluación. ${summaryText}`);

        setComment("");
        setRatings({ participation: 0, clarity: 0, pace: 0 });
      } else {
        toast.error(result.error || "Error al enviar");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2" /> Cargando entorno 3D...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">

      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg"><GraduationCap className="h-6 w-6 text-white" /></div>
            <h1 className="text-xl font-bold hidden md:block">Asistente de Evaluación IA</h1>
          </div>
          <Button onClick={signOutToLogin} variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800">
            <LogOut className="h-5 w-5 mr-2" /> Salir
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">

          {/* AVATAR */}
          <div className="flex flex-col space-y-6 lg:sticky lg:top-24 order-1">
            <div className="relative group perspective-1000">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>

              <div className="relative transform transition-transform duration-500 hover:scale-[1.01]">
                <Avatar3D isTalking={isAvatarTalking} />
              </div>

              {aiResponse && (
                <div className="absolute -bottom-10 left-4 right-4 z-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="bg-slate-800/90 backdrop-blur-xl border border-blue-500/40 p-5 rounded-2xl shadow-2xl relative">
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-800 rotate-45 border-t border-l border-blue-500/40"></div>
                    <div className="flex items-center gap-2 mb-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                      <Volume2 className="h-3 w-3 animate-pulse" /> Análisis en tiempo real
                    </div>
                    <p className="text-slate-200 text-lg font-light leading-relaxed">"{aiResponse}"</p>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center space-y-2 opacity-70">
              <h2 className="text-2xl font-light text-white">Hola, Estudiante</h2>
              <p className="text-sm text-slate-400">"Soy tu asistente IA. Cuéntame qué te pareció la clase de hoy."</p>
            </div>
          </div>

          {/* FORMULARIO */}
          <div className="flex flex-col justify-center h-full order-2">
            <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

              <CardHeader className="pb-4">
                <CardTitle className="text-3xl text-white font-bold">Nueva Evaluación</CardTitle>
                <CardDescription className="text-slate-400 text-base">
                  Completa los datos. Puedes escribir o <span className="text-blue-400 font-semibold">hablarle al avatar</span>.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-8">

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-300 ml-1 uppercase tracking-wider">Materia</label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white h-14 text-lg focus:ring-blue-500/50">
                      <SelectValue placeholder="Selecciona un curso..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      {courses.map((c) => (
                        <SelectItem key={c.code} value={c.code} className="text-base py-3 focus:bg-slate-700 focus:text-white">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 bg-slate-800/30 rounded-2xl border border-slate-800/60">
                  <StarRating label="Participación" value={ratings.participation} onChange={(v) => setRatings({ ...ratings, participation: v })} />
                  <StarRating label="Claridad" value={ratings.clarity} onChange={(v) => setRatings({ ...ratings, clarity: v })} />
                  <StarRating label="Ritmo" value={ratings.pace} onChange={(v) => setRatings({ ...ratings, pace: v })} />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-semibold text-slate-300 ml-1 uppercase tracking-wider">Tu Opinión</label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={toggleMic}
                      className={cn(
                        "text-xs uppercase tracking-wide font-bold transition-all duration-300 border",
                        isListening
                          ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 animate-pulse"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                      )}
                    >
                      {isListening ? (
                        <><MicOff className="mr-2 h-4 w-4" /> Detener Escucha</>
                      ) : (
                        <><Mic className="mr-2 h-4 w-4" /> Activar Voz</>
                      )}
                    </Button>
                  </div>

                  <div className="relative group">
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={isListening ? "Te estoy escuchando..." : "Escribe aquí o usa el micrófono para dictarle al avatar..."}
                      className={cn(
                        "bg-slate-800/50 border-slate-700 text-white min-h-[160px] resize-none text-lg p-5 transition-all duration-300 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 placeholder:text-slate-600",
                        isListening && "border-blue-500/60 ring-2 ring-blue-500/30 bg-blue-900/10"
                      )}
                    />
                    {isListening && (
                      <div className="absolute bottom-4 right-4 flex gap-1.5">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></span>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-7 text-xl rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] hover:shadow-blue-500/20"
                >
                  {isSubmitting ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <Send className="mr-3 h-6 w-6" />}
                  {isSubmitting ? "Analizando con IA..." : "Enviar Evaluación"}
                </Button>

              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}