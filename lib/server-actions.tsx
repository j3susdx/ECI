"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db"; 
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth"; 
import bcrypt from "bcryptjs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ==========================================
// 🎓 SECCIÓN: PROFESOR Y ESTUDIANTES
// ==========================================

export async function evaluateClassAction(data: any) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "No autorizado" };

    const dbCourse = await prisma.course.findUnique({ where: { code: data.course } });
    if (!dbCourse) return { success: false, error: "Curso no encontrado" };

    const prompt = `
    Analiza esta evaluación: Curso ${data.courseName}. Puntuación: P${data.participation} C${data.clarity} R${data.pace}. Comentario: "${data.comments}".
    Responde con 1 frase resumen sin markdown.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
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

// --- ACCIÓN: OBTENER EVALUACIONES FILTRADAS ---
export async function getEvaluationsAction(courseFilter: string = "all") {
  try {
    const session = await auth();
    if (!session?.user) return [];

    let where: any = {};

    if (session.user.role === "PROFESSOR") {
      where.course = { professorId: session.user.id };
    }

    if (courseFilter !== "all") {
      where.course = {
        ...where.course,
        code: courseFilter
      };
    }
    
    const evals = await prisma.evaluation.findMany({
      where,
      include: { 
        course: { include: { professor: true } }, 
        student: true 
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return evals.map(e => ({
      id: e.id,
      course: e.course.code,
      courseName: e.course.name,
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

// --- 👇 NUEVA ACCIÓN: OBTENER CURSOS DEL PROFESOR (CON O SIN EVALUACIONES) 👇 ---
export async function getProfessorCoursesAction() {
  try {
    const session = await auth();
    if (!session?.user) return [];

    let where: any = {};
    
    // Si es PROFESOR, solo mostramos SUS cursos asignados
    if (session.user.role === "PROFESSOR") {
      where.professorId = session.user.id;
    }
    // Si es ADMIN, ve todos (where vacío)

    const courses = await prisma.course.findMany({
      where,
      select: {
        code: true,
        name: true,
        _count: {
          select: { evaluations: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return courses.map(c => ({
      code: c.code,
      name: c.name,
      count: c._count.evaluations
    }));
  } catch (error) { return []; }
}

export async function deleteEvaluationAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "No autorizado" };

    const evaluation = await prisma.evaluation.findUnique({
        where: { id },
        include: { course: true }
    });

    if (!evaluation) return { success: false, error: "No encontrada" };

    const isAdmin = session.user.role === "ADMIN";
    const isOwnerProfessor = session.user.role === "PROFESSOR" && evaluation.course.professorId === session.user.id;

    if (!isAdmin && !isOwnerProfessor) {
        return { success: false, error: "No tienes permiso" };
    }

    await prisma.evaluation.delete({ where: { id } });
    revalidatePath("/profesor");
    return { success: true };
  } catch (e) { return { success: false, error: "Error al eliminar" }; }
}

// --- GENERADORES ---
async function generateComprehensiveAnalysisAction(evaluations: any[], stats: any) {
  try {
    if (!evaluations || evaluations.length === 0) return { success: true, analysis: "<p>Sin datos suficientes.</p>" };

    const prompt = `
    Actúa como un consultor pedagógico experto. Analiza las siguientes evaluaciones docentes:
    
    DATOS:
    - Total: ${stats.totalEvaluations} evaluaciones.
    - Promedio General: ${stats.overallAverage}/5.
    - Promedios por área: Part ${stats.averageParticipation}, Clar ${stats.averageClarity}, Ritmo ${stats.averagePace}.
    - COMENTARIOS DE ALUMNOS: ${evaluations.slice(0, 15).map(e => `"${e.comments}"`).join(". ")}.

    INSTRUCCIONES DE FORMATO (IMPORTANTE):
    1. Responde ÚNICAMENTE con texto plano y profesional.
    2. NO utilices ninguna marca de formato (asteriscos, numerales, HTML, Markdown).
    3. Separa cada sección principal con saltos de línea para facilitar la lectura.
    4. Estructura la respuesta exactamente con los siguientes títulos de sección, seguidos de dos puntos:
    
    Resumen Ejecutivo: [Tu resumen aquí]
    
    Fortalezas y Debilidades: [Detalle de fortalezas]
    - Área de Mejora: [Detalle de áreas de mejora]
    
    Recomendaciones Estratégicas: [Recomendación 1]
    - [Recomendación 2]

    Mantén un tono profesional y directo.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const res = await model.generateContent(prompt);
    return { success: true, analysis: res.response.text().replace(/```html/g, '').replace(/```/g, '') };
  } catch (e) { return { success: false, error: "Error IA" }; }
}

export async function generateCourseAnalysisAction(course: string, evaluations: any[]) {
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

export async function generatePDFReportAction(evaluations: any[], stats: any) {
  const aiResult = await generateComprehensiveAnalysisAction(evaluations, stats);
  const aiContent = aiResult.analysis || "<p>Sin análisis disponible.</p>";
  return `<html><body><h1>Reporte Docente</h1><p>Promedio: ${stats.overallAverage}</p>${aiContent}</body></html>`;
}

// ==========================================
// 🏫 SECCIÓN: ADMIN (CRUD)
// ==========================================

export async function getAllUsersAction() {
  try {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, lastName: true, email: true, role: true, createdAt: true, _count: { select: { evaluations: true } } }
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

export async function createUserAction(data: any) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) return { success: false, error: "Correo registrado" };
    const hashedPassword = await bcrypt.hash(data.password, 10);
    await prisma.user.create({
      data: { ...data, password: hashedPassword, role: data.role as any },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (error) { return { success: false, error: "Error" }; }
}

export async function getAllCoursesAction() {
  try {
    const courses = await prisma.course.findMany({ include: { professor: true }, orderBy: { createdAt: 'desc' } });
    return { success: true, courses };
  } catch (e) { return { success: false, error: "Error" }; }
}

export async function createCourseAction(data: any) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };
    const exists = await prisma.course.findUnique({ where: { code: data.code } });
    if (exists) return { success: false, error: "Código existe" };
    await prisma.course.create({ data });
    revalidatePath("/admin");
    return { success: true };
  } catch (e) { return { success: false, error: "Error" }; }
}

export async function assignProfessorToCourseAction(courseId: string, professorId: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };
    await prisma.course.update({ where: { id: courseId }, data: { professorId } });
    revalidatePath("/admin");
    return { success: true };
  } catch (e) { return { success: false, error: "Error" }; }
}

export async function deleteCourseAction(courseId: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };
    await prisma.course.delete({ where: { id: courseId } });
    revalidatePath("/admin");
    return { success: true };
  } catch (e) { return { success: false, error: "Error" }; }
}