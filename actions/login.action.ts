"use server";

import { signIn } from "@/lib/auth";
import { comparePassword } from "@/lib/crypt";
import { prisma } from "@/lib/db";
import loginSchema from "@/schemas/login.schema";
import { z } from "zod";
import { AuthError } from "next-auth";

type AuthResponse = {
    success: boolean;
    message: string;
    error?: string;
    status: 'success' | 'error' | 'unauthorized';
    role?: string; // Agregar el rol en la respuesta
};

export async function loginAction(
    values: z.infer<typeof loginSchema>
): Promise<AuthResponse> {
    try {
        const { data, success } = loginSchema.safeParse(values);

        if (!success) {
            return {
                success: false,
                message: "Validation failed",
                error: "Validation failed",
                status: 'error'
            };
        }

        const { email, password } = data;

        const existingUser = await prisma.user.findFirst({
            where: { email: email },
        });
        
        if (!existingUser) {
            return {
                success: false,
                message: "User not found",
                error: "User not found",
                status: "error",
            };
        }

        const passwordMatch = await comparePassword(
            password,
            existingUser.password as string
        );
        
        console.log({passwordMatch})
        
        if (!passwordMatch) {
            return {
                success: false,
                message: "Invalid credentials",
                error: "Invalid credentials",
                status: "unauthorized",
            };
        }

        // Intentar el signIn con NextAuth
        const result = await signIn("credentials", {
            email: email,
            password: password,
            redirect: false,
        });

        if (result?.error) {
            return {
                success: false,
                message: "Authentication failed",
                error: result.error,
                status: "unauthorized",
            };
        }

        // Retornar el rol del usuario para la redirección en el cliente
        return {
            success: true,
            message: "Logged in successfully",
            status: 'success',
            role: existingUser.role // Incluir el rol en la respuesta
        };

    } catch (error) {
        console.error("Login error:", error);
        
        if (error instanceof AuthError) {
            return {
                success: false,
                message: "Authentication error",
                error: error.message,
                status: "unauthorized",
            };
        }
        
        return {
            success: false,
            message: "Internal server error",
            error: "An unexpected error occurred",
            status: "error",
        };
    }
}