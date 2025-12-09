import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config"; // 👈 CLAVE: Importamos el archivo ligero sin Prisma
import { NextResponse } from "next/server";

// Inicializamos NextAuth con la config ligera para obtener la función 'auth'
const { auth } = NextAuth(authConfig);

export default auth(async function middleware(req) {
  const { nextUrl } = req;
  // En NextAuth v5 middleware, la sesión viene inyectada en req.auth
  const session = req.auth;
  
  const isLoggedIn = !!session?.user;
  // @ts-ignore: TypeScript puede quejarse del rol personalizado, lo ignoramos seguro aquí
  const userRole = session?.user?.role as string;
  const path = nextUrl.pathname;

  // Rutas públicas
  const publicPaths = ["/", "/login", "/register"];
  const isPublicPath = publicPaths.includes(path);

  // 1. Si no está logueado y no es ruta pública → login
  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // 2. Si está logueado y está en ruta de auth (login/register) → redirigir a su dashboard
  if (isLoggedIn && (path === "/login" || path === "/register" || path === "/")) {
    const redirectPath = 
      userRole === "STUDENT" ? "/estudiantes" :
      userRole === "PROFESSOR" ? "/profesor" :
      userRole === "ADMIN" ? "/admin" : "/dashboard";
    
    return NextResponse.redirect(new URL(redirectPath, nextUrl));
  }

  // 3. Protección por roles (Tu lógica original intacta)
  if (isLoggedIn) {
    // Si es STUDENT e intenta acceder a ruta de PROFESSOR
    if (path.startsWith("/profesor") && userRole === "STUDENT") {
      return NextResponse.redirect(new URL("/estudiantes", nextUrl));
    }
    
    // Si es PROFESSOR e intenta acceder a ruta de STUDENT
    if (path.startsWith("/estudiantes") && userRole === "PROFESSOR") {
      return NextResponse.redirect(new URL("/profesor", nextUrl));
    }
    
    // Si es STUDENT o PROFESSOR e intenta acceder a ADMIN
    if (path.startsWith("/admin") && (userRole === "STUDENT" || userRole === "PROFESSOR")) {
      // Puedes redirigirlos a una página 403 o a su home. Aquí los mando a login o unauthorized
      return NextResponse.redirect(new URL("/login", nextUrl)); 
    }

    // Si es ADMIN e intenta acceder a rutas de STUDENT o PROFESSOR
    if ((path.startsWith("/estudiantes") || path.startsWith("/profesor")) && userRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  // Excluir rutas estáticas, imágenes y api internas para no procesar de más
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};