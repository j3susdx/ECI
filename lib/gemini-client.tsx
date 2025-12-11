import { GoogleGenerativeAI } from "@google/generative-ai"

// 🔒 SEGURIDAD: Inicializamos con env var
// Si se ejecuta en cliente, apiKey será undefined, lo cual es correcto (no queremos exponerla)
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

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

export async function evaluateClass(data: EvaluationData): Promise<AnalysisResult> {
  try {
    if (!apiKey) throw new Error("API Key no configurada en servidor");

    const prompt = `
    Analiza la siguiente evaluación:
    - Curso: ${getCourseFullName(data.course)}
    - Comentarios: "${data.comments}"
    
    Proporciona: Resumen, Fortalezas, Mejoras, Recomendación.
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
      summary: aiAnalysis.split("\n")[0] || "Evaluación procesada",
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

export async function generateCourseAnalysis(course: string, evaluations: any[]): Promise<AnalysisResult> {
  try {
    if (!apiKey) throw new Error("API Key no configurada");

    if (evaluations.length === 0) {
      return {
        success: true,
        analysis: "No hay suficientes evaluaciones.",
      }
    }

    const prompt = `Analiza estas evaluaciones del curso ${course}. Genera un resumen ejecutivo y recomendaciones.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent(prompt)
    const analysis = result.response.text()

    return { success: true, analysis }
  } catch (error) {
    return { success: false, error: "Error al generar análisis" }
  }
}

export async function generateComprehensiveAnalysis(evaluations: any[], stats: any): Promise<AnalysisResult> {
  try {
    if (!apiKey) throw new Error("API Key no configurada");

    if (!evaluations || evaluations.length === 0) {
      return { success: true, analysis: "Sin datos." }
    }

    const prompt = `Analiza globalmente estas evaluaciones (Promedio ${stats.overallAverage}). Genera reporte HTML.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent(prompt)
    const analysis = result.response.text()

    return { success: true, analysis }
  } catch (error) {
    return { success: false, error: "Error análisis integral" }
  }
}

export async function generatePDFReport(evaluations: any[], stats: any): Promise<string> {
  const res = await generateComprehensiveAnalysis(evaluations, stats);
  return `<html><body>${res.analysis}</body></html>`;
}

// Helpers duplicados para este archivo
function getCourseFullName(v: string) { return v; }
function getAspectName(v: string) { return v; }
function extractRecommendation(v: string) { return "Ver análisis completo"; }