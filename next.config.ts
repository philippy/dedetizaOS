import type { NextConfig } from "next";

// Cabeçalhos de segurança básicos. Sem CSP completa de propósito: o Next injeta scripts inline e uma CSP
// estrita exigiria nonces; fica como evolução. frame-ancestors já cobre o clickjacking.
const cabecalhos = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: cabecalhos }];
  },
};
export default nextConfig;
