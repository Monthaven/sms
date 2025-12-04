#!/usr/bin/env node
const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

function copySchema() {
  const src = path.resolve(__dirname, '..', 'backend', 'prisma', 'schema.prisma');
  const destDir = path.resolve(__dirname, '..', 'frontend', 'prisma');
  const dest = path.join(destDir, 'schema.prisma');

  if (!fs.existsSync(src)) {
    console.error('Source schema not found:', src);
    process.exit(2);
  }
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(src, dest);
  console.log('Copied schema.prisma to frontend/prisma/schema.prisma');
}

function runPrismaGenerate(targetDir) {
  console.log(`Running prisma generate in ${targetDir}`);
  const opts = { stdio: 'inherit', shell: true, cwd: targetDir };
  const res = spawnSync('npx prisma generate', opts);
  if (res.error) {
    console.error('Failed to run prisma generate in', targetDir, res.error);
    process.exit(res.status || 1);
  }
}

try {
  copySchema();
  runPrismaGenerate(path.resolve(__dirname, '..', 'frontend'));
  runPrismaGenerate(path.resolve(__dirname, '..', 'backend'));
  console.log('db:sync complete');
} catch (err) {
  console.error('db:sync failed:', err);
  process.exit(1);
}
