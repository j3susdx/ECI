import { GoogleGenerativeAI } from "@google/generative-ai"

// Note: This will require server actions since we can't access server env vars from client
const getGeminiClient = () => {
  // This is a placeholder - in a real implementation, you'd need to pass the API key from a server action
  // For now, we'll show an error message to guide the user
  if (typeof window !== "undefined") {
    throw new Error(
      "Gemini client should not be initialized on the client side for security reasons. Please use server actions.",
    )
  }

  const apiKey = "AIzaSyAiFW5cYPMVAc2gjqFCMpO6OO_8mMTuClQ"
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set")
  }

  return new GoogleGenerativeAI(apiKey)
}

export interface EvaluationData {
  course: string
  courseName: string
  participation: number
  clarity: number
  pace: number
  comments: string
  studentName: string
}

export interface EvaluationInsights {
  summary: string
  fullAnalysis: string
  strengths: string[]
  improvements: string[]
  overallScore: number
  recommendation: string
}

export interface AnalysisResult {
  success: boolean
  insights?: EvaluationInsights
  analysis?: string
  error?: string
  timestamp?: string
}

// For client-side usage, you'll need to create server actions that call these functions

export async function evaluateClass(data: EvaluationData): Promise<AnalysisResult> {
  try {
    const genAI = getGeminiClient()

    const prompt = `
    Analiza la siguiente evaluación de clase y proporciona insights constructivos:

    DATOS DE LA EVALUACIÓN:
    - Curso: ${getCourseFullName(data.course)}
    - Participación: ${data.participation}/5 estrellas
    - Claridad: ${data.clarity}/5 estrellas  
    - Ritmo: ${data.pace}/5 estrellas
    - Comentarios del estudiante: "${data.comments}"
    - Estudiante: ${data.studentName}

    Por favor proporciona:
    1. Un resumen breve de la evaluación (máximo 2 líneas)
    2. Los aspectos más fuertes identificados
    3. Áreas de oportunidad específicas
    4. Una recomendación concreta para el docente

    Mantén un tono profesional y constructivo. Enfócate en sugerencias prácticas.
    `

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent(prompt)
    const aiAnalysis = result.response.text()

    const overallScore = Math.round(((data.participation + data.clarity + data.pace) / 3) * 10) / 10

    const scores = {
      participation: data.participation,
      clarity: data.clarity,
      pace: data.pace,
    }

    const strengths = Object.entries(scores)
      .filter(([_, score]) => score >= 4)
      .map(([aspect, _]) => getAspectName(aspect))

    const improvements = Object.entries(scores)
      .filter(([_, score]) => score <= 3)
      .map(([aspect, _]) => getAspectName(aspect))

    const insights: EvaluationInsights = {
      summary: aiAnalysis.split("\n")[0] || "Evaluación procesada exitosamente",
      fullAnalysis: aiAnalysis,
      strengths,
      improvements,
      overallScore,
      recommendation: extractRecommendation(aiAnalysis),
    }

    return {
      success: true,
      insights,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error processing evaluation:", error)
    return {
      success: false,
      error: "Error processing evaluation with AI",
    }
  }
}

// Helper functions
function getCourseFullName(courseValue: string): string {
  const courseMap: Record<string, string> = {
    "big-data": "Big Data - Análisis de Grandes Volúmenes de Datos",
    telecomunicaciones: "Telecomunicaciones - Sistemas de Comunicación",
    "computacion-nube": "Computación en la Nube - Cloud Computing",
    "etica-profesionalismo": "Ética y Profesionalismo - Valores Profesionales",
    "inteligencia-negocios": "Inteligencia de Negocios - Business Intelligence",
    "metodologias-agiles": "Metodologías Ágiles - Desarrollo de Software",
  }
  return courseMap[courseValue] || courseValue
}

function getAspectName(aspect: string): string {
  const aspectMap: Record<string, string> = {
    participation: "Participación",
    clarity: "Claridad",
    pace: "Ritmo",
  }
  return aspectMap[aspect] || aspect
}

function extractRecommendation(analysis: string): string {
  const lines = analysis.split("\n")
  const recommendationLine = lines.find(
    (line) => line.toLowerCase().includes("recomendación") || line.toLowerCase().includes("sugerencia"),
  )
  return recommendationLine || "Continuar con las buenas prácticas identificadas"
}
