import React from 'react';
import { render } from 'ink';

import { clearScreen, hideCursor, showCursor } from '@/lib/terminal.js';

import { App } from './App.js';
import { PipelinePicker } from './components/PipelinePicker.js';

export type { PipelineState, StepState, StepStatus, PipelineStatus } from './types.js';

// Cleanup function to restore terminal state
function cleanup() {
  showCursor();
  clearScreen();
}

export async function startTUI(pipelineName: string) {
  // Hide cursor immediately and ensure it stays hidden
  hideCursor();

  // Also hide cursor on resize events (terminals sometimes reset cursor visibility)
  const keepCursorHidden = () => hideCursor();
  process.stdout.on('resize', keepCursorHidden);

  // Register cleanup handlers for process exit
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  const { waitUntilExit } = render(<App pipelineName={pipelineName} />, {
    exitOnCtrlC: false,
  });

  // Small delay to let React mount before pipeline events start
  await new Promise((resolve) => setTimeout(resolve, 50));

  return {
    waitUntilExit: async () => {
      await waitUntilExit();
      process.stdout.off('resize', keepCursorHidden);
      // Cleanup is handled by process 'exit' handler
    },
  };
}

export async function showPipelinePicker(pipelines: string[]): Promise<string | null> {
  clearScreen();

  return new Promise((resolve) => {
    const { unmount } = render(
      <PipelinePicker
        pipelines={pipelines}
        onSelect={(pipeline) => {
          unmount();
          clearScreen();
          resolve(pipeline);
        }}
        onCancel={() => {
          unmount();
          clearScreen();
          resolve(null);
        }}
      />,
    );
  });
}
