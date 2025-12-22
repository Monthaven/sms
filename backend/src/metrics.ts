/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import client from 'prom-client';

const register = new client.Registry();
// collectDefaultMetrics returns the interval object in prom-client; keep a reference so tests can stop it
// collectDefaultMetrics may return void in some versions; cast to any to allow clearing when available
const defaultMetricsInterval: any = client.collectDefaultMetrics({ register });

function stopDefaultMetrics(): void {
	try {
		// Attempt to clear interval if prom-client returned one
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		clearInterval(defaultMetricsInterval as any);
	} catch (e) {
		// ignore
	}
}

export { client, register, stopDefaultMetrics };
