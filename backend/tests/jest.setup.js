// Jest setup: force test DATABASE_URL and default API key
const path = require('path');
const devDb = path.resolve(__dirname, '../prisma/dev.db');
// Normalize to forward slashes for the file: URI on Windows
const devDbNormalized = devDb.replace(/\\/g, '/');

// If running in GitHub Actions, do not override DATABASE_URL (CI provides Postgres).
if (!process.env.GITHUB_ACTIONS) {
	process.env.DATABASE_URL = process.env.DATABASE_URL || `file:${devDbNormalized}`;
}
process.env.IMPORT_API_KEY = process.env.IMPORT_API_KEY || 'test-key';
