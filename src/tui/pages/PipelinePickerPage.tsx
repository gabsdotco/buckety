import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';

import { useTerminalDimensions } from '../hooks/useTerminalDimensions.js';
import { COLORS } from '../theme.js';

type PipelinePickerProps = {
  pipelines: string[];
  onSelect: (pipeline: string) => void;
  onCancel: () => void;
};

export function PipelinePickerPage({ pipelines, onSelect, onCancel }: PipelinePickerProps) {
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [columns, rows] = useTerminalDimensions();

  const filteredPipelines = useMemo(() => {
    if (!filter) return pipelines;
    return pipelines.filter((p) => p.toLowerCase().includes(filter.toLowerCase()));
  }, [pipelines, filter]);

  useInput((input, key) => {
    // Navigation
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredPipelines.length - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => (prev < filteredPipelines.length - 1 ? prev + 1 : 0));
      return;
    }
    if (key.return) {
      if (filteredPipelines[selectedIndex]) {
        onSelect(filteredPipelines[selectedIndex]);
      }
      return;
    }
    if (key.escape) {
      onCancel();
      return;
    }

    // Filtering
    if (key.delete || key.backspace) {
      setFilter((prev) => prev.slice(0, -1));
      setSelectedIndex(0);
      return;
    }

    // Ignore other control keys
    if (key.ctrl || key.meta) return;

    // Add to filter
    if (input) {
      setFilter((prev) => prev + input);
      setSelectedIndex(0);
    }
  });

  // Grouping logic for display
  const groupedPipelines = useMemo(() => {
    const groups: Record<string, string[]> = {};
    const ungrouped: string[] = [];

    filteredPipelines.forEach((p) => {
      if (p.includes(':')) {
        const [group, name] = p.split(':', 2);
        if (!groups[group]) groups[group] = [];
        groups[group].push(p);
      } else {
        ungrouped.push(p);
      }
    });

    return { groups, ungrouped };
  }, [filteredPipelines]);

  // Layout calculation
  const pickerWidth = Math.min(60, columns - 4);
  const pickerHeight = Math.min(20, rows - 4);
  const topPadding = Math.max(0, Math.floor((rows - pickerHeight) / 2));
  const leftPadding = Math.max(0, Math.floor((columns - pickerWidth) / 2));

  // Flatten for index mapping
  let currentIndex = 0;

  return (
    <Box width={columns} height={rows} paddingTop={topPadding} paddingLeft={leftPadding}>
      <Box flexDirection="column" width={pickerWidth} paddingX={1}>
        <Box marginBottom={1}>
          <Text color={COLORS.highlight}>› </Text>
          <Text color={COLORS.highlight}>Filter: </Text>
          <Text>{filter}</Text>
          <Text dimColor>{filter ? '' : '...'}</Text>
        </Box>

        <Box flexDirection="column">
          {filteredPipelines.length === 0 && <Text dimColor>No pipelines found</Text>}

          {groupedPipelines.ungrouped.length > 0 && (
            <Box flexDirection="column" marginBottom={1}>
              <Text dimColor>Standard</Text>
              {groupedPipelines.ungrouped.map((pipeline) => {
                const isSelected = currentIndex === selectedIndex;
                currentIndex++;
                return (
                  <Box key={pipeline}>
                    <Text color={isSelected ? COLORS.highlight : undefined}>
                      {isSelected ? '● ' : '  '}
                      {pipeline}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          )}

          {Object.entries(groupedPipelines.groups).map(([group, groupPipelines]) => {
            if (groupPipelines.length === 0) return null;
            return (
              <Box key={group} flexDirection="column" marginBottom={1}>
                <Text dimColor>{group.charAt(0).toUpperCase() + group.slice(1)}</Text>
                {groupPipelines.map((pipeline) => {
                  const isSelected = currentIndex === selectedIndex;
                  const displayName = pipeline.split(':')[1];
                  currentIndex++;
                  return (
                    <Box key={pipeline}>
                      <Text color={isSelected ? COLORS.highlight : undefined}>
                        {isSelected ? '● ' : '  '}
                        {displayName}
                      </Text>
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>

        <Box marginTop={1}>
          <Text dimColor>↑/↓ to navigate • Enter to select • Esc to cancel</Text>
        </Box>
      </Box>
    </Box>
  );
}
