import React from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../../theme.js';

interface SearchInputProps {
  value: string;
  placeholder?: string;
  label?: string;
  prefix?: string;
}

export function SearchInput({
  value,
  placeholder = '...',
  label = 'Filter: ',
  prefix = '› ',
}: SearchInputProps) {
  return (
    <Box marginBottom={1}>
      <Text color={COLORS.highlight}>{prefix}</Text>
      <Text color={COLORS.highlight}>{label}</Text>
      <Text>{value}</Text>
      <Text dimColor>{value ? '' : placeholder}</Text>
    </Box>
  );
}
