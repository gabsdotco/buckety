/**
 * Terminal output utilities for cleaning and processing ANSI escape sequences.
 */

/**
 * Cleans terminal output by removing problematic control sequences while
 * preserving ANSI color codes (SGR sequences).
 *
 * Removes:
 * - Carriage returns (\r)
 * - OSC sequences (terminal title, hyperlinks, etc.)
 * - Character set selection sequences
 * - Keypad mode sequences
 * - Control characters (except tab, newline, and ESC)
 *
 * Preserves:
 * - SGR color/style sequences (e.g., \x1B[32m for green)
 * - Tab characters (\t)
 * - Newline characters (\n)
 * - ESC character (\x1B) for color codes
 *
 * @param text - The raw terminal output to clean
 * @returns The cleaned text with colors preserved
 */
export function cleanTerminalOutput(text: string): string {
  return (
    text
      // Remove carriage returns
      .replace(/\r/g, '')
      // Remove OSC sequences (terminal title, hyperlinks, etc.)
      // Format: ESC ] ... BEL
      .replace(/\x1B\][^\x07]*\x07/g, '')
      // Remove character set selection sequences
      // Format: ESC ( or ESC ) followed by character set designator
      .replace(/\x1B[()][AB012]/g, '')
      // Remove keypad mode sequences
      // Format: ESC > or ESC =
      .replace(/\x1B[>=]/g, '')
      // Remove control characters except:
      // - \t (0x09) - tab
      // - \n (0x0A) - newline
      // - \x1B (0x1B) - ESC (needed for ANSI color codes)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1A\x1C-\x1F]/g, '')
  );
}

/**
 * ANSI escape codes for terminal control.
 */
export const TERMINAL_CODES = {
  /** Clear entire screen and move cursor to top-left */
  CLEAR_SCREEN: '\x1B[2J\x1B[H',
  /** Hide cursor */
  HIDE_CURSOR: '\x1B[?25l',
  /** Show cursor */
  SHOW_CURSOR: '\x1B[?25h',
} as const;

/**
 * Clears the terminal screen.
 */
export function clearScreen(): void {
  process.stdout.write(TERMINAL_CODES.CLEAR_SCREEN);
}

/**
 * Hides the terminal cursor.
 */
export function hideCursor(): void {
  process.stdout.write(TERMINAL_CODES.HIDE_CURSOR);
}

/**
 * Shows the terminal cursor.
 */
export function showCursor(): void {
  process.stdout.write(TERMINAL_CODES.SHOW_CURSOR);
}
