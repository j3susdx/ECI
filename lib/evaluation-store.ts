"use client"

interface Evaluation {
  id: string
  course: string
  courseName: string
  date: string
  participation: number
  clarity: number
  pace: number
  comments?: string
  studentName?: string
  aiAnalysis?: string
}

const evaluations: Evaluation[] = []

export function getEvaluations(): Evaluation[] {
  return evaluations
}

export function addEvaluation(evaluation: Omit<Evaluation, "id" | "date">): void {
  const newEvaluation: Evaluation = {
    ...evaluation,
    id: Date.now().toString(),
    date: new Date().toISOString().split("T")[0],
  }
  evaluations.unshift(newEvaluation)
}

export function getEvaluationsByCourse(course: string): Evaluation[] {
  return evaluations.filter((evaluation) => evaluation.course === course)
}

export function getStatistics() {
  if (evaluations.length === 0) {
    return {
      overallAverage: 0,
      weeklyProgress: 0,
      bestAspect: "N/A",
      improvementArea: "N/A",
      totalEvaluations: 0,
      thisWeekEvaluations: 0,
      averageParticipation: 0,
      averageClarity: 0,
      averagePace: 0,
    }
  }

  const totalParticipation = evaluations.reduce((sum, evaluation) => sum + evaluation.participation, 0)
  const totalClarity = evaluations.reduce((sum, evaluation) => sum + evaluation.clarity, 0)
  const totalPace = evaluations.reduce((sum, evaluation) => sum + evaluation.pace, 0)

  const averageParticipation = totalParticipation / evaluations.length
  const averageClarity = totalClarity / evaluations.length
  const averagePace = totalPace / evaluations.length

  const overallAverage = (averageParticipation + averageClarity + averagePace) / 3

  // Calculate this week's evaluations
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const thisWeekEvaluations = evaluations.filter((evaluation) => new Date(evaluation.date) >= oneWeekAgo).length

  // Determine best aspect and improvement area
  const aspects = {
    Participación: averageParticipation,
    Claridad: averageClarity,
    Ritmo: averagePace,
  }

  const bestAspect = Object.entries(aspects).reduce((a, b) => (aspects[a[0]] > aspects[b[0]] ? a : b))[0]

  const improvementArea = Object.entries(aspects).reduce((a, b) => (aspects[a[0]] < aspects[b[0]] ? a : b))[0]

  return {
    overallAverage: Math.round(overallAverage * 10) / 10,
    weeklyProgress: Math.min(100, (thisWeekEvaluations / 4) * 100), // Assuming 4 evaluations per week target
    bestAspect,
    improvementArea,
    totalEvaluations: evaluations.length,
    thisWeekEvaluations,
    averageParticipation: Math.round(averageParticipation * 10) / 10,
    averageClarity: Math.round(averageClarity * 10) / 10,
    averagePace: Math.round(averagePace * 10) / 10,
  }
}

export function getStatisticsByCourse(course: string) {
  const courseEvaluations = getEvaluationsByCourse(course)

  if (courseEvaluations.length === 0) {
    return {
      overallAverage: 0,
      totalEvaluations: 0,
      averageParticipation: 0,
      averageClarity: 0,
      averagePace: 0,
    }
  }

  const totalParticipation = courseEvaluations.reduce((sum, evaluation) => sum + evaluation.participation, 0)
  const totalClarity = courseEvaluations.reduce((sum, evaluation) => sum + evaluation.clarity, 0)
  const totalPace = courseEvaluations.reduce((sum, evaluation) => sum + evaluation.pace, 0)

  const averageParticipation = totalParticipation / courseEvaluations.length
  const averageClarity = totalClarity / courseEvaluations.length
  const averagePace = totalPace / courseEvaluations.length

  const overallAverage = (averageParticipation + averageClarity + averagePace) / 3

  return {
    overallAverage: Math.round(overallAverage * 10) / 10,
    totalEvaluations: courseEvaluations.length,
    averageParticipation: Math.round(averageParticipation * 10) / 10,
    averageClarity: Math.round(averageClarity * 10) / 10,
    averagePace: Math.round(averagePace * 10) / 10,
  }
}
