/**
 * Metrics emitter backed by Prisma (MetricsEvent table).
 * Metabase can read from the same database for dashboards.
 */

import { prisma } from "@/lib/db";
import { logger } from "./logger";

type Labels = Record<string, string | number | boolean | undefined>;

const METRICS_ENABLED = process.env.METRICS_ENABLED === "true";

function cleanLabels(labels?: Labels): Record<string, any> | undefined {
  if (!labels) return undefined;
  const entries = Object.entries(labels).filter(([, v]) => v !== undefined);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

async function recordMetric(name: string, type: "counter" | "gauge" | "timer", value?: number, labels?: Labels) {
  if (!METRICS_ENABLED) return;
  try {
    await prisma.metricsEvent.create({
      data: {
        name,
        type,
        value,
        labels: cleanLabels(labels),
      },
    });
  } catch (err: any) {
    logger.debug("metric.emit.failed", { name, error: err?.message || String(err) });
  }
}

export function incrementCounter(name: string, labels?: Labels) {
  return recordMetric(name, "counter", 1, labels);
}

export function observeDuration(name: string, ms: number, labels?: Labels) {
  return recordMetric(name, "timer", ms, labels);
}

export function recordGauge(name: string, value: number, labels?: Labels) {
  return recordMetric(name, "gauge", value, labels);
}
