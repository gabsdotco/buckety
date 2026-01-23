import React, { memo, ReactNode } from 'react';
import { Text } from 'ink';

// ANSI color code to Ink color mapping
const ANSI_COLORS: Record<number, string> = {
  30: 'black',
  31: 'red',
  32: 'green',
  33: 'yellow',
  34: 'blue',
  35: 'magenta',
  36: 'cyan',
  37: 'white',
  90: 'gray',
  91: 'redBright',
  92: 'greenBright',
  93: 'yellowBright',
  94: 'blueBright',
  95: 'magentaBright',
  96: 'cyanBright',
  97: 'whiteBright',
};

const ANSI_BG_COLORS: Record<number, string> = {
  40: 'black',
  41: 'red',
  42: 'green',
  43: 'yellow',
  44: 'blue',
  45: 'magenta',
  46: 'cyan',
  47: 'white',
  100: 'gray',
  101: 'redBright',
  102: 'greenBright',
  103: 'yellowBright',
  104: 'blueBright',
  105: 'magentaBright',
  106: 'cyanBright',
  107: 'whiteBright',
};

type TextStyle = {
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  inverse?: boolean;
};

type Segment = {
  text: string;
  style: TextStyle;
};

/**
 * Parse ANSI SGR (Select Graphic Rendition) codes and return updated style
 */
function applyAnsiCodes(codes: number[], currentStyle: TextStyle): TextStyle {
  const style = { ...currentStyle };

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];

    // Reset
    if (code === 0) {
      return {};
    }

    // Text styles
    if (code === 1) style.bold = true;
    if (code === 2) style.dim = true;
    if (code === 3) style.italic = true;
    if (code === 4) style.underline = true;
    if (code === 7) style.inverse = true;
    if (code === 9) style.strikethrough = true;

    // Reset styles
    if (code === 22) {
      style.bold = undefined;
      style.dim = undefined;
    }
    if (code === 23) style.italic = undefined;
    if (code === 24) style.underline = undefined;
    if (code === 27) style.inverse = undefined;
    if (code === 29) style.strikethrough = undefined;

    // Foreground colors (30-37, 90-97)
    if (ANSI_COLORS[code]) {
      style.color = ANSI_COLORS[code];
    }

    // Background colors (40-47, 100-107)
    if (ANSI_BG_COLORS[code]) {
      style.backgroundColor = ANSI_BG_COLORS[code];
    }

    // Reset foreground color
    if (code === 39) {
      style.color = undefined;
    }

    // Reset background color
    if (code === 49) {
      style.backgroundColor = undefined;
    }

    // 256 color mode: ESC[38;5;⟨n⟩m (foreground) or ESC[48;5;⟨n⟩m (background)
    if (code === 38 && codes[i + 1] === 5 && codes[i + 2] !== undefined) {
      const colorIndex = codes[i + 2];
      style.color = ansi256ToHex(colorIndex);
      i += 2;
    }
    if (code === 48 && codes[i + 1] === 5 && codes[i + 2] !== undefined) {
      const colorIndex = codes[i + 2];
      style.backgroundColor = ansi256ToHex(colorIndex);
      i += 2;
    }

    // True color mode: ESC[38;2;r;g;b m (foreground) or ESC[48;2;r;g;b m (background)
    if (
      code === 38 &&
      codes[i + 1] === 2 &&
      codes[i + 2] !== undefined &&
      codes[i + 3] !== undefined &&
      codes[i + 4] !== undefined
    ) {
      const r = codes[i + 2];
      const g = codes[i + 3];
      const b = codes[i + 4];
      style.color = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      i += 4;
    }
    if (
      code === 48 &&
      codes[i + 1] === 2 &&
      codes[i + 2] !== undefined &&
      codes[i + 3] !== undefined &&
      codes[i + 4] !== undefined
    ) {
      const r = codes[i + 2];
      const g = codes[i + 3];
      const b = codes[i + 4];
      style.backgroundColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      i += 4;
    }
  }

  return style;
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, '0');
}

/**
 * Convert 256-color ANSI code to hex color
 */
