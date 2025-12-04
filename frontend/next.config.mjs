/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // Force IPv4 to avoid Node.js v17+ preference for IPv6 (::1)
        destination: 'http://127.0.0.1:4000/api/:path*', 
      },
    ];
  },
};

export default nextConfig;
