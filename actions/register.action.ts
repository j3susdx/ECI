"use server";

import { hash } from "bcryptjs";
import { registerSchema } from "@/schemas/register.schema";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function registerAction(values: z.infer<typeof registerSchema>) {
  try {
    // Validar los datos con Zod
    const validatedData = registerSchema.parse(values);

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return {
        success: false,
        error: "Ya existe un usuario con este correo electrónico",
      };
    }

    // Hashear la contraseña
    const hashedPassword = await hash(validatedData.password, 12);

    // Crear el usuario en la base de datos
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        lastName: validatedData.lastName,
        email: validatedData.email,
        password: hashedPassword,
        role: "STUDENT", // Valor por defecto según tu schema
      },
    });

    // Excluir la contraseña del objeto de retorno
    const { password: _, ...userWithoutPassword } = user;

    return {
      success: true,
      message: "Usuario registrado exitosamente",
      user: userWithoutPassword,
    };
  } catch (error) {
    console.error("Error en registro:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Datos de formulario inválidos",
        fieldErrors: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      };
    }

    return {
      success: false,
      error: "Error interno del servidor. Por favor, intenta nuevamente.",
    };
  }
}