import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize Gemini client
const genAI = new GoogleGenerativeAI("AIzaSyAiFW5cYPMVAc2gjqFCMpO6OO_8mMTuClQ")

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

export async function generateCourseAnalysis(course: string, evaluations: any[]): Promise<AnalysisResult> {
  try {
    if (evaluations.length === 0) {
      return {
        success: true,
        analysis: "No hay suficientes evaluaciones para generar un análisis detallado de este curso.",
      }
    }

    const averages = {
      participation: evaluations.reduce((sum, evaluation) => sum + evaluation.participation, 0) / evaluations.length,
      clarity: evaluations.reduce((sum, evaluation) => sum + evaluation.clarity, 0) / evaluations.length,
      pace: evaluations.reduce((sum, evaluation) => sum + evaluation.pace, 0) / evaluations.length,
    }

    const prompt = `
    Como experto en educación, analiza las siguientes evaluaciones del curso "${course}" y proporciona recomendaciones específicas para el docente:

    DATOS DE EVALUACIONES:
    - Número total de evaluaciones: ${evaluations.length}
    - Promedio Participación: ${averages.participation.toFixed(1)}/5
    - Promedio Claridad: ${averages.clarity.toFixed(1)}/5  
    - Promedio Ritmo: ${averages.pace.toFixed(1)}/5

    COMENTARIOS DE ESTUDIANTES:
    ${evaluations
      .map(
        (evaluation, index) =>
          `${index + 1}. "${evaluation.comments}" (Participación: ${evaluation.participation}, Claridad: ${evaluation.clarity}, Ritmo: ${evaluation.pace})`,
      )
      .join("\n")}

    Por favor proporciona:
    1. ANÁLISIS GENERAL: Resumen del desempeño actual
    2. FORTALEZAS: Aspectos mejor valorados
    3. ÁREAS DE MEJORA: Aspectos con menor puntuación
    4. RECOMENDACIONES ESPECÍFICAS: 3-4 sugerencias concretas y accionables para mejorar la enseñanza
    5. ESTRATEGIAS PEDAGÓGICAS: Técnicas específicas para este tipo de curso

    Mantén un tono profesional y constructivo. Enfócate en sugerencias prácticas que el docente pueda implementar inmediatamente.
    `

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent(prompt)
    const analysis = result.response.text()

    return {
      success: true,
      analysis,
    }
  } catch (error) {
    console.error("Error generating analysis:", error)
    return {
      success: false,
      error: "Error al generar el análisis",
    }
  }
}

export async function generateComprehensiveAnalysis(evaluations: any[], stats: any): Promise<AnalysisResult> {
  try {
    if (!evaluations || evaluations.length === 0) {
      return {
        success: true,
        analysis: "No hay suficientes evaluaciones para generar un análisis detallado.",
      }
    }

    const courseGroups = evaluations.reduce((groups: any, evaluation: any) => {
      if (!groups[evaluation.course]) {
        groups[evaluation.course] = []
      }
      groups[evaluation.course].push(evaluation)
      return groups
    }, {})

    const prompt = `
    Como experto en pedagogía y análisis educativo, analiza el siguiente conjunto completo de evaluaciones docentes y proporciona un análisis integral:

    ESTADÍSTICAS GENERALES:
    - Total de evaluaciones: ${stats.totalEvaluations}
    - Promedio general: ${stats.overallAverage}/5
    - Promedio Participación: ${stats.averageParticipation}/5
    - Promedio Claridad: ${stats.averageClarity}/5
    - Promedio Ritmo: ${stats.averagePace}/5
    - Mejor aspecto: ${stats.bestAspect}
    - Área de mejora: ${stats.improvementArea}

    ANÁLISIS POR CURSO:
    ${Object.entries(courseGroups)
      .map(([course, evals]: [string, any]) => {
        const courseEvals = evals as any[]
        const avgParticipation = courseEvals.reduce((sum, e) => sum + e.participation, 0) / courseEvals.length
        const avgClarity = courseEvals.reduce((sum, e) => sum + e.clarity, 0) / courseEvals.length
        const avgPace = courseEvals.reduce((sum, e) => sum + e.pace, 0) / courseEvals.length

        return `
      CURSO: ${courseEvals[0].courseName}
      - Evaluaciones: ${courseEvals.length}
      - Promedios: Participación ${avgParticipation.toFixed(1)}, Claridad ${avgClarity.toFixed(1)}, Ritmo ${avgPace.toFixed(1)}
      - Comentarios destacados: ${courseEvals
        .filter((e) => e.comments)
        .map((e) => `"${e.comments}"`)
        .join("; ")}
      `
      })
      .join("\n")}

    PROPORCIONA UN ANÁLISIS ESTRUCTURADO CON:

    1. RESUMEN EJECUTIVO
    Evaluación general del desempeño docente y tendencias principales.

    2. FORTALEZAS IDENTIFICADAS
    Aspectos mejor valorados y prácticas exitosas evidenciadas.

    3. OPORTUNIDADES DE MEJORA
    Áreas específicas que requieren atención y desarrollo.

    4. RECOMENDACIONES ESTRATÉGICAS
    - Estrategias pedagógicas específicas
    - Técnicas para mejorar participación estudiantil
    - Métodos para optimizar claridad en la enseñanza
    - Ajustes en el ritmo de clase según el tipo de curso

    5. PLAN DE ACCIÓN SUGERIDO
    Pasos concretos y medibles para implementar mejoras.

    6. ANÁLISIS POR TIPO DE CURSO
    Recomendaciones específicas según las características de cada materia.

    Mantén un tono profesional, constructivo y orientado a la mejora continua. Incluye ejemplos específicos basados en los comentarios de estudiantes.
    `

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent(prompt)
    const analysis = result.response.text()

    return {
      success: true,
      analysis,
    }
  } catch (error) {
    console.error("Error generating comprehensive analysis:", error)
    return {
      success: false,
      error: "Error al generar el análisis integral",
    }
  }
}

