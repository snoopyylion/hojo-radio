/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // ... other config options
};

module.exports = nextConfig;

// Alternative syntax (if you prefer domains instead of remotePatterns):
// const nextConfig = {
//   images: {
//     domains: [
//       'www.gravatar.com',
//       'images.clerk.dev',
//       'img.clerk.com',
//       'cdn.sanity.io'
//     ],
//   },
// }
// 
// module.exports = nextConfig