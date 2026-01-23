import React, { useRef } from 'react';
import { Box, useInput, useApp } from 'ink';

import { emitCommand } from '@/lib/events.js';

import { useTerminalDimensions } from '../hooks/useTerminalDimensions.js';
import { usePipelineEvents } from '../hooks/usePipelineEvents.js';
import { useListNavigation } from '../hooks/useListNavigation.js';
import { Sidebar } from '../components/Sidebar.js';
import { OutputPanel, OutputPanelRef } from '../components/OutputPanel.js';

type PipelineRunnerPageProps = {
  pipelineName: string;
};

const SIDEBAR_WIDTH = 42;

export function PipelineRunnerPage({ pipelineName }: PipelineRunnerPageProps) {
  const { exit } = useApp();
  const [columns, rows] = useTerminalDimensions();
  const { state, selectStep } = usePipelineEvents(pipelineName);
  const outputPanelRef = useRef<OutputPanelRef>(null);

  const selectedStep = state.steps[state.selectedStepIndex] ?? null;
  const canRerun = state.status === 'success' || state.status === 'failed';

  // Handle list navigation (up/down/j/k)
  useListNavigation({
    itemCount: state.steps.length,
    selectedIndex: state.selectedStepIndex,
    onHighlight: selectStep,
    loop: false,
  });

  useInput((input, key) => {
    if (input.toLowerCase() === 'q' || (key.ctrl && input === 'c')) {
      emitCommand('cancel:pipeline');
      exit();
    }

    // Re-run commands (only when pipeline is not running)
    if (canRerun) {
      if (input === 'R') {
        // Re-run entire pipeline
        emitCommand('rerun:pipeline');
      } else if (input === 'r' && selectedStep) {
        // Re-run selected step
        emitCommand('rerun:step', { stepName: selectedStep.name });
      }
    }

    // Scroll output panel
    if (key.leftArrow || input === 'h') {
      outputPanelRef.current?.scrollUp();
    } else if (key.rightArrow || input === 'l') {
      outputPanelRef.current?.scrollDown();
    }

    // Jump to top/bottom of output
    if (input === 'g') {
      outputPanelRef.current?.scrollToTop();
    } else if (input === 'G') {
      outputPanelRef.current?.scrollToBottom();
    }
  });

  const outputWidth = columns - SIDEBAR_WIDTH;

  return (
    <Box flexDirection="row" width={columns} height={rows}>
      <Sidebar
        steps={state.steps}
        selectedIndex={state.selectedStepIndex}
        pipelineStatus={state.status}
        width={SIDEBAR_WIDTH}
        height={rows}
      />
      <OutputPanel
        ref={outputPanelRef}
        step={selectedStep}
        globalOutput={state.globalOutput}
        pipelineStatus={state.status}
        width={outputWidth}
        height={rows}
      />
    </Box>
  );
}
