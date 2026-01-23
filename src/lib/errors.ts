/**
 * Error handling utilities for consistent error processing and event emission.
 */

import { emitPipelineEvent } from './events.js';

/**
 * Extracts a clean error message from an unknown error value.
 *
 * @param error - The error to extract the message from
 * @returns A trimmed error message string
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.trim();
  }
  return String(error);
}

/**
 * Handles an error by emitting it as a pipeline event and re-throwing.
 * Use this for consistent error handling across modules.
 *
 * @param context - A short description of what operation failed (e.g., "pulling image")
 * @param error - The error that occurred
 * @throws Always throws - either the original Error or a new Error wrapping the value
 *
 * @example
 * ```typescript
 * try {
 *   await docker.pull(imageName);
 * } catch (error) {
 *   handleAndEmitError('pulling image', error);
 * }
 * ```
 */
export function handleAndEmitError(context: string, error: unknown): never {
  const message = getErrorMessage(error);
  emitPipelineEvent('error', `Error ${context}: "${message}"`);

  if (error instanceof Error) {
    throw error;
  }
  throw new Error(`Error ${context}: ${message}`);
}

/**
 * Creates a formatted error message with context.
 *
 * @param context - A short description of what operation failed
 * @param error - The error that occurred
 * @returns A formatted error message string
 */
export function formatError(context: string, error: unknown): string {
  const message = getErrorMessage(error);
  return `Error ${context}: "${message}"`;
}
