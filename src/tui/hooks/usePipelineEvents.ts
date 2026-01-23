import { useEffect, useState, useCallback, useRef } from 'react';

import type { PipelineState, StepState, OutputLine, ScriptOutput, ScriptPhase } from '../types.js';
import type { PipelineEvent } from '@/lib/events.js';

import { pipelineEvents } from '@/lib/events.js';

type UsePipelineEventsResult = {
  state: PipelineState;
  selectStep: (index: number) => void;
};

export function usePipelineEvents(pipelineName: string): UsePipelineEventsResult {
  const [state, setState] = useState<PipelineState>({
    pipelineName,
    status: 'idle',
    steps: [],
    selectedStepIndex: 0,
    globalOutput: [],
  });

  // Track the current step index (the one actually running)
  const currentStepIndexRef = useRef(-1);

  // Track if user has manually selected a step
  const userSelectedRef = useRef(false);

  // Track current phase
  const currentPhaseRef = useRef<ScriptPhase>('setup');

  // Track if setup script is already running for current step
  const setupStartedRef = useRef(false);

  const selectStep = useCallback((index: number) => {
    userSelectedRef.current = true;
    setState((prev) => ({
      ...prev,
      selectedStepIndex: Math.max(0, Math.min(index, prev.steps.length - 1)),
    }));
  }, []);

  // Helper to add output to current step or global
  const addOutput = useCallback((line: OutputLine) => {
    setState((prev) => {
      const currentIndex = currentStepIndexRef.current;

      if (currentIndex >= 0 && currentIndex < prev.steps.length) {
        // Add to current step's output and current script
        const newSteps = prev.steps.map((step, i) => {
          if (i !== currentIndex) return step;

          const newScripts = [...step.scripts];
          if (newScripts.length > 0) {
            const lastScript = newScripts[newScripts.length - 1];
            newScripts[newScripts.length - 1] = {
              ...lastScript,
              lines: [...lastScript.lines, line],
            };
          }

          return {
            ...step,
            output: [...step.output, line],
            scripts: newScripts,
          };
        });
        return { ...prev, steps: newSteps };
      } else {
        // Add to global output (before any step starts)
        return { ...prev, globalOutput: [...prev.globalOutput, line] };
      }
    });
  }, []);

  // Helper to start a new script in current step
  const startScript = useCallback((command: string, phase?: ScriptPhase) => {
    const scriptPhase = phase ?? currentPhaseRef.current;
    setState((prev) => {
      const currentIndex = currentStepIndexRef.current;

      if (currentIndex >= 0 && currentIndex < prev.steps.length) {
        const newSteps = prev.steps.map((step, i) => {
          if (i !== currentIndex) return step;

          const newScript: ScriptOutput = {
            command,
            status: 'running',
            phase: scriptPhase,
            lines: [],
          };

          return {
            ...step,
            output: [...step.output, { text: command, type: 'command' as const }],
            scripts: [...step.scripts, newScript],
          };
        });
        return { ...prev, steps: newSteps };
      }
      return prev;
    });
  }, []);

  // Helper to complete the current script
  const completeScript = useCallback((success: boolean) => {
    setState((prev) => {
      const currentIndex = currentStepIndexRef.current;

      if (currentIndex >= 0 && currentIndex < prev.steps.length) {
        const newSteps = prev.steps.map((step, i) => {
          if (i !== currentIndex) return step;

          const newScripts = [...step.scripts];
          if (newScripts.length > 0) {
            const lastScript = newScripts[newScripts.length - 1];
            newScripts[newScripts.length - 1] = {
              ...lastScript,
              status: success ? 'success' : 'failed',
            };
          }

          return { ...step, scripts: newScripts };
        });
        return { ...prev, steps: newSteps };
      }
      return prev;
    });
  }, []);

  const handleEvent = useCallback(
    (event: PipelineEvent) => {
      switch (event.type) {
        case 'pipeline:start':
          // Reset state for re-runs
          currentStepIndexRef.current = -1;
          userSelectedRef.current = false;
          currentPhaseRef.current = 'setup';
          setupStartedRef.current = false;
          setState((prev) => ({
            ...prev,
            status: 'running',
            steps: [],
            selectedStepIndex: 0,
            globalOutput: [],
          }));
          break;

        case 'pipeline:steps':
          // Initialize all steps upfront as pending
          if (event.data?.steps) {
            const stepNames = event.data.steps as string[];
            setState((prev) => ({
              ...prev,
              steps: stepNames.map((name) => ({
                name,
                status: 'pending' as const,
                output: [],
                scripts: [],
              })),
            }));
          }
          break;

        case 'pipeline:complete':
          setState((prev) => ({ ...prev, status: 'success' }));
          addOutput({ text: 'Pipeline completed successfully', type: 'success' });
          break;

        case 'pipeline:error':
          setState((prev) => ({ ...prev, status: 'failed' }));
          if (event.message) {
            addOutput({ text: `Error: ${event.message}`, type: 'error' });
          }
          break;

        case 'step:start':
          if (event.data?.stepName) {
            const stepName = event.data.stepName as string;

            // Reset setup tracking for new step
            setupStartedRef.current = false;

            setState((prev) => {
              const existingIndex = prev.steps.findIndex((s) => s.name === stepName);

              if (existingIndex !== -1) {
                // Update existing step to running
                currentStepIndexRef.current = existingIndex;
                const newSteps = prev.steps.map((s, i) =>
                  i === existingIndex
                    ? { ...s, status: 'running' as const, startTime: Date.now() }
                    : s,
                );

                const selectedIndex = userSelectedRef.current
                  ? prev.selectedStepIndex
                  : existingIndex;

                return {
                  ...prev,
                  steps: newSteps,
                  selectedStepIndex: selectedIndex,
                };
              } else {
                // Fallback: add new step (shouldn't happen if pipeline:steps was received)
                const newStep: StepState = {
                  name: stepName,
                  status: 'running',
                  output: [],
                  scripts: [],
                  startTime: Date.now(),
                };
                const newSteps = [...prev.steps, newStep];
                const newIndex = newSteps.length - 1;

                currentStepIndexRef.current = newIndex;

                const selectedIndex = userSelectedRef.current ? prev.selectedStepIndex : newIndex;

                return {
                  ...prev,
                  steps: newSteps,
                  selectedStepIndex: selectedIndex,
                };
              }
            });
          }
          break;

        case 'step:complete':
          if (event.data?.stepName) {
            const stepName = event.data.stepName as string;
            setState((prev) => {
              const completedIndex = prev.steps.findIndex((s) => s.name === stepName);
              const newSteps = prev.steps.map((s) =>
                s.name === stepName ? { ...s, status: 'success' as const, endTime: Date.now() } : s,
              );

              // Auto-focus next step if user was viewing the completed step
              let newSelectedIndex = prev.selectedStepIndex;
              if (
                completedIndex !== -1 &&
                completedIndex === prev.selectedStepIndex &&
                completedIndex < prev.steps.length - 1
              ) {
                newSelectedIndex = completedIndex + 1;
                // Reset user selection flag so we follow the next step
                userSelectedRef.current = false;
              }

              return {
                ...prev,
                steps: newSteps,
                selectedStepIndex: newSelectedIndex,
              };
            });
          }
          break;

        case 'step:error':
          if (event.data?.stepName) {
            const stepName = event.data.stepName as string;
            setState((prev) => ({
              ...prev,
              steps: prev.steps.map((s) =>
                s.name === stepName ? { ...s, status: 'failed' as const, endTime: Date.now() } : s,
              ),
            }));
            if (event.message) {
              addOutput({ text: `Error: ${event.message}`, type: 'error' });
            }
          }
          break;

        case 'script:start':
          if (event.message) {
            currentPhaseRef.current = 'script';
            startScript(event.message, 'script');
          }
          break;

        case 'script:output': {
          const isStderr = event.data?.stderr === true;
          if (event.message) {
            addOutput({ text: event.message, type: isStderr ? 'stderr' : 'stdout' });
          }
          break;
        }

        case 'script:complete':
          completeScript(true);
          break;

        case 'script:error':
          completeScript(false);
          if (event.message) {
            addOutput({ text: event.message, type: 'error' });
          }
          // Mark the current step and pipeline as failed
          setState((prev) => {
            const currentIndex = currentStepIndexRef.current;
            const newSteps =
              currentIndex >= 0
                ? prev.steps.map((s, i) =>
                    i === currentIndex
                      ? { ...s, status: 'failed' as const, endTime: Date.now() }
                      : s,
                  )
                : prev.steps;
            return { ...prev, status: 'failed', steps: newSteps };
          });
          break;

        case 'docker:checking':
          // Start setup phase for first step (Docker check only runs once)
          if (!setupStartedRef.current) {
            currentPhaseRef.current = 'setup';
            startScript('Setting up container', 'setup');
            setupStartedRef.current = true;
          }
          addOutput({ text: 'Checking Docker availability...', type: 'info' });
          break;

        case 'docker:available':
          addOutput({ text: 'Docker is available', type: 'success' });
          break;

        case 'docker:unavailable':
          addOutput({ text: 'Docker is not available', type: 'error' });
          completeScript(false);
          // Mark the current step and pipeline as failed
          setState((prev) => {
            const currentIndex = currentStepIndexRef.current;
            const newSteps =
              currentIndex >= 0
                ? prev.steps.map((s, i) =>
                    i === currentIndex
                      ? { ...s, status: 'failed' as const, endTime: Date.now() }
                      : s,
                  )
                : prev.steps;
            return { ...prev, status: 'failed', steps: newSteps };
          });
          break;

        case 'image:pulling':
          if (event.message) {
            addOutput({ text: `Pulling image: ${event.message}`, type: 'info' });
          }
          break;

        case 'image:pulled':
          if (event.message) {
            addOutput({ text: `Image ready: ${event.message}`, type: 'success' });
          }
          break;

        case 'instance:creating':
          // Start Setup phase if not already started (docker:checking starts it for first step)
          if (!setupStartedRef.current) {
            currentPhaseRef.current = 'setup';
            startScript('Setting up container', 'setup');
            setupStartedRef.current = true;
          }
          if (event.message) {
            addOutput({ text: event.message, type: 'info' });
          }
          break;

        case 'instance:created':
          if (event.message) {
            addOutput({ text: `Container created: ${event.message}`, type: 'info' });
          }
          break;

        case 'instance:copying':
          if (event.message) {
            addOutput({ text: event.message, type: 'info' });
          }
          break;

        case 'instance:started':
          addOutput({ text: 'Container started', type: 'success' });
          completeScript(true);
          break;

        case 'instance:stopping':
          currentPhaseRef.current = 'cleanup';
          startScript('Cleaning up', 'cleanup');
          if (event.message) {
            addOutput({ text: event.message, type: 'info' });
          }
          break;

        case 'instance:stopped':
          addOutput({ text: 'Container stopped', type: 'info' });
          completeScript(true);
          break;

        case 'artifacts:uploading':
          startScript('Uploading artifacts', 'artifacts-upload');
          if (event.message) {
            addOutput({ text: event.message, type: 'info' });
          }
          break;

        case 'artifacts:uploaded':
          if (event.message) {
            addOutput({ text: event.message, type: 'success' });
          }
          completeScript(true);
          break;

        case 'artifacts:generating':
          startScript('Downloading artifacts', 'artifacts-download');
          if (event.message) {
            addOutput({ text: event.message, type: 'info' });
          }
          break;

        case 'artifacts:generated':
          if (event.message) {
            addOutput({ text: event.message, type: 'success' });
          }
          completeScript(true);
          break;

        case 'info':
          if (event.message) {
            addOutput({ text: event.message, type: 'info' });
          }
          break;

        case 'error':
          if (event.message) {
            addOutput({ text: event.message, type: 'error' });
          }
          break;

        default:
          if (event.message) {
            addOutput({ text: event.message, type: 'info' });
          }
      }
    },
    [pipelineName, addOutput, startScript, completeScript],
  );

  // Use a ref for the handler to avoid re-subscribing on every render
  const handlerRef = useRef(handleEvent);
  handlerRef.current = handleEvent;

  useEffect(() => {
    const listener = (event: PipelineEvent) => {
      handlerRef.current(event);
    };

    pipelineEvents.onPipeline(listener);
    return () => {
      pipelineEvents.offPipeline(listener);
    };
  }, []); // Empty deps - subscribe once

  return { state, selectStep };
}
