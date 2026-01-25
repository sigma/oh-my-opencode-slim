import { log } from "@firefly-swarm/shared";

// Cache server availability check
let serverAvailable: boolean | null = null;
let serverCheckUrl: string | null = null;

/**
 * Reset the server availability cache (useful when server might have started)
 */
export function resetServerCheck(): void {
  serverAvailable = null;
  serverCheckUrl = null;
}

/**
 * Check if the OpenCode HTTP server is actually running.
 */
export async function isServerRunning(serverUrl: string): Promise<boolean> {
  // Use cached result if checking the same URL
  if (serverCheckUrl === serverUrl && serverAvailable === true) {
    return true;
  }

  const healthUrl = new URL("/health", serverUrl).toString();
  const timeoutMs = 3000;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response | null = null;
    try {
      response = await fetch(healthUrl, { signal: controller.signal }).catch(() => null);
    } finally {
      clearTimeout(timeout);
    }

    const available = response?.ok ?? false;
    if (available) {
      serverCheckUrl = serverUrl;
      serverAvailable = true;
      log("[multiplexer-utils] isServerRunning: checked", { serverUrl, available, attempt });
      return true;
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  log("[multiplexer-utils] isServerRunning: checked", { serverUrl, available: false });
  return false;
}
