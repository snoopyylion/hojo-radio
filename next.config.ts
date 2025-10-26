/** @type {import('next').NextConfig} */
const nextConfig = {
  turbo: false, // Added this line to disable Turbopack
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.gravatar.com',
        port: '',
        pathname: '/avatar/**',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'www.val9ja.com.ng',
        port: '',
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: 'https',
        hostname: 'example.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'rogsovedqofvhgdrnyri.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
    domains: [
      'rogsovedqofvhgdrnyri.supabase.co',
      'www.gravatar.com',
      'images.clerk.dev',
      'img.clerk.com',
      'cdn.sanity.io',
      'example.com',
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

module.exports = nextConfig;