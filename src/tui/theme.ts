/**
 * TUI theme constants and helpers.
 */

import { Box, Text } from 'ink';

export type StatusColor = 'green' | 'red' | 'blue' | 'yellow' | 'cyan' | 'magenta' | undefined;

export interface StatusConfig {
  symbol: string;
  color: StatusColor;
  label: string;
}

/**
 * Visual configuration for different step statuses.
 */
export const STEP_STATUS: Record<string, StatusConfig> = {
  pending: { symbol: '○', color: undefined, label: 'Pending' },
  running: { symbol: '◐', color: 'blue', label: 'Running' },
  success: { symbol: '●', color: 'green', label: 'Completed' },
  failed: { symbol: '✕', color: 'red', label: 'Failed' },
  skipped: { symbol: '○', color: undefined, label: 'Skipped' },
} as const;

/**
 * Common colors used across the TUI.
 */
export const COLORS = {
  border: 'gray',
  highlight: 'cyan',
  success: 'green',
  error: 'red',
  warning: 'yellow',
  info: 'blue',
  muted: 'gray',
} as const;
