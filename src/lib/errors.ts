/**
 * Error handling utilities for consistent error processing and event emission.
 */

import { Reporter } from '@/types/reporter.js';

/**
 * Extracts a clean error message from an unknown error value.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.trim();
  }
  return String(error);
}

/**
 * Handles an error by emitting it via reporter and re-throwing.
 */
export function handleAndEmitError(context: string, error: unknown, reporter: Reporter): never {
  const message = getErrorMessage(error);
  // Create a new error with context to emit
  const contextError = new Error(`Error ${context}: "${message}"`);
  reporter.emit({ type: 'error', error: contextError });

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
