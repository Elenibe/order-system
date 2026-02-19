/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // For better performance
  swcMinify: true,
  
  // Image optimization
  images: {
    domains: ['ynrninadfnmjjrmzcmia.supabase.co'],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;