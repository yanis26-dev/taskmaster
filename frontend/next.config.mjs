/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Proxy API requests to backend (works in prod too, if BACKEND_INTERNAL_URL is set)
  async rewrites() {
    const base =
      process.env.BACKEND_INTERNAL_URL ??
      "http://localhost:3001";

    return [
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