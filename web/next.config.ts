import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig: NextConfig = {
  // Include parent directory so `data/` is available in Vercel serverless
  outputFileTracingRoot: path.join(__dirname, "../"),
  // Explicitly include data/ files in the serverless function bundle
  outputFileTracingIncludes: {
    "/*": ["../data/**/*"],
  },
};

export default nextConfig;
