import React from 'react';
import { Box, Text } from 'ink';

import type { StepState, StepStatus, PipelineStatus } from '../types.js';

type SidebarProps = {
  steps: StepState[];
  selectedIndex: number;
  pipelineStatus: PipelineStatus;
  width: number;
  height: number;
};

const STATUS_SYMBOLS: Record<StepStatus, string> = {
  pending: '○',
  running: '◐',
  success: '●',
  failed: '✕',
  skipped: '○',
};

const STATUS_COLORS: Record<StepStatus, string | undefined> = {
  pending: undefined, // Will use dimColor
  running: 'blue',
  success: 'green',
  failed: 'red',
  skipped: undefined,
};

export function Sidebar({ steps, selectedIndex, pipelineStatus, width, height }: SidebarProps) {
  const canRerun = pipelineStatus === 'success' || pipelineStatus === 'failed';

  // Account for border (2), paddingX (2*2=4), step paddingX (2*2=4), symbol (1), gap (4)
  const maxNameLen = width - 2 - 4 - 4 - 1 - 4;

  // Reserve rows for hints (4 lines when rerun available, 2 otherwise + 1 margin), padding (2) and borders (2)
  const hintRows = canRerun ? 5 : 3;
  const availableRows = Math.floor((height - hintRows - 4) / 3);

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      paddingX={2}
      paddingY={1}
      borderStyle="round"
      borderColor="gray"
    >
      <Box flexDirection="column" flexGrow={1}>
        {steps.length === 0 ? (
          <Text dimColor>Loading steps...</Text>
        ) : (
          steps.slice(0, availableRows).map((step, index) => {
            const isSelected = index === selectedIndex;
            const symbol = STATUS_SYMBOLS[step.status];
            const displayName =
              step.name.length > maxNameLen ? step.name.slice(0, maxNameLen - 1) + '…' : step.name;
            const statusColor = STATUS_COLORS[step.status];
            const isPending = step.status === 'pending';

            return (
              <Box
                key={`step-${index}`}
                paddingX={2}
                paddingY={1}
                backgroundColor={isSelected ? '#191919' : undefined}
              >
                <Box marginRight={2}>
                  <Text color={statusColor} dimColor={isPending}>
                    {symbol}
                  </Text>
                </Box>
                <Text color={statusColor} dimColor={isPending}>
                  {displayName}
                </Text>
              </Box>
            );
          })
        )}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>
          <Text>[↑↓]</Text> Navigate
        </Text>
        <Text dimColor>
          <Text>[←→]</Text> Scroll
        </Text>
        {canRerun && (
          <>
            <Text dimColor>
              <Text>[r]</Text> Re-run step
            </Text>
            <Text dimColor>
              <Text>[R]</Text> Re-run all
            </Text>
          </>
        )}
      </Box>
    </Box>
  );
}
