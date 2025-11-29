import { PrismaClient } from '@prisma/client'
// Si no tienes bcryptjs instalado y da error, comenta esta línea y usa el string directo abajo
import { hash } from 'bcryptjs' 

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando sembrado automático...')

  // 1. Intentar buscar CUALQUIER usuario existente para hacerlo profesor
  let professor = await prisma.user.findFirst()

  // 2. Si la base de datos está vacía (no hay usuarios), creamos uno por defecto
  if (!professor) {
    console.log('⚠️ No se encontraron usuarios. Creando un Profesor por defecto...')
    
    // Hash de contraseña "123456"
    // Si no tienes bcrypt, usa este string: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4hZ.a/jG/m"
    const passwordHash = await hash('123456', 12) 

    professor = await prisma.user.create({
      data: {
        email: 'admin@ecirate.com',
        name: 'Profesor',
        lastName: 'Admin',
        password: passwordHash,
        role: 'PROFESSOR',
      },
    })
    console.log('✅ Usuario Admin creado: admin@ecirate.com / 123456')
  } else {
    console.log(`✅ Usuario encontrado: ${professor.email}. Se le asignarán los cursos.`)
  }

  // 3. Lista de cursos (con el ID del usuario que encontramos o creamos)
  const courses = [
    {
      code: 'big-data',
      name: 'Big Data - Análisis de Grandes Volúmenes de Datos',
      description: 'Curso avanzado sobre análisis de grandes volúmenes de datos',
      professorId: professor.id,
    },
    {
      code: 'telecomunicaciones',
      name: 'Telecomunicaciones - Sistemas de Comunicación',
      description: 'Fundamentos de sistemas de telecomunicaciones',
      professorId: professor.id,
    },
    {
      code: 'computacion-nube',
      name: 'Computación en la Nube - Cloud Computing',
      description: 'Arquitecturas y servicios en la nube',
      professorId: professor.id,
    },
    {
      code: 'etica-profesionalismo',
      name: 'Ética y Profesionalismo - Valores Profesionales',
      description: 'Ética profesional en el ámbito tecnológico',
      professorId: professor.id,
    },
    {
      code: 'inteligencia-negocios',
      name: 'Inteligencia de Negocios - Business Intelligence',
      description: 'Herramientas y técnicas de BI',
      professorId: professor.id,
    },
    {
      code: 'metodologias-agiles',
      name: 'Metodologías Ágiles - Desarrollo de Software',
      description: 'Metodologías ágiles en desarrollo de software',
      professorId: professor.id,
    },
  ]

  // 4. Insertar o Actualizar cursos
  for (const courseData of courses) {
    await prisma.course.upsert({
      where: { code: courseData.code },
      update: { professorId: professor.id }, // Actualiza el dueño si ya existe
      create: courseData,
    })
  }

  console.log(`✅ ¡Listo! Se han sembrado ${courses.length} cursos asignados a ${professor.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })