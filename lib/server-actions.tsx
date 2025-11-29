"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db"; 
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth"; 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyAiFW5cYPMVAc2gjqFCMpO6OO_8mMTuClQ");

// ==========================================
// 🎓 SECCIÓN: PROFESOR Y ESTUDIANTES
// ==========================================

// 1. EVALUAR (GUARDAR + IA RÁPIDA)
export async function evaluateClassAction(data: any) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "No autorizado" };

    const dbCourse = await prisma.course.findUnique({ where: { code: data.course } });
    if (!dbCourse) return { success: false, error: "Curso no encontrado" };

    // Prompt para resumen rápido (Tarjeta)
    const prompt = `
    Analiza esta evaluación docente individual:
    Curso: ${data.courseName}.
    Puntuación: Participación ${data.participation}, Claridad ${data.clarity}, Ritmo ${data.pace}.
    Comentario: "${data.comments}".
    
    INSTRUCCIÓN: Responde DIRECTAMENTE con un resumen de 1 sola oración. NO uses asteriscos ni markdown.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    // Limpiamos por si acaso la IA pone asteriscos
    const summary = result.response.text().replace(/\*/g, '').trim();

    await prisma.evaluation.create({
      data: {
        participation: data.participation,
        clarity: data.clarity,
        pace: data.pace,
        comments: data.comments,
        studentName: data.studentName,
        aiAnalysis: summary,
        isAnonymous: false,
        course: { connect: { id: dbCourse.id } },
        student: { connect: { id: session.user.id } }
      }
    });

    revalidatePath("/profesor");
    return { success: true, insights: { summary } };
  } catch (error) { return { success: false, error: "Error al procesar" }; }
}

// 2. LEER DATOS
export async function getEvaluationsAction(courseFilter: string = "all") {
  try {
    const where = courseFilter === "all" ? {} : { course: { code: courseFilter } };
    
    const evals = await prisma.evaluation.findMany({
      where,
      include: { 
        // AHORA INCLUIMOS AL PROFESOR DEL CURSO
        course: {
          include: { professor: true }
        }, 
        student: true 
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return evals.map(e => ({
      id: e.id,
      course: e.course.code,
      courseName: e.course.name,
      // Enviamos el nombre del profesor al frontend
      professorName: e.course.professor 
        ? `${e.course.professor.name} ${e.course.professor.lastName}` 
        : "Sin docente asignado",
      studentName: e.studentName || e.student.name,
      participation: e.participation,
      clarity: e.clarity,
      pace: e.pace,
      comments: e.comments,
      aiAnalysis: e.aiAnalysis,
      date: e.createdAt
    }));
  } catch (e) { return []; }
}

// 3. ELIMINAR EVALUACIÓN
export async function deleteEvaluationAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "PROFESSOR" && session.user.role !== "ADMIN")) {
      return { success: false, error: "No autorizado" };
    }
    await prisma.evaluation.delete({ where: { id } });
    revalidatePath("/profesor");
    return { success: true };
  } catch (e) { return { success: false, error: "Error al eliminar" }; }
}

// 4. ANÁLISIS IA GLOBAL (Para el PDF y Dashboard)
// Este helper genera el HTML estructurado que pediste
async function generateComprehensiveAnalysisAction(evaluations: any[], stats: any) {
  try {
    if (!evaluations || evaluations.length === 0) return { success: true, analysis: "<p>Sin datos suficientes.</p>" };

    // Prompt diseñado para devolver HTML limpio y ordenado
    const prompt = `
    Actúa como un consultor pedagógico experto. Analiza las siguientes evaluaciones docentes:
    
    DATOS:
    - Total: ${stats.totalEvaluations} evaluaciones.
    - Promedio General: ${stats.overallAverage}/5.
    - Promedios por área: Part ${stats.averageParticipation}, Clar ${stats.averageClarity}, Ritmo ${stats.averagePace}.
    - COMENTARIOS DE ALUMNOS: ${evaluations.slice(0, 15).map(e => `"${e.comments}"`).join(". ")}.

    INSTRUCCIONES DE FORMATO (IMPORTANTE):
    1. NO uses Markdown (nada de **negritas** con asteriscos ni # titulos).
    2. Responde ÚNICAMENTE con código HTML válido (etiquetas <p>, <ul>, <li>, <strong>, <h3>).
    3. Estructura la respuesta en estas 3 secciones exactas:

    <h3>1. Resumen Ejecutivo</h3>
    <p>[Tu resumen aquí]</p>

    <h3>2. Fortalezas y Debilidades</h3>
    <ul>
      <li><strong>Fortaleza:</strong> [Detalle]</li>
      <li><strong>Área de Mejora:</strong> [Detalle]</li>
    </ul>

    <h3>3. Recomendaciones Estratégicas</h3>
    <ul>
      <li>[Recomendación 1]</li>
      <li>[Recomendación 2]</li>
    </ul>

    Mantén un tono profesional y directo.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const res = await model.generateContent(prompt);
    // Limpiamos bloques de código si la IA los pone
    const cleanHtml = res.response.text().replace(/```html/g, '').replace(/```/g, '');
    
    return { success: true, analysis: cleanHtml };
  } catch (e) { return { success: false, error: "Error IA" }; }
}

