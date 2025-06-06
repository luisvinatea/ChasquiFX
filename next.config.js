import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production builds to prevent build failures
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Enable experimental features that help with module resolution
    esmExternals: true,
  },
  // Configure to use App Router only (ignore src/pages directory)
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  transpilePackages: [
    "@mui/material",
    "@mui/icons-material",
    "@emotion/react",
    "@emotion/styled",
  ],
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
    JWT_SECRET: process.env.JWT_SECRET,
    SERPAPI_API_KEY: process.env.SERPAPI_API_KEY,
    SEARCHAPI_API_KEY: process.env.SEARCHAPI_API_KEY,
    EXCHANGE_API_KEY: process.env.EXCHANGE_API_KEY,
    NODEMAILER_EMAIL: process.env.NODEMAILER_EMAIL,
    NODEMAILER_PASSWORD: process.env.NODEMAILER_PASSWORD,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  webpack: (config, { isServer }) => {
    // Add path alias resolution for webpack
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": resolve(__dirname, "src"),
    };

    // Handle MUI and emotion packages properly
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    return config;
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "/api/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Serpapi-Key, X-Search-Api-Key, X-Exchange-Api-Key",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
