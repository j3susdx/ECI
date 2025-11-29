import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth(async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const session = await auth();
  
  const isLoggedIn = !!session?.user;
  const userRole = session?.user?.role as string;
  const path = nextUrl.pathname;

  // Rutas públicas
  const publicPaths = ["/", "/login", "/register"];
  const isPublicPath = publicPaths.includes(path);

  // Si no está logueado y no es ruta pública → login
  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Si está logueado y en ruta de auth → redirigir según rol
  if (isLoggedIn && (path === "/login" || path === "/register" || path === "/")) {
    const redirectPath = 
      userRole === "STUDENT" ? "/estudiantes" :
      userRole === "PROFESSOR" ? "/profesor" : // Corregido a /profesores
      userRole === "ADMIN" ? "/admin" : "/dashboard";
    
    return NextResponse.redirect(new URL(redirectPath, nextUrl));
  }

  // Protección por roles - Si intenta acceder a ruta de otro rol, redirigir a su vista correspondiente
  if (isLoggedIn) {
    // Si es STUDENT e intenta acceder a ruta de PROFESSOR
    if ((path.startsWith("/profesor") || path.startsWith("/profesor")) && userRole === "STUDENT") {
      return NextResponse.redirect(new URL("/estudiantes", nextUrl));
    }
    
    // Si es PROFESSOR e intenta acceder a ruta de STUDENT
    if (path.startsWith("/estudiantes") && userRole === "PROFESSOR") {
      return NextResponse.redirect(new URL("/profesor", nextUrl));
    }
    
    // Si es STUDENT o PROFESSOR e intenta acceder a ADMIN
    if (path.startsWith("/admin") && (userRole === "STUDENT" || userRole === "PROFESSOR")) {
      return NextResponse.redirect(new URL("/unauthorized", nextUrl));
    }

    // Si es ADMIN e intenta acceder a rutas de STUDENT o PROFESSOR
    if ((path.startsWith("/estudiantes") || path.startsWith("/profesor")) && userRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};