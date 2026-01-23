import React from 'react';
import { Text } from 'ink';

interface KeyHelpProps {
  keys: string;
  description: string;
}

export function KeyHelp({ keys, description }: KeyHelpProps) {
  return (
    <Text dimColor>
      <Text>[{keys}]</Text> {description}
    </Text>
  );
}

interface KeyHelpGroupProps {
  children: React.ReactNode;
  direction?: 'row' | 'column';
  separator?: string;
}

export function KeyHelpGroup({
  children,
  direction = 'column',
  separator = ' • ',
}: KeyHelpGroupProps) {
  if (direction === 'column') {
    return <>{children}</>;
  }

  // Flatten children to insert separators if horizontal
  const items = React.Children.toArray(children);
  return (
    <Text dimColor>
      {items.map((child, index) => (
        <React.Fragment key={index}>
          {index > 0 && <Text>{separator}</Text>}
          {child}
        </React.Fragment>
      ))}
    </Text>
  );
}
