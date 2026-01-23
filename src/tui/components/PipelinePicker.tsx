import React from 'react';
import { Box, Text, useInput } from 'ink';

import { useTerminalDimensions } from '../hooks/useTerminalDimensions.js';
import { useListNavigation } from '../hooks/useListNavigation.js';

type PipelinePickerProps = {
  pipelines: string[];
  onSelect: (pipeline: string) => void;
  onCancel: () => void;
};

export function PipelinePicker({ pipelines, onSelect, onCancel }: PipelinePickerProps) {
  const [columns, rows] = useTerminalDimensions();

  const { selectedIndex } = useListNavigation({
    itemCount: pipelines.length,
    loop: true,
    onSelect: (index) => onSelect(pipelines[index]),
    onCancel,
  });

  // Handle 'q' to quit (not covered by useListNavigation default keys)
  useInput((input) => {
    if (input === 'q') {
      onCancel();
    }
  });

  // Calculate center position
  const pickerHeight = pipelines.length + 4; // title + blank + items + blank + help
  const pickerWidth = Math.max(30, Math.max(...pipelines.map((p) => p.length)) + 6);

  const topPadding = Math.max(0, Math.floor((rows - pickerHeight) / 2));
  const leftPadding = Math.max(0, Math.floor((columns - pickerWidth) / 2));

  return (
    <Box
      flexDirection="column"
      width={columns}
      height={rows}
      paddingTop={topPadding}
      paddingLeft={leftPadding}
    >
      <Box flexDirection="column" width={pickerWidth}>
        <Text bold>Select Pipeline</Text>
        <Text> </Text>

        {pipelines.map((pipeline, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Text key={pipeline} inverse={isSelected}>
              {isSelected ? '> ' : '  '}
              {pipeline}
            </Text>
          );
        })}

        <Text> </Text>
        <Text dimColor>[j/k] Navigate [Enter] Select [q] Quit</Text>
      </Box>
    </Box>
  );
}
