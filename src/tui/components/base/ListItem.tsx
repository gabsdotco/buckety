import React from 'react';
import { Box, Text } from 'ink';

interface ListItemProps {
  label: string;
  symbol?: string;
  isSelected?: boolean;
  color?: string;
  dimColor?: boolean;
}

export function ListItem({ label, symbol, isSelected, color, dimColor }: ListItemProps) {
  return (
    <Box paddingX={2} paddingY={1} backgroundColor={isSelected ? '#191919' : undefined}>
      {symbol && (
        <Box marginRight={2}>
          <Text color={color} dimColor={dimColor}>
            {symbol}
          </Text>
        </Box>
      )}
      <Text color={color} dimColor={dimColor}>
        {label}
      </Text>
    </Box>
  );
}
