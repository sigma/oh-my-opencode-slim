/**
 * Shared Constants
 *
 * Runtime configuration constants that don't depend on any other modules.
 */

// =============================================================================
// Polling Configuration
// =============================================================================

/** Default polling interval in milliseconds */
export const POLL_INTERVAL_MS = 500;

/** Slow polling interval for less urgent operations */
export const POLL_INTERVAL_SLOW_MS = 1000;

/** Background polling interval for background tasks */
export const POLL_INTERVAL_BACKGROUND_MS = 2000;

// =============================================================================
// Timeouts
// =============================================================================

/** Default operation timeout (2 minutes) */
export const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000;

/** Maximum polling time before giving up (5 minutes) */
export const MAX_POLL_TIME_MS = 5 * 60 * 1000;

// =============================================================================
// Polling Stability
// =============================================================================

/** Number of consecutive stable polls required before considering state stable */
export const STABLE_POLLS_THRESHOLD = 3;