// Esta función se exporta para usarse en el botón "Generar Análisis" del dashboard
export async function generateCourseAnalysisAction(course: string, evaluations: any[]) {
    // Calculamos stats al vuelo para reutilizar la función de arriba
    const total = evaluations.length;
    const sums = evaluations.reduce((acc, curr) => ({
        p: acc.p + curr.participation, c: acc.c + curr.clarity, r: acc.r + curr.pace
    }), { p: 0, c: 0, r: 0 });
    
    const stats = {
        totalEvaluations: total,
        overallAverage: ((sums.p + sums.c + sums.r) / (total * 3)).toFixed(1),
        averageParticipation: (sums.p / total).toFixed(1),
        averageClarity: (sums.c / total).toFixed(1),
        averagePace: (sums.r / total).toFixed(1)
    };

    return await generateComprehensiveAnalysisAction(evaluations, stats);
}

// 5. GENERAR HTML PARA PDF (Diseño Profesional)
export async function generatePDFReportAction(evaluations: any[], stats: any) {
  // 1. Generamos el análisis de IA primero
  const aiResult = await generateComprehensiveAnalysisAction(evaluations, stats);
  const aiContent = aiResult.analysis || "<p>No se pudo generar el análisis.</p>";

  // 2. Construimos el HTML completo con CSS profesional
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
            font-family: 'Helvetica', 'Arial', sans-serif; 
            padding: 40px; 
            color: #333; 
            line-height: 1.6;
            background-color: #ffffff; /* Fondo blanco forzado */
        }
        .header { 
            text-align: center; 
            border-bottom: 3px solid #2563eb; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        h1 { color: #1e40af; font-size: 24px; margin: 0; text-transform: uppercase; }
        .date { color: #64748b; font-size: 12px; margin-top: 5px; }
        
        /* Cajas de Estadísticas */
        .stats-container { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 30px; 
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        .stat-box { text-align: center; flex: 1; }
        .stat-val { font-size: 28px; font-weight: bold; color: #2563eb; display: block; }
        .stat-label { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; }

        /* Sección de IA (Aquí se inyecta el HTML de Gemini) */
        .ai-section {
            background-color: #fff;
            margin-bottom: 40px;
        }
        .ai-section h3 { 
            color: #1e40af; 
            font-size: 16px; 
            border-left: 4px solid #2563eb; 
            padding-left: 10px; 
            margin-top: 25px;
            margin-bottom: 10px;
        }
        .ai-section p { margin-bottom: 10px; font-size: 14px; text-align: justify; }
        .ai-section ul { margin-bottom: 10px; padding-left: 20px; }
        .ai-section li { margin-bottom: 5px; font-size: 14px; }
        .ai-section strong { color: #0f172a; }

        /* Tabla de Comentarios */
        .comments-section h3 { color: #333; font-size: 18px; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { text-align: left; background-color: #f1f5f9; padding: 10px; color: #475569; font-weight: bold; border-bottom: 2px solid #e2e8f0; }
        td { padding: 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .col-score { text-align: center; width: 50px; font-weight: bold; color: #2563eb; }
        .col-course { width: 150px; font-weight: bold; }
        
        .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Reporte de Desempeño Docente</h1>
        <div class="date">Generado el ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      <div class="stats-container">
        <div class="stat-box">
            <span class="stat-val">${stats.overallAverage}</span>
            <span class="stat-label">Promedio General</span>
        </div>
        <div class="stat-box">
            <span class="stat-val">${stats.totalEvaluations}</span>
            <span class="stat-label">Total Evaluaciones</span>
        </div>
        <div class="stat-box">
            <span class="stat-val">${stats.averageParticipation}</span>
            <span class="stat-label">Participación</span>
        </div>
        <div class="stat-box">
            <span class="stat-val">${stats.averageClarity}</span>
            <span class="stat-label">Claridad</span>
        </div>
        <div class="stat-box">
            <span class="stat-val">${stats.averagePace}</span>
            <span class="stat-label">Ritmo</span>
        </div>
      </div>

      <!-- Aquí va el análisis limpio de la IA -->
      <div class="ai-section">
        ${aiContent}
      </div>

      <div class="comments-section">
        <h3>📝 Detalle de Evaluaciones Recientes</h3>
        <table>
            <thead>
                <tr>
                    <th>Curso</th>
                    <th>Fecha</th>
                    <th class="col-score">Prom</th>
                    <th>Comentario</th>
                </tr>
            </thead>
            <tbody>
                ${evaluations.slice(0, 20).map((e: any) => `
                <tr>
                    <td class="col-course">${e.courseName}</td>
                    <td>${new Date(e.date).toLocaleDateString()}</td>
                    <td class="col-score">${((e.participation + e.clarity + e.pace) / 3).toFixed(1)}</td>
                    <td><i>"${e.comments || 'Sin comentarios'}"</i></td>
                </tr>
                `).join('')}
            </tbody>
        </table>
      </div>

      <div class="footer">
        Documento generado automáticamente por la plataforma EduRate • Confidencial
      </div>
    </body>
    </html>
  `;
}

// --- SECCIÓN: ADMIN ---

export async function getAllUsersAction() {
  try {
    // const session = await auth(); 
    // if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, lastName: true, email: true, role: true, createdAt: true,
        _count: { select: { evaluations: true } }
      }
    });
    return { success: true, users };
  } catch (e) { return { success: false, error: "Error" }; }
}

export async function updateUserRoleAction(userId: string, newRole: any) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };
    await prisma.user.update({ where: { id: userId }, data: { role: newRole } });
    revalidatePath("/admin");
    return { success: true };
  } catch (e) { return { success: false, error: "Error" }; }
}

export async function deleteUserAction(userId: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/admin");
    return { success: true };
  } catch (e) { return { success: false, error: "Error" }; }
}
// ==========================================
// 🏫 SECCIÓN: ADMIN (GESTIÓN DE CURSOS)
// ==========================================

// 1. OBTENER TODOS LOS CURSOS
export async function getAllCoursesAction() {
  try {
    const courses = await prisma.course.findMany({
      include: { professor: true }, // Incluimos datos del profe
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, courses };
  } catch (e) { return { success: false, error: "Error al cargar cursos" }; }
}

// 2. CREAR NUEVO CURSO
export async function createCourseAction(data: { code: string, name: string, description?: string, professorId: string }) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };

    // Verificar si el código ya existe
    const exists = await prisma.course.findUnique({ where: { code: data.code } });
    if (exists) return { success: false, error: "El código del curso ya existe" };

    await prisma.course.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        professorId: data.professorId
      }
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (e) { return { success: false, error: "Error al crear curso" }; }
}

// 3. ASIGNAR PROFESOR A CURSO
export async function assignProfessorToCourseAction(courseId: string, professorId: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };

    await prisma.course.update({
      where: { id: courseId },
      data: { professorId }
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (e) { return { success: false, error: "Error al asignar profesor" }; }
}

// 4. ELIMINAR CURSO
export async function deleteCourseAction(courseId: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };

    await prisma.course.delete({ where: { id: courseId } });
    revalidatePath("/admin");
    return { success: true };
  } catch (e) { return { success: false, error: "Error al eliminar curso" }; }
}