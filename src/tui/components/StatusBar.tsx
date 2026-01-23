import React from 'react';
import { Box, Text } from 'ink';

import type { PipelineStatus } from '../types.js';

type StatusBarProps = {
  status: PipelineStatus;
  width: number;
};

const STATUS_LABELS: Record<PipelineStatus, string> = {
  idle: 'Idle',
  running: 'Running',
  success: 'Completed',
  failed: 'Failed',
};

export function StatusBar({ status, width }: StatusBarProps) {
  const statusText = STATUS_LABELS[status];
  const isError = status === 'failed';

  return (
    <Box width={width} justifyContent="flex-end" paddingX={1}>
      <Text bold={isError} dimColor={!isError && status !== 'success'}>
        {statusText}
      </Text>
    </Box>
  );
}
