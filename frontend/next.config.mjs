/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy API requests to backend during development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:3001/api'}/:path*`,
      },
    ];
  },
  images: {
    domains: ['graph.microsoft.com', 'lh3.googleusercontent.com'],
  },
};

export default nextConfig;
