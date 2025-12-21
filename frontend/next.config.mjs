import path from "path";
import { fileURLToPath } from "url";

/** @type {import('next').NextConfig} */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  // No rewrites needed. Frontend uses Server Actions to talk to the DB directly.
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
