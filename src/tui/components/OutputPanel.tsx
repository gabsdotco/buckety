import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Box, Text, useStdout } from 'ink';
import { ScrollView, ScrollViewRef } from 'ink-scroll-view';
import { AnsiText } from './AnsiText.js';

import type {
  OutputLine,
  StepState,
  ScriptOutput,
  ScriptStatus,
  ScriptPhase,
  PipelineStatus,
} from '../types.js';

type OutputPanelProps = {
  step: StepState | null;
  globalOutput: OutputLine[];
  pipelineStatus: PipelineStatus;
  width: number;
  height: number;
};

export type OutputPanelRef = {
  scrollUp: () => void;
  scrollDown: () => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
};

const SCROLL_AMOUNT = 3;

const STATUS_COLORS: Record<ScriptStatus, string> = {
  running: 'blue',
  success: 'green',
  failed: 'red',
};

const PHASE_COLORS: Record<ScriptPhase, string> = {
  setup: 'magenta',
  script: '', // Use status color
  cleanup: 'magenta',
  'artifacts-upload': 'cyan',
  'artifacts-download': 'cyan',
};

// Get display name for script command based on phase
function getScriptDisplayName(script: ScriptOutput): string {
  if (script.phase === 'setup') return 'Setup';
  if (script.phase === 'cleanup') return 'Clean-up';
  if (script.phase === 'artifacts-upload') return 'Artifacts Upload';
  if (script.phase === 'artifacts-download') return 'Artifacts Download';
  return `$ ${script.command}`;
}

// Get color for script based on phase and status
function getScriptColor(script: ScriptOutput): string {
  if (script.phase !== 'script') {
    return PHASE_COLORS[script.phase];
  }
  return STATUS_COLORS[script.status];
}

export const OutputPanel = forwardRef<OutputPanelRef, OutputPanelProps>(function OutputPanel(
  { step, globalOutput, pipelineStatus, width, height },
  ref,
) {
  const scrollRef = useRef<ScrollViewRef>(null);
  const { stdout } = useStdout();

  // Check if step is pending (queued)
  const isQueued = step?.status === 'pending';

  // Show global output if pipeline failed and step is still queued
  const showGlobalOutput = pipelineStatus === 'failed' && isQueued && globalOutput.length > 0;

  // Use scripts if available, otherwise show global output
  const scripts: ScriptOutput[] = step?.scripts ?? [];
  const hasScripts = scripts.length > 0;

  // Calculate item count for scroll limits
  const itemCount = hasScripts ? scripts.length : globalOutput.length || 1;

  // Scroll to show the last item at the bottom of the viewport
  const scrollToLastItem = () => {
    if (!scrollRef.current || itemCount === 0) return;

    const lastIndex = itemCount - 1;
    const position = scrollRef.current.getItemPosition(lastIndex);
    const viewportHeight = scrollRef.current.getViewportHeight();

    if (position && viewportHeight) {
      // Scroll so the bottom of the last item aligns with the bottom of the viewport
      const maxOffset = Math.max(0, position.top + position.height - viewportHeight);
      scrollRef.current.scrollTo(maxOffset);
    }
  };

  // Expose scroll methods to parent
  useImperativeHandle(ref, () => ({
    scrollUp: () => scrollRef.current?.scrollBy(-SCROLL_AMOUNT),
    scrollDown: () => {
      if (!scrollRef.current || itemCount === 0) return;

      // Get position of last item to limit scrolling
      const lastIndex = itemCount - 1;
      const position = scrollRef.current.getItemPosition(lastIndex);
      const viewportHeight = scrollRef.current.getViewportHeight();
      if (!position || !viewportHeight) return;

      const currentOffset = scrollRef.current.getScrollOffset();
      // Max offset is when bottom of last item aligns with bottom of viewport
      const maxOffset = Math.max(0, position.top + position.height - viewportHeight);

      // Only scroll if we haven't reached the limit
      if (currentOffset < maxOffset) {
        const newOffset = Math.min(currentOffset + SCROLL_AMOUNT, maxOffset);
        scrollRef.current.scrollTo(newOffset);
      }
    },
    scrollToTop: () => scrollRef.current?.scrollToTop(),
    scrollToBottom: scrollToLastItem,
  }));

  // Handle terminal resize
  useEffect(() => {
    const handleResize = () => scrollRef.current?.remeasure();
    stdout?.on('resize', handleResize);
    return () => {
      stdout?.off('resize', handleResize);
    };
  }, [stdout]);

  // Scroll to last item when content changes or step changes
  useEffect(() => {
    // Small delay to allow content to render and measure
    const timer = setTimeout(() => {
      scrollToLastItem();
    }, 10);
    return () => clearTimeout(timer);
  }, [step?.name, scripts.length]);

  // Centered empty state for queued steps (but not if we should show global output)
  if (isQueued && !showGlobalOutput) {
    return (
      <Box
        flexDirection="column"
        width={width}
        height={height}
        alignItems="center"
        justifyContent="center"
      >
        <Text dimColor>Step is queued</Text>
        <Text dimColor>Waiting to run...</Text>
      </Box>
    );
  }

  // Reserve height for padding
  const scrollHeight = height - 2;

  // Build content array with consistent keys for ScrollView
  const renderContent = () => {
    // Show global output if pipeline failed and step is queued
    if (showGlobalOutput) {
      return globalOutput.map((line, index) => (
        <Text
          key={`global-${index}`}
          dimColor={line.type === 'info'}
          color={line.type === 'error' ? 'red' : undefined}
          bold={line.type === 'error'}
        >
          {line.text}
        </Text>
      ));
    }

    if (!hasScripts) {
      // Show global output or waiting message
      if (globalOutput.length === 0) {
        return [
          <Text key="empty-state" dimColor>
            {step ? 'Waiting for output...' : 'Starting pipeline...'}
          </Text>,
        ];
      }
      return globalOutput.map((line, index) => (
        <Text
          key={`global-${index}`}
          dimColor={line.type === 'info'}
          color={line.type === 'error' ? 'red' : undefined}
          bold={line.type === 'error'}
        >
          {line.text}
        </Text>
      ));
    }

    // Show scripts with colored left border
    return scripts.map((script, scriptIndex) => {
      const scriptColor = getScriptColor(script);
      const displayName = getScriptDisplayName(script);

      return (
        <Box
          key={`script-${scriptIndex}`}
          flexDirection="column"
          marginBottom={1}
          paddingLeft={2}
          paddingRight={2}
          paddingY={1}
          backgroundColor="#191919"
          borderStyle="single"
          borderLeft
          borderRight={false}
          borderTop={false}
          borderBottom={false}
          borderColor={scriptColor}
        >
          <Text color={scriptColor}>{displayName}</Text>
          {script.lines.length > 0 && <Text> </Text>}
          {script.lines.map((line, lineIndex) => (
            <AnsiText key={`${scriptIndex}-line-${lineIndex}`}>{line.text}</AnsiText>
          ))}
        </Box>
      );
    });
  };

  return (
    <Box flexDirection="column" width={width} height={height} paddingX={3} paddingY={1}>
      <Box height={scrollHeight} flexDirection="column" overflow="hidden">
        <ScrollView ref={scrollRef}>{renderContent()}</ScrollView>
      </Box>
    </Box>
  );
});
