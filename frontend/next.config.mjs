/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence multi-lockfile warning by pinning the tracing root to this app.
  outputFileTracingRoot: process.cwd(),
  // No rewrites needed. Frontend uses Server Actions to talk to the DB directly.
};

export default nextConfig;
