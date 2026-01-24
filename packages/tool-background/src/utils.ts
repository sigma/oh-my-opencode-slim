/**
 * Agent variant utilities for resolving and applying model variants.
 */

import { log, type PluginConfig } from "@firefly-swarm/shared";

/**
 * Normalizes an agent name by trimming whitespace and removing the optional @ prefix.
 */
export function normalizeAgentName(agentName: string): string {
  const trimmed = agentName.trim();
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

/**
 * Resolves the variant configuration for a specific agent.
 */
export function resolveAgentVariant(
  config: PluginConfig | undefined,
  agentName: string
): string | undefined {
  const normalized = normalizeAgentName(agentName);
  const rawVariant = config?.agents?.[normalized]?.variant;

  if (typeof rawVariant !== "string") {
    return undefined;
  }

  const trimmed = rawVariant.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  log(`[variant] resolved variant="${trimmed}" for agent "${normalized}"`);
  return trimmed;
}

/**
 * Applies a variant to a request body if the body doesn't already have one.
 */
export function applyAgentVariant<T extends { variant?: string }>(
  variant: string | undefined,
  body: T
): T {
  if (!variant) {
    return body;
  }
  if (body.variant) {
    return body;
  }
  return { ...body, variant };
}