function ansi256ToHex(code: number): string {
  // Standard colors (0-15)
  const standard = [
    '#000000',
    '#800000',
    '#008000',
    '#808000',
    '#000080',
    '#800080',
    '#008080',
    '#c0c0c0',
    '#808080',
    '#ff0000',
    '#00ff00',
    '#ffff00',
    '#0000ff',
    '#ff00ff',
    '#00ffff',
    '#ffffff',
  ];

  if (code < 16) {
    return standard[code];
  }

  // Color cube (16-231): 6x6x6 cube
  if (code < 232) {
    const index = code - 16;
    const r = Math.floor(index / 36);
    const g = Math.floor((index % 36) / 6);
    const b = index % 6;
    const toVal = (v: number) => (v === 0 ? 0 : 55 + v * 40);
    return `#${toHex(toVal(r))}${toHex(toVal(g))}${toHex(toVal(b))}`;
  }

  // Grayscale (232-255)
  const gray = (code - 232) * 10 + 8;
  return `#${toHex(gray)}${toHex(gray)}${toHex(gray)}`;
}

/**
 * Parse a string with ANSI codes into segments with styles
 */
function parseAnsiString(input: string): Segment[] {
  const segments: Segment[] = [];
  let currentStyle: TextStyle = {};
  let currentText = '';

  // Match ANSI escape sequences: ESC[ followed by numbers separated by ; ending with m
  // eslint-disable-next-line no-control-regex
  const ansiPattern = /\x1b\[([0-9;]*)m/g;

  let lastIndex = 0;
  let match;

  while ((match = ansiPattern.exec(input)) !== null) {
    // Add text before this escape sequence
    const textBefore = input.slice(lastIndex, match.index);
    if (textBefore) {
      currentText += textBefore;
    }

    // If we have accumulated text, save it as a segment
    if (currentText) {
      segments.push({ text: currentText, style: { ...currentStyle } });
      currentText = '';
    }

    // Parse the ANSI codes
    const codeStr = match[1];
    const codes = codeStr ? codeStr.split(';').map((s) => parseInt(s, 10) || 0) : [0];

    // Apply codes to get new style
    currentStyle = applyAnsiCodes(codes, currentStyle);

    lastIndex = ansiPattern.lastIndex;
  }

  // Add remaining text
  const remaining = input.slice(lastIndex);
  if (remaining || currentText) {
    segments.push({ text: currentText + remaining, style: currentStyle });
  }

  return segments.filter((s) => s.text.length > 0);
}

/**
 * Clean special characters from text while preserving printable content.
 * This should be called on text AFTER ANSI parsing, not before.
 */
function cleanText(str: string): string {
  return str
    .replace(/\t/g, '  ')
    .replace(/\r/g, '')
    .split('')
    .filter((c) => {
      const code = c.charCodeAt(0);
      // Printable ASCII and extended Latin, plus newlines
      return c === '\n' || (code >= 0x20 && code <= 0x7e) || (code >= 0xa1 && code <= 0x024f);
    })
    .join('');
}

type AnsiTextProps = {
  children: ReactNode;
};

/**
 * Convert a TextStyle to Ink Text props
 */
function styleToProps(style: TextStyle) {
  return {
    color: style.color,
    backgroundColor: style.backgroundColor,
    bold: style.bold || undefined,
    dimColor: style.dim || undefined,
    italic: style.italic || undefined,
    underline: style.underline || undefined,
    strikethrough: style.strikethrough || undefined,
    inverse: style.inverse || undefined,
  };
}

/**
 * A Text component that parses and renders ANSI escape sequences as styled Ink Text elements.
 */
export const AnsiText = memo(function AnsiText({ children }: AnsiTextProps) {
  // Only handle string children
  if (typeof children !== 'string') {
    return <Text>{children}</Text>;
  }

  // Parse ANSI first (before cleaning), then clean individual text segments
  const segments = parseAnsiString(children);

  // Clean the text in each segment (after ANSI codes have been extracted)
  const cleanedSegments = segments
    .map((seg) => ({
      ...seg,
      text: cleanText(seg.text),
    }))
    .filter((s) => s.text.length > 0);

  if (cleanedSegments.length === 0) {
    return <Text>{''}</Text>;
  }

  if (cleanedSegments.length === 1) {
    const seg = cleanedSegments[0];
    return <Text {...styleToProps(seg.style)}>{seg.text}</Text>;
  }

  return (
    <Text>
      {cleanedSegments.map((seg, i) => (
        <Text key={i} {...styleToProps(seg.style)}>
          {seg.text}
        </Text>
      ))}
    </Text>
  );
});