export async function generatePDFReport(evaluations: any[], stats: any): Promise<string> {
  try {
    const analysisResult = await generateComprehensiveAnalysis(evaluations, stats)
    const analysis = analysisResult.analysis || "No se pudo generar el análisis"

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Análisis Docente - Evaluador de Clases</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px 20px;
                background: #fff;
            }
            .header {
                text-align: center;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .header h1 {
                color: #2563eb;
                font-size: 28px;
                margin: 0;
                font-weight: 700;
            }
            .header p {
                color: #666;
                font-size: 14px;
                margin: 10px 0 0 0;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }
            .stat-card {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
            }
            .stat-value {
                font-size: 32px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 5px;
            }
            .stat-label {
                color: #666;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .section {
                margin: 40px 0;
            }
            .section h2 {
                color: #2563eb;
                font-size: 20px;
                margin-bottom: 15px;
                border-left: 4px solid #16a34a;
                padding-left: 15px;
            }
            .analysis-content {
                background: #f9fafb;
                border-radius: 8px;
                padding: 25px;
                border-left: 4px solid #16a34a;
                white-space: pre-line;
                line-height: 1.8;
            }
            .footer {
                margin-top: 50px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                text-align: center;
                color: #666;
                font-size: 12px;
            }
            .highlight {
                background: #fef3c7;
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: 600;
            }
            .course-summary {
                background: #f0f9ff;
                border: 1px solid #0ea5e9;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📊 Análisis de Desempeño Docente</h1>
            <p>Reporte generado el ${new Date().toLocaleDateString("es-ES", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })} • Powered by Gemini AI</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.overallAverage}</div>
                <div class="stat-label">Promedio General</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalEvaluations}</div>
                <div class="stat-label">Total Evaluaciones</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.averageParticipation}</div>
                <div class="stat-label">Participación</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.averageClarity}</div>
                <div class="stat-label">Claridad</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.averagePace}</div>
                <div class="stat-label">Ritmo</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Math.round(stats.weeklyProgress)}%</div>
                <div class="stat-label">Progreso Semanal</div>
            </div>
        </div>

        <div class="section">
            <h2>🎯 Aspectos Destacados</h2>
            <p><strong>Mejor aspecto:</strong> <span class="highlight">${stats.bestAspect}</span></p>
            <p><strong>Área de mejora:</strong> <span class="highlight">${stats.improvementArea}</span></p>
        </div>

        <div class="section">
            <h2>📚 Cursos Evaluados</h2>
            ${Array.from(new Set(evaluations.map((e) => e.courseName)))
              .map((courseName) => {
                const courseEvals = evaluations.filter((e) => e.courseName === courseName)
                const avgScore =
                  courseEvals.reduce((sum, e) => sum + (e.participation + e.clarity + e.pace) / 3, 0) /
                  courseEvals.length
                return `
                <div class="course-summary">
                    <h3>${courseName}</h3>
                    <p><strong>Evaluaciones:</strong> ${courseEvals.length} | <strong>Promedio:</strong> ${avgScore.toFixed(1)}/5</p>
                </div>
              `
              })
              .join("")}
        </div>

        <div class="section">
            <h2>🤖 Análisis Detallado con IA</h2>
            <div class="analysis-content">
                ${analysis}
            </div>
        </div>

        <div class="footer">
            <p>Este reporte fue generado automáticamente por el Sistema de Evaluación de Clases Interactivas</p>
            <p>Powered by Gemini AI • Diseñado para la mejora continua educativa</p>
        </div>
    </body>
    </html>
    `

    return htmlContent
  } catch (error) {
    console.error("Error generating PDF report:", error)
    throw new Error("Error al generar el reporte")
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
