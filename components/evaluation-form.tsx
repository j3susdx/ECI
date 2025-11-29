"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { StarRating } from "./star-rating" // Tu componente de estrellas existente
import { Loader2, CheckCircle } from "lucide-react"
import { useState, useEffect } from "react"

const formSchema = z.object({
  course: z.string().min(1, "Selecciona un curso"),
  studentName: z.string().min(2, "Nombre requerido"),
  participation: z.number().min(1),
  clarity: z.number().min(1),
  pace: z.number().min(1),
  comments: z.string().min(5),
})

interface EvaluationFormProps {
  onSubmit: (data: any) => Promise<void>;
  selectedCourse: string;
  onCourseChange: (course: string) => void;
  coursesList: any[]; // Recibimos la lista
}

export function EvaluationForm({ onSubmit, selectedCourse, onCourseChange, coursesList = [] }: EvaluationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { course: selectedCourse || "", studentName: "", participation: 0, clarity: 0, pace: 0, comments: "" }
  })

  useEffect(() => { if (selectedCourse) form.setValue("course", selectedCourse) }, [selectedCourse, form])

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    await onSubmit(values)
    setIsCompleted(true)
    setTimeout(() => {
      setIsCompleted(false)
      form.reset({ course: values.course, studentName: "", comments: "", participation: 0, clarity: 0, pace: 0 })
      setIsSubmitting(false)
    }, 3000)
  }

  if (isCompleted) return (
    <Card className="bg-green-50 border-green-200"><CardContent className="py-12 text-center text-green-800"><CheckCircle className="h-16 w-16 mx-auto mb-4"/><h3>¡Enviado!</h3></CardContent></Card>
  )

  return (
    <Card>
      <CardHeader><CardTitle>Evaluar Clase</CardTitle><CardDescription>Tu opinión ayuda a mejorar.</CardDescription></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <FormField control={form.control} name="studentName" render={({ field }) => (
                <FormItem><FormLabel>Tu Nombre</FormLabel><FormControl><Input placeholder="Ej: Ana García" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <FormField control={form.control} name="course" render={({ field }) => (
                <FormItem>
                  <FormLabel>Curso</FormLabel>
                  <Select onValueChange={(val) => { field.onChange(val); onCourseChange(val); }} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {coursesList.map((c:any) => (
                        <SelectItem key={c.code} value={c.code}>
                          <div className="flex flex-col items-start">
                            <span>{c.name}</span>
                            <span className="text-xs text-muted-foreground">Prof. {c.professor?.name} {c.professor?.lastName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="space-y-4">
               {/* Reutilizando tu componente StarRating */}
               {[{n:"participation", l:"Participación"}, {n:"clarity", l:"Claridad"}, {n:"pace", l:"Ritmo"}].map((i) => (
                 <FormField key={i.n} control={form.control} name={i.n as any} render={({ field }) => (
                   <FormItem>
                     <FormLabel>{i.l}</FormLabel>
                     <FormControl><StarRating value={field.value} onChange={field.onChange} disabled={isSubmitting}/></FormControl>
                     <FormMessage />
                   </FormItem>
                 )} />
               ))}
            </div>

            <FormField control={form.control} name="comments" render={({ field }) => (
              <FormItem><FormLabel>Comentarios</FormLabel><FormControl><Textarea placeholder="..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin mr-2"/> : "Enviar"}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}