// Jest setup: force test DATABASE_URL and default API key
const path = require('path');
const devDb = path.resolve(__dirname, '../prisma/dev.db');
// Normalize to forward slashes for the file: URI on Windows
const devDbNormalized = devDb.replace(/\\/g, '/');

// If running in GitHub Actions, do not override DATABASE_URL (CI provides Postgres).
if (!process.env.GITHUB_ACTIONS) {
	process.env.DATABASE_URL = process.env.DATABASE_URL || `file:${devDbNormalized}`;
}
// Local defaults for other required env vars so tests don't throw on startup.
if (!process.env.GITHUB_ACTIONS) {
	process.env.DIRECT_URL = process.env.DIRECT_URL || `file:${devDbNormalized}`;
	process.env.EZTEXTING_API_KEY = process.env.EZTEXTING_API_KEY || 'test-eztexting-key';
	process.env.EZTEXTING_API_BASE = process.env.EZTEXTING_API_BASE || 'https://api.eztexting.com';
	process.env.IMPORT_API_KEY = process.env.IMPORT_API_KEY || 'test-key';
} else {
	process.env.IMPORT_API_KEY = process.env.IMPORT_API_KEY || 'test-key';
}
