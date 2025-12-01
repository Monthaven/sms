// Jest setup: force test DATABASE_URL and default API key
const path = require('path');
const devDb = path.resolve(__dirname, '../prisma/dev.db');
// Normalize to forward slashes for the file: URI on Windows
const devDbNormalized = devDb.replace(/\\/g, '/');

// Disable HTTP(S) agent keepAlive in tests to avoid open socket timeouts
try {
	require('http').globalAgent && (require('http').globalAgent.keepAlive = false);
	require('https').globalAgent && (require('https').globalAgent.keepAlive = false);
} catch (e) {
	// ignore
}

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

// Ensure Prisma client disconnects after tests to avoid open handles
afterAll(async () => {
	try {
		const db = require('../src/db');
		if (db && db.prisma && typeof db.prisma.$disconnect === 'function') {
			await db.prisma.$disconnect();
		}
	} catch (e) {
		// ignore
	}
	// Close the test HTTP server if started
	try {
		const srv = global.__TEST_SERVER__;
		if (srv && typeof srv.close === 'function') {
			await new Promise((resolve) => srv.close(resolve));
		}
	} catch (e) {
		// ignore
	}
});

// Also clear prom-client registry to stop its default collection interval
try {
	const metrics = require('../src/metrics');
	if (metrics && metrics.register && typeof metrics.register.clear === 'function') {
		metrics.register.clear();
	}
} catch (e) {
	// ignore
}

// Start an ephemeral HTTP server for tests so we can close it deterministically
try {
	const app = require('../src/server').default || require('../src/server');
	// listen on ephemeral port
	const srv = app.listen(0);
	// expose server to tests via global
	// reduce keep-alive timers that can keep Node alive after tests
	try {
		if (typeof srv.keepAliveTimeout !== 'undefined') srv.keepAliveTimeout = 0;
		if (typeof srv.headersTimeout !== 'undefined') srv.headersTimeout = 0;
	} catch (e) {
		// ignore
	}
	// allow process to exit if only the server remains
	try { srv.unref && srv.unref(); } catch (e) {}
	global.__TEST_SERVER__ = srv;
} catch (e) {
	// ignore if server cannot be started here
}

// Try to destroy HTTP/HTTPS global agents to close any sockets left by supertest
try {
	const http = require('http');
	if (http && http.globalAgent && typeof http.globalAgent.destroy === 'function') {
		http.globalAgent.destroy();
	}
	const https = require('https');
	if (https && https.globalAgent && typeof https.globalAgent.destroy === 'function') {
		https.globalAgent.destroy();
	}
} catch (e) {
	// ignore
}
