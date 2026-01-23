import React from 'react';
import { Box, BoxProps } from 'ink';
import { COLORS } from '../../theme.js';

interface PanelProps extends BoxProps {
  children?: React.ReactNode;
}

export function Panel({
  children,
  borderStyle = 'single',
  borderColor = COLORS.border,
  ...props
}: PanelProps) {
  return (
    <Box borderStyle={borderStyle} borderColor={borderColor} {...props}>
      {children}
    </Box>
  );
}
