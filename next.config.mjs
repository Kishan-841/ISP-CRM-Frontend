/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy /api/* on the frontend domain to the backend host. With this in
  // place, https://crm.gazonindia.com/api/* hits crm.gazonindia.com on
  // Vercel, gets rewritten, and reaches the backend without exposing the
  // backend's hostname/IP. Lets external clients (e.g. SAM) keep using
  // CRM_API_BASE_URL=https://crm.gazonindia.com/api with no CORS hassle.
  //
  // Set BACKEND_API_URL in Vercel project settings (Production, Preview),
  // e.g. https://crm-backend.gazonindia.com/api. Do NOT prefix with
  // NEXT_PUBLIC_ — this is only used at the proxy layer, never in the
  // browser. If BACKEND_API_URL is unset (local dev), no rewrite is
  // emitted and the frontend talks to NEXT_PUBLIC_API_URL directly.
  async rewrites() {
    const backend = process.env.BACKEND_API_URL?.replace(/\/$/, '');
    if (!backend) return [];
    return [
      { source: '/api/:path*', destination: `${backend}/:path*` },
    ];
  },
};

export default nextConfig;
