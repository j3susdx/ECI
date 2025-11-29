import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  // Configuración compatible con Edge (Middleware)
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login", // Redirigir aquí si no hay sesión
  },
  callbacks: {
    // 1. Lógica de Protección de Rutas (Middleware)
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      
      // Rutas protegidas
      const isOnDashboard = 
        nextUrl.pathname.startsWith("/profesor") || 
        nextUrl.pathname.startsWith("/estudiantes") || 
        nextUrl.pathname.startsWith("/admin");
      
      // Rutas de autenticación (Login/Registro)
      const isOnAuth = 
        nextUrl.pathname.startsWith("/login") || 
        nextUrl.pathname.startsWith("/register");

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirigir a login si no está logueado
      } else if (isOnAuth) {
        if (isLoggedIn) {
          // Si ya está logueado, mandarlo a su dashboard principal
          // (Por defecto profesor, o podrías chequear el rol aquí si lo tuvieras en el token)
          return Response.redirect(new URL("/profesor", nextUrl)); 
        }
        return true;
      }
      return true;
    },
    
    // 2. Pasar datos al Token (ID y Rol)
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }
      return token;
    },
    
    // 3. Pasar datos a la Sesión del Cliente (useSession)
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  providers: [], // IMPORTANTE: Dejar vacío aquí. Los proveedores van en auth.ts
} satisfies NextAuthConfig;