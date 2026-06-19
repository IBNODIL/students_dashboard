import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: "output: standalone" was removed for Vercel deployment.
  // That setting is meant for self-hosted/Docker/Netlify-style deploys —
  // Vercel has its own build output format and handles this automatically.
  // If you ever move back to Netlify or self-hosting, re-add:
  //   output: "standalone",
};

export default nextConfig;