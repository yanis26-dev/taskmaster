/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  async rewrites() {
    const base = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:3001";

    return [
      // ✅ Let NextAuth stay on the frontend (do NOT proxy these)
      {
        source: "/api/auth/:path*",
        destination: "/api/auth/:path*",
      },

      // ✅ Proxy everything else under /api to backend
      {
        source: "/api/:path*",
        destination: `${base}/api/:path*`,
      },
    ];
  },

  images: {
    domains: ["graph.microsoft.com", "lh3.googleusercontent.com"],
  },
};

export default nextConfig;