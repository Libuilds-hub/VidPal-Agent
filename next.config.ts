import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is already enabled via --turbo flag in package.json
  // Exclude heavy server-only packages from client bundle compilation
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "yt-dlp-wrap-plus",
  ],

};

export default nextConfig;
