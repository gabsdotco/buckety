import { describe, it, expect } from 'vitest';
import { cleanTerminalOutput } from './terminal.js';

describe('cleanTerminalOutput', () => {
  it('should preserve plain text', () => {
    expect(cleanTerminalOutput('hello world')).toBe('hello world');
  });

  it('should preserve ANSI colors', () => {
    const greenHello = '\x1B[32mhello\x1B[0m';
    expect(cleanTerminalOutput(greenHello)).toBe(greenHello);
  });

  it('should remove carriage returns', () => {
    expect(cleanTerminalOutput('hello\rworld')).toBe('helloworld');
  });

  it('should remove OSC sequences', () => {
    // OSC 0;titleBEL
    expect(cleanTerminalOutput('\x1B]0;title\x07hello')).toBe('hello');
  });

  it('should preserve newlines and tabs', () => {
    expect(cleanTerminalOutput('line1\n\tline2')).toBe('line1\n\tline2');
  });
});
