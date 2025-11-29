"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import loginSchema from "@/schemas/login.schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Star, Users, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { loginAction } from "@/actions/login.action";

type LoginFormData = {
  email: string;
  password: string;
  remember?: boolean;
};

function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const getRedirectPath = (role: string) => {
    switch (role) {
      case "STUDENT":
        return "/estudiantes";
      case "PROFESSOR":
        return "/profesor";
      case "ADMIN":
        return "/admin";
      default:
        return "/dashboard";
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const result = await loginAction({
        email: data.email,
        password: data.password,
      });

      if (result.success && result.role) {
        const redirectPath = getRedirectPath(result.role);
        toast.success(`¡Inicio de sesión exitoso! Redirigiendo...`);

        // Redirigir según el rol
        router.push(redirectPath);
        router.refresh(); // Refrescar para actualizar la sesión
      } else {
        toast.error(result.error || "Error en el inicio de sesión");

        setError("email", {
          type: "server",
          message: " ",
        });
        setError("password", {
          type: "server",
          message: " ",
        });
      }
    } catch (error) {
      toast.error("Error inesperado. Por favor, intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center gap-8">
        {/* Sección izquierda - Información */}
        <div className="w-full lg:w-1/2 text-center lg:text-left space-y-6">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ECI
            </h1>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 leading-tight">
            Tu opinión
            <span className="block text-transparent bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text">
              construye mejor educación
            </span>
          </h2>

          <p className="text-xl text-gray-600 max-w-lg mx-auto lg:mx-0">
            Califica a tus profesores de manera anónima y ayuda a mejorar la
            calidad educativa para todos.
          </p>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <Users className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">10K+</div>
              <div className="text-sm text-gray-600">Estudiantes</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <GraduationCap className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">500+</div>
              <div className="text-sm text-gray-600">Profesores</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border col-span-2 lg:col-span-1">
              <Star className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">25K+</div>
              <div className="text-sm text-gray-600">Calificaciones</div>
            </div>
          </div>
        </div>

        {/* Sección derecha - Formulario de login */}
        <div className="w-full lg:w-1/2 max-w-md">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold text-gray-800">
                Iniciar Sesión
              </CardTitle>
              <CardDescription className="text-gray-600">
                Accede a tu cuenta para calificar profesores
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">
                    Correo Electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu.correo@ejemplo.com"
                    {...register("email")}
                    className="h-12"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...register("password")}
                    className="h-12"
                  />
                  {errors.password && (
                    <p className="text-sm text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    "Iniciar Sesión"
                  )}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  ¿No tienes una cuenta?{" "}
                  <Link href="/register">
                    <Button variant="link" className="p-0 h-auto text-blue-600">
                      Regístrate aquí
                    </Button>
                  </Link>
                </p>
              </div>

              <p className="text-xs text-center text-gray-500 px-4">
                Al iniciar sesión, aceptas nuestros{" "}
                <Button variant="link" className="p-0 h-auto text-blue-600">
                  Términos de servicio
                </Button>{" "}
                y{" "}
                <Button variant="link" className="p-0 h-auto text-blue-600">
                  Política de privacidad
                </Button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
