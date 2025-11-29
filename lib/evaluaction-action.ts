// lib/evaluation-actions.ts
"use server"


import { revalidatePath } from "next/cache"
import { auth } from "./auth"
import { prisma } from "./db"

export interface EvaluationFormData {
  courseId: string
  participation: number
  clarity: number
  pace: number
  comments: string
  studentName: string
  isAnonymous: boolean
}

export async function createEvaluation(data: EvaluationFormData) {
  try {
    // Verificar autenticación
    const session = await auth()
    
    if (!session?.user?.id) {
      return { error: "No autenticado" }
    }

    // Verificar que el usuario sea estudiante
    if (session.user.role !== "STUDENT") {
      return { error: "Solo los estudiantes pueden crear evaluaciones" }
    }

    // Verificar que el curso exista
    const course = await prisma.course.findUnique({
      where: { id: data.courseId }
    })

    if (!course) {
      return { error: "Curso no encontrado" }
    }

    // Verificar que el estudiante no haya evaluado este curso antes
    const existingEvaluation = await prisma.evaluation.findFirst({
      where: {
        courseId: data.courseId,
        studentId: session.user.id
      }
    })

    if (existingEvaluation) {
      return { error: "Ya has evaluado este curso" }
    }

    // Crear la evaluación
    const evaluation = await prisma.evaluation.create({
      data: {
        courseId: data.courseId,
        studentId: session.user.id,
        participation: data.participation,
        clarity: data.clarity,
        pace: data.pace,
        comments: data.comments,
        studentName: data.studentName,
        isAnonymous: data.isAnonymous
      },
      include: {
        course: true,
        student: true
      }
    })

    // Opcional: Generar análisis IA aquí si lo deseas
    // const aiAnalysis = await generateAIAnalysis(evaluation)

    revalidatePath("/")
    return { 
      success: true, 
      evaluation 
    }

  } catch (error) {
    console.error("Error creating evaluation:", error)
    return { error: "Error interno del servidor" }
  }
}

export async function getCourseEvaluations(courseId: string) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return { error: "No autenticado" }
    }

    const evaluations = await prisma.evaluation.findMany({
      where: { 
        courseId: courseId 
      },
      include: {
        course: true,
        student: {
          select: {
            name: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return { evaluations }
  } catch (error) {
    console.error("Error fetching evaluations:", error)
    return { error: "Error al cargar evaluaciones" }
  }
}

export async function getUserEvaluations() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return { error: "No autenticado" }
    }

    const evaluations = await prisma.evaluation.findMany({
      where: { 
        studentId: session.user.id 
      },
      include: {
        course: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return { evaluations }
  } catch (error) {
    console.error("Error fetching user evaluations:", error)
    return { error: "Error al cargar tus evaluaciones" }
  }
}