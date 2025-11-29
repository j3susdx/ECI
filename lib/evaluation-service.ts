// lib/evaluation-service.ts
import { prisma } from '@/lib/db'

export interface EvaluationData {
  courseId: string
  studentId: string
  participation: number
  clarity: number
  pace: number
  comments?: string
  studentName?: string
  isAnonymous?: boolean
}

export interface CourseData {
  code: string
  name: string
  description?: string
  professorId: string
}

// Servicio para Evaluaciones
export const EvaluationService = {
  // Crear nueva evaluación
  async createEvaluation(data: EvaluationData) {
    return await prisma.evaluation.create({
      data: {
        ...data,
        isAnonymous: data.isAnonymous ?? false,
      },
      include: {
        course: true,
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  },

  // Obtener evaluaciones por curso
  async getEvaluationsByCourse(courseId: string) {
    return await prisma.evaluation.findMany({
      where: { courseId },
      include: {
        course: true,
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  },

  // Obtener evaluaciones por profesor
  async getEvaluationsByProfessor(professorId: string) {
    return await prisma.evaluation.findMany({
      where: {
        course: {
          professorId,
        },
      },
      include: {
        course: true,
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  },

  // Obtener estadísticas por curso
  async getCourseStatistics(courseId: string) {
    const evaluations = await prisma.evaluation.findMany({
      where: { courseId },
    })

    if (evaluations.length === 0) {
      return {
        overallAverage: 0,
        totalEvaluations: 0,
        averageParticipation: 0,
        averageClarity: 0,
        averagePace: 0,
      }
    }

    const totalParticipation = evaluations.reduce((sum, eval) => sum + eval.participation, 0)
    const totalClarity = evaluations.reduce((sum, eval) => sum + eval.clarity, 0)
    const totalPace = evaluations.reduce((sum, eval) => sum + eval.pace, 0)

    const averageParticipation = totalParticipation / evaluations.length
    const averageClarity = totalClarity / evaluations.length
    const averagePace = totalPace / evaluations.length

    const overallAverage = (averageParticipation + averageClarity + averagePace) / 3

    return {
      overallAverage: Math.round(overallAverage * 10) / 10,
      totalEvaluations: evaluations.length,
      averageParticipation: Math.round(averageParticipation * 10) / 10,
      averageClarity: Math.round(averageClarity * 10) / 10,
      averagePace: Math.round(averagePace * 10) / 10,
    }
  },

  // Obtener estadísticas generales del profesor
  async getProfessorStatistics(professorId: string) {
    const evaluations = await this.getEvaluationsByProfessor(professorId)
    const courses = await prisma.course.findMany({
      where: { professorId },
      include: {
        evaluations: true,
      },
    })

    if (evaluations.length === 0) {
      return {
        overallAverage: 0,
        totalEvaluations: 0,
        thisWeekEvaluations: 0,
        averageParticipation: 0,
        averageClarity: 0,
        averagePace: 0,
        bestAspect: 'N/A',
        improvementArea: 'N/A',
        weeklyProgress: 0,
      }
    }

    const totalParticipation = evaluations.reduce((sum, eval) => sum + eval.participation, 0)
    const totalClarity = evaluations.reduce((sum, eval) => sum + eval.clarity, 0)
    const totalPace = evaluations.reduce((sum, eval) => sum + eval.pace, 0)

    const averageParticipation = totalParticipation / evaluations.length
    const averageClarity = totalClarity / evaluations.length
    const averagePace = totalPace / evaluations.length

    const overallAverage = (averageParticipation + averageClarity + averagePace) / 3

    // Evaluaciones de esta semana
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const thisWeekEvaluations = evaluations.filter(
      (evaluation) => evaluation.createdAt >= oneWeekAgo
    ).length

    // Determinar mejor aspecto y área de mejora
    const aspects = {
      Participación: averageParticipation,
      Claridad: averageClarity,
      Ritmo: averagePace,
    }

    const bestAspect = Object.entries(aspects).reduce((a, b) => 
      aspects[a[0] as keyof typeof aspects] > aspects[b[0] as keyof typeof aspects] ? a : b
    )[0]

    const improvementArea = Object.entries(aspects).reduce((a, b) => 
      aspects[a[0] as keyof typeof aspects] < aspects[b[0] as keyof typeof aspects] ? a : b
    )[0]

    return {
      overallAverage: Math.round(overallAverage * 10) / 10,
      totalEvaluations: evaluations.length,
      thisWeekEvaluations,
      averageParticipation: Math.round(averageParticipation * 10) / 10,
      averageClarity: Math.round(averageClarity * 10) / 10,
      averagePace: Math.round(averagePace * 10) / 10,
      bestAspect,
      improvementArea,
      weeklyProgress: Math.min(100, (thisWeekEvaluations / 4) * 100),
    }
  },

  // Actualizar análisis de IA en evaluación
  async updateAIAnalysis(evaluationId: string, aiAnalysis: string) {
    return await prisma.evaluation.update({
      where: { id: evaluationId },
      data: { aiAnalysis },
    })
  },
}

// Servicio para Cursos
export const CourseService = {
  // Crear nuevo curso
  async createCourse(data: CourseData) {
    return await prisma.course.create({
      data,
    })
  },

  // Obtener todos los cursos de un profesor
  async getCoursesByProfessor(professorId: string) {
    return await prisma.course.findMany({
      where: { professorId },
      include: {
        evaluations: {
          include: {
            student: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  },

  // Obtener todos los cursos disponibles
  async getAllCourses() {
    return await prisma.course.findMany({
      include: {
        professor: {
          select: {
            name: true,
            email: true,
            department: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  },

  // Obtener curso por ID
  async getCourseById(courseId: string) {
    return await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        professor: true,
        evaluations: {
          include: {
            student: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })
  },

  // Inscribir estudiante en curso
  async enrollStudent(courseId: string, studentId: string) {
    return await prisma.courseEnrollment.create({
      data: {
        courseId,
        userId: studentId,
      },
    })
  },

  // Obtener cursos del estudiante
  async getStudentCourses(studentId: string) {
    return await prisma.courseEnrollment.findMany({
      where: { userId: studentId },
      include: {
        course: {
          include: {
            professor: true,
          },
        },
      },
    })
  },
}

// Servicio para Usuarios
export const UserService = {
  // Crear usuario
  async createUser(email: string, name: string, role: 'STUDENT' | 'PROFESSOR' | 'ADIN') {
    return await prisma.user.create({
      data: {
        email,
        name,
        role,
      },
    })
  },

  // Obtener usuario por email
  async getUserByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
    })
  },

  // Obtener usuario por ID
  async getUserById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
    })
  },

  // Obtener todos los profesores
  async getProfessors() {
    return await prisma.user.findMany({
      where: { role: 'PROFESSOR' },
    })
  },
}