"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// ==========================================
// 🔒 SEGURIDAD
// ==========================================
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// ==========================================
// 🎓 EVALUACIONES
// ==========================================

export async function evaluateClassAction(data: any) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "No autorizado" };

    const dbCourse = await prisma.course.findUnique({ where: { code: data.course } });
    if (!dbCourse) return { success: false, error: "Curso no encontrado" };

    let summary = "Pendiente de análisis.";
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(`Resume en 12 palabras la opinión: "${data.comments}" (Calif: ${data.participation}/5)`);
        summary = result.response.text().replace(/\*/g, '').trim();
      } catch (e) {
        summary = "Análisis no disponible temporalmente";
      }
    }

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
    revalidatePath("/estudiantes");
    return { success: true, insights: { summary } };
  } catch (error) { return { success: false, error: "Error al procesar" }; }
}

// -------------------------------------------------------------
// GENERADORES DE REPORTES (TEXTO PURO)
// -------------------------------------------------------------

// Función interna: Genera texto plano limpio
async function generateAnalysisText(evaluations: any[], stats: any) {
  try {
    if (!evaluations || evaluations.length === 0) return "Sin datos suficientes.";
    if (!genAI) return "Error: API Key no configurada.";

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // PROMPT: Pide estructura limpia
    const prompt = `
    Analiza estas ${stats.totalEvaluations} evaluaciones (Promedio ${stats.overallAverage}/5).
    Comentarios: ${evaluations.slice(0, 15).map(e => `"${e.comments}"`).join(". ")}.

    Genera un reporte en TEXTO PLANO (Sin Markdown, Sin HTML).
    Usa MAYÚSCULAS para títulos y guiones para listas.
    
    Estructura:
    RESUMEN EJECUTIVO
    [Texto]

    FORTALEZAS
    - [Item]

    ÁREAS DE MEJORA
    - [Item]

    RECOMENDACIONES
    - [Item]
    `;

    const res = await model.generateContent(prompt);
    let text = res.response.text();
    return text.replace(/\*\*/g, '').replace(/#/g, '').trim();

  } catch (e) { return "Análisis no disponible en este momento."; }
}

// 1. VISTA PROFESOR
export async function generateCourseAnalysisAction(course: string, evaluations: any[]) {
  if (evaluations.length === 0) return { success: false, error: "Sin datos" };

  const total = evaluations.length;
  const sums = evaluations.reduce((acc, curr) => ({ p: acc.p + curr.participation, c: acc.c + curr.clarity, r: acc.r + curr.pace }), { p: 0, c: 0, r: 0 });
  const stats = {
    totalEvaluations: total,
    overallAverage: ((sums.p + sums.c + sums.r) / (total * 3)).toFixed(1)
  };

  const analysisText = await generateAnalysisText(evaluations, stats);
  return { success: true, analysis: analysisText };
}

// 2. PARA EL PDF (Devuelve TEXTO formateado, NO HTML)
export async function generatePDFReportAction(evaluations: any[], stats: any) {
  const aiText = await generateAnalysisText(evaluations, stats);

  // Construimos una cadena de texto ordenada para el PDF
  return `REPORTE DE DOCENCIA - ECI
================================================
Fecha: ${new Date().toLocaleDateString()}

ESTADÍSTICAS GENERALES
------------------------------------------------
Promedio General:      ${stats.overallAverage} / 5.0
Total Evaluaciones:    ${stats.totalEvaluations}
Nivel Participación:   ${stats.averageParticipation}
Claridad:              ${stats.averageClarity}
Ritmo de Clase:        ${stats.averagePace}

ANÁLISIS PEDAGÓGICO IA
================================================
${aiText}

------------------------------------------------
Generado automáticamente por Sistema ECI
Documento Confidencial
`;
}

// -------------------------------------------------------------
// CRUD ADMIN (Se mantiene igual)
// -------------------------------------------------------------
export async function getEvaluationsAction(courseFilter: string = "all") {
  try {
    const session = await auth(); if (!session?.user) return [];
    let where: any = {};
    if (session.user.role === "PROFESSOR") where.course = { professorId: session.user.id };
    if (courseFilter !== "all") where.course = { ...where.course, code: courseFilter };
    const evals = await prisma.evaluation.findMany({ where, include: { course: { include: { professor: true } }, student: true }, orderBy: { createdAt: 'desc' } });
    return evals.map(e => ({ id: e.id, course: e.course.code, courseName: e.course.name, professorName: e.course.professor ? `${e.course.professor.name} ${e.course.professor.lastName}` : "Sin docente", studentName: e.studentName || e.student.name, participation: e.participation, clarity: e.clarity, pace: e.pace, comments: e.comments, aiAnalysis: e.aiAnalysis, date: e.createdAt }));
  } catch (e) { return []; }
}
export async function getProfessorCoursesAction() { try { const session = await auth(); if (!session?.user) return []; let where: any = {}; if (session.user.role === "PROFESSOR") where.professorId = session.user.id; const courses = await prisma.course.findMany({ where, select: { code: true, name: true, _count: { select: { evaluations: true } } }, orderBy: { name: 'asc' } }); return courses.map(c => ({ code: c.code, name: c.name, count: c._count.evaluations })); } catch (error) { return []; } }
export async function deleteEvaluationAction(id: string) { try { const session = await auth(); if (!session?.user) return { success: false, error: "No autorizado" }; const evaluation = await prisma.evaluation.findUnique({ where: { id }, include: { course: true } }); if (!evaluation) return { success: false, error: "No encontrada" }; const isAdmin = session.user.role === "ADMIN"; const isOwnerProfessor = session.user.role === "PROFESSOR" && evaluation.course.professorId === session.user.id; if (!isAdmin && !isOwnerProfessor) return { success: false, error: "Sin permiso" }; await prisma.evaluation.delete({ where: { id } }); revalidatePath("/profesor"); return { success: true }; } catch (e) { return { success: false, error: "Error al eliminar" }; } }
export async function getAllUsersAction() { try { const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, name: true, lastName: true, email: true, role: true, createdAt: true, _count: { select: { evaluations: true } } } }); return { success: true, users }; } catch (e) { return { success: false, error: "Error" }; } }
export async function updateUserRoleAction(userId: string, newRole: any) { try { const session = await auth(); if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" }; await prisma.user.update({ where: { id: userId }, data: { role: newRole } }); revalidatePath("/admin"); return { success: true }; } catch (e) { return { success: false, error: "Error" }; } }
export async function deleteUserAction(userId: string) { try { const session = await auth(); if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" }; await prisma.user.delete({ where: { id: userId } }); revalidatePath("/admin"); return { success: true }; } catch (e) { return { success: false, error: "Error al eliminar" }; } }
export async function createUserAction(data: any) { try { const session = await auth(); if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" }; const existing = await prisma.user.findUnique({ where: { email: data.email } }); if (existing) return { success: false, error: "Email existe" }; const hashedPassword = await bcrypt.hash(data.password, 10); await prisma.user.create({ data: { ...data, password: hashedPassword, role: data.role as any } }); revalidatePath("/admin"); return { success: true }; } catch (e) { return { success: false, error: "Error" }; } }
export async function getAllCoursesAction() { try { const c = await prisma.course.findMany({ include: { professor: true }, orderBy: { createdAt: 'desc' } }); return { success: true, courses: c }; } catch (e) { return { success: false, error: "Error" }; } }
export async function createCourseAction(data: any) { try { const session = await auth(); if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" }; const ex = await prisma.course.findUnique({ where: { code: data.code } }); if (ex) return { success: false, error: "Código existe" }; await prisma.course.create({ data }); revalidatePath("/admin"); return { success: true }; } catch (e) { return { success: false, error: "Error" }; } }
export async function assignProfessorToCourseAction(courseId: string, professorId: string) { try { const session = await auth(); if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" }; await prisma.course.update({ where: { id: courseId }, data: { professorId } }); revalidatePath("/admin"); return { success: true }; } catch (e) { return { success: false, error: "Error" }; } }
export async function deleteCourseAction(courseId: string) { try { const session = await auth(); if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" }; await prisma.course.delete({ where: { id: courseId } }); revalidatePath("/admin"); return { success: true }; } catch (e) { return { success: false, error: "Error" }; } }