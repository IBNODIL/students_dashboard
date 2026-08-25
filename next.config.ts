import type { NextConfig } from "next";
 
const nextConfig: NextConfig = {
  // Required for self-hosted/standalone deployment (VPS, Docker, etc.)
  output: "standalone",
 
  // Allows the Next.js DEV server to accept requests coming through the
  // ngrok tunnel (otherwise dev-mode cross-origin protection silently
  // blocks requests like HMR and can interfere with form submissions).
  // Update this if your ngrok URL changes between sessions.
  allowedDevOrigins: ["excitable-flagpole-disallow.ngrok-free.dev"],
};
 
export default nextConfig;
