import React from 'react';
import { Box, Text, BoxProps } from 'ink';

interface ListItemProps extends BoxProps {
  label: string;
  symbol?: string;
  isSelected?: boolean;
  color?: string;
  dimColor?: boolean;
}

export function ListItem({
  label,
  symbol,
  isSelected,
  color,
  dimColor,
  paddingX = 2,
  paddingY = 1,
  ...props
}: ListItemProps) {
  return (
    <Box
      paddingX={paddingX}
      paddingY={paddingY}
      backgroundColor={isSelected ? '#191919' : undefined}
      {...props}
    >
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
