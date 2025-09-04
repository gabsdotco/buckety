import chalk from 'chalk';

const icons = {
  TOP_LEFT_CORNER: '╭',
  TOP_RIGHT_CORNER: '╮',
  BOTTOM_LEFT_CORNER: '╰',
  BOTTOM_RIGHT_CORNER: '╯',
  VERTICAL_LINE: '│',
  HORIZONTAL_LINE: '─',
  DOT: '○',
};

type OutputOptions = {
  fg?: typeof chalk.ForegroundColor;
  bg?: typeof chalk.BackgroundColor;
  bold?: boolean;
};

const styles = (line: string, options?: OutputOptions) => {
  let output = line;

  const { bg, fg = 'white', bold = false } = options || {};

  if (fg) output = chalk[fg](output);
  if (bg) output = chalk[bg](output);
  if (bold) output = chalk.bold(output);

  return output;
};

export const box = (text: string, options?: OutputOptions) => {
  const length = (process.stdout.columns || 80) - 2;

  const top = `${icons.TOP_LEFT_CORNER}${icons.HORIZONTAL_LINE.repeat(length)}${icons.TOP_RIGHT_CORNER}`;
  const middle = `${icons.VERTICAL_LINE} ${text.padEnd(length - 2, ' ')} ${icons.VERTICAL_LINE}`;
  const bottom = `${icons.BOTTOM_LEFT_CORNER}${icons.HORIZONTAL_LINE.repeat(length)}${icons.BOTTOM_RIGHT_CORNER}`;

  [top, middle, bottom].forEach((line) => process.stdout.write(styles(line, options) + '\n'));
};

export const output = (text: string, options?: OutputOptions) => {
  const lines = text.split('\n');

  const maxLength = Math.max(...lines.map((l) => l.length));
  const length = Math.max(35, maxLength);

  const top = `${icons.TOP_LEFT_CORNER}${icons.HORIZONTAL_LINE}${icons.DOT}`;
  const bottom = `${icons.BOTTOM_LEFT_CORNER}${icons.HORIZONTAL_LINE}${icons.DOT}`;

  process.stdout.write(styles(top, options) + '\n');

  lines.forEach((line) => {
    const middle = `${icons.VERTICAL_LINE} ${line.padEnd(length, ' ')}`;
    process.stdout.write(styles(middle, options) + '\n');
  });

  process.stdout.write(styles(bottom, options) + '\n');
};

export const text = (text: string, options?: OutputOptions) => {
  process.stdout.write(styles(text, options) + '\n');
};

export const divider = (options?: OutputOptions) => {
  const length = process.stdout.columns || 80;
  process.stdout.write(styles(icons.HORIZONTAL_LINE.repeat(length), options) + '\n');
};
