/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure we can import from workspace packages if needed, though usually transpilation is handled by next
  transpilePackages: ["@plight/sdk"],
  webpack: (config) => {
    // Enable WASM imports if needed, though sdk handles URL fetching usually
    // config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      readline: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      constants: false,
    };
    // Ignore web-worker warning
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };
    return config;
  },
};

module.exports = nextConfig;
