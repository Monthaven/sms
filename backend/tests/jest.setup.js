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

// Start an ephemeral HTTP server for tests so we can close it deterministically
let __listener = null;
try {
	const app = require('../src/server').default || require('../src/server');
	// listen on ephemeral port
	__listener = app.listen(0);
	// reduce keep-alive timers that can keep Node alive after tests
	try {
		if (typeof __listener.keepAliveTimeout !== 'undefined') __listener.keepAliveTimeout = 0;
		if (typeof __listener.headersTimeout !== 'undefined') __listener.headersTimeout = 0;
	} catch (e) {
		// ignore
	}
	try { __listener.unref && __listener.unref(); } catch (e) {}
	global.__TEST_SERVER__ = __listener;
	global.__TEST_APP__ = app;
	global.__TEST_LISTENER__ = __listener;
} catch (e) {
	// If the server can't be started for any reason, ensure tests still run and fail with clear message
	// eslint-disable-next-line no-console
	console.error('jest.setup: could not start test listener', e && e.stack ? e.stack : e);
}

// Ensure Prisma client disconnects and other resources are cleaned after tests
afterAll(async () => {
	try {
		const db = require('../src/db');
		if (db && db.prisma && typeof db.prisma.$disconnect === 'function') {
			await db.prisma.$disconnect();
		}
	} catch (e) {
		// ignore
	}

	// Close the test listener if started
	try {
		const srv = global.__TEST_LISTENER__ || __listener;
		if (srv && typeof srv.close === 'function') {
			await new Promise((resolve) => srv.close(resolve));
		}
	} catch (e) {
		// ignore
	}

	// Stop prom-client default metrics interval to avoid open handles
	try {
		const metrics = require('../src/metrics');
		if (metrics && typeof metrics.stopDefaultMetrics === 'function') {
			metrics.stopDefaultMetrics();
		}
		if (metrics && metrics.register && typeof metrics.register.clear === 'function') {
			metrics.register.clear();
		}
	} catch (e) {
		// ignore
	}

	// Try to destroy HTTP/HTTPS global agents to close any sockets
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
});
