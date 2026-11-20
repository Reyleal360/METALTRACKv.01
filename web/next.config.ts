import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // v1: app privada con datos en vivo (todo se lee por petición), no se usa caché de componentes.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
