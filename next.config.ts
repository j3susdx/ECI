// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "26.29.91.16",
    "localhost",
    "127.0.0.1",
    "*.mi-dominio.dev"
  ],

  // Si usas una versión donde aún estaba bajo "experimental", puedes habilitarlo así:
  // experimental: {
  //   // @ts-expect-error
  //   allowedDevOrigins: ["26.29.91.16", "localhost", "127.0.0.1"]
  // },
};

export default nextConfig;
