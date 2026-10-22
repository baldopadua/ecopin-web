function serviceOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
    return url.origin;
  } catch {
    throw new Error('Invalid public service URL');
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: false,
  reactCompiler: false,
  compiler: { removeConsole: { exclude: ['error', 'warn'] } },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/**',
      }
    ],
  },
  async headers() {
    const backend = serviceOrigin(process.env.NEXT_PUBLIC_BACKEND_API_URL);
    const database = serviceOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const site = serviceOrigin(process.env.FRONTEND_URL);
    const isDev = process.env.NODE_ENV === 'development';
    const realtime = database?.replace(/^http/, 'ws');
    const services = [backend, database].filter(Boolean);
    const policy = [
      "default-src 'self'",
      // Static Next bootstrap needs inline scripts; event-handler attributes do not.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `img-src 'self' data: blob: ${services.join(' ')} https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://cdnjs.cloudflare.com https://images.unsplash.com https://ui-avatars.com https://res.cloudinary.com`,
      `connect-src 'self' ${[...services, realtime].filter(Boolean).join(' ')} https://router.project-osrm.org https://api.open-meteo.com${isDev ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
      "worker-src 'self' blob:",
      `media-src 'self' blob: data: ${services.join(' ')} https://res.cloudinary.com`,
      "object-src 'none'",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    const headers = [
      { key: 'Content-Security-Policy', value: policy },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ];
    if (site?.startsWith('https:') && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(site).hostname)) {
      const isProductionStrict = process.env.STRICT_HSTS === 'true' || new URL(site).hostname === 'app.ecopin.ph';
      headers.push({
        key: 'Strict-Transport-Security',
        value: isProductionStrict
          ? 'max-age=31536000; includeSubDomains; preload'
          : 'max-age=86400',
      });
    }
    const internalCacheControl = [
      { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
      { key: 'Pragma', value: 'no-cache' },
      { key: 'Expires', value: '0' },
      { key: 'Surrogate-Control', value: 'no-store' },
      { key: 'CDN-Cache-Control', value: 'no-store' },
    ];
    return [
      { source: '/:path*', headers },
      { source: '/dashboard', headers: internalCacheControl },
      { source: '/dashboard/:path*', headers: internalCacheControl },
      { source: '/force-change-password', headers: internalCacheControl },
      { source: '/force-change-password/:path*', headers: internalCacheControl },
      { source: '/api/session/:path*', headers: internalCacheControl },
      { source: '/api/backend/:path*', headers: internalCacheControl },
      { source: '/api/tasks/auto-generate/:path*', headers: internalCacheControl },
    ];
  },
};

export default nextConfig;
