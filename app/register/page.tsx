"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { registerSchema } from "@/schemas/register.schema";
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
import { GraduationCap, BookOpen, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner"; // o usar toast de react-hot-toast
import { registerAction } from "@/actions/register.action";
import { useRouter } from "next/navigation";

type RegisterFormData = {
  name: string;
  lastName: string;
  email: string;
  password: string;
};

function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  const route = useRouter();

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    try {
      const result = await registerAction(data);

      if (result.success) {
        toast.success("¡Registro exitoso! Redirigiendo...");
        // Aquí puedes redirigir al login o dashboard
        route.push("/login");
      } else {
        if (result.fieldErrors) {
          result.fieldErrors.forEach((fieldError) => {
            setError(fieldError.field as keyof RegisterFormData, {
              type: "server",
              message: fieldError.message,
            });
          });
        } else {
          toast.error(result.error || "Error en el registro");
        }
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
              EduRate
            </h1>
          </div>

          <Link href="/login">
            <Button
              variant="ghost"
              className="mb-4 gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al login
            </Button>
          </Link>

          <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 leading-tight">
            Únete a
            <span className="block text-transparent bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text">
              EduRate
            </span>
          </h2>

          <p className="text-xl text-gray-600 max-w-lg mx-auto lg:mx-0">
            Regístrate para comenzar a calificar profesores y contribuir a
            mejorar la educación.
          </p>

          {/* Beneficios */}
          <div className="space-y-4 max-w-md mx-auto lg:mx-0">
            <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-800">
                  Califica Anónimamente
                </h3>
                <p className="text-sm text-gray-600">
                  Tu identidad está protegida
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-800">
                  Comentarios Constructivos
                </h3>
                <p className="text-sm text-gray-600">
                  Ayuda a mejorar la enseñanza
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border">
              <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-800">
                  Comunidad Verificada
                </h3>
                <p className="text-sm text-gray-600">Solo estudiantes reales</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sección derecha - Formulario de registro */}
        <div className="w-full lg:w-1/2 max-w-md">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold text-gray-800">
                Crear Cuenta
              </CardTitle>
              <CardDescription className="text-gray-600">
                Completa tus datos para registrarte
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700">
                      Nombres
                    </Label>
                    <Input
                      id="name"
                      placeholder="Tu nombre"
                      {...register("name")}
                      className="h-12"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-gray-700">
                      Apellidos
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Tus apellidos"
                      {...register("lastName")}
                      className="h-12"
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-600">
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

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
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <BookOpen className="h-4 w-4 mr-2" />
                  )}
                  {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  ¿Ya tienes una cuenta?{" "}
                  <Link href="/login">
                    <Button variant="link" className="p-0 h-auto text-blue-600">
                      Inicia sesión aquí
                    </Button>
                  </Link>
                </p>
              </div>

              <p className="text-xs text-center text-gray-500 px-4">
                Tu información está protegida y se usa únicamente para verificar
                tu identidad.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
