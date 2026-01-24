/**
 * Logger Utility
 *
 * Simple file-based logging for debugging.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const logFile = path.join(os.tmpdir(), "oh-my-opencode-slim.log");

/**
 * Log a message to the debug log file.
 *
 * @param message - The message to log
 * @param data - Optional data to include (will be JSON stringified)
 */
export function log(message: string, data?: unknown): void {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ""}\n`;
    fs.appendFileSync(logFile, logEntry);
  } catch {
    // Silently ignore logging errors
  }
}
