import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer", "@libsql/client"],
  outputFileTracingIncludes: {
    "/semanas/[id]/pdf": ["./public/logo.png"],
  },
};

export default nextConfig;
