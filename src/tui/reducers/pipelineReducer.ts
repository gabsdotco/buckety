/**
 * Reducer for managing pipeline state.
 */

import { PipelineEvent } from '@/lib/events.js';
import { PipelineState, OutputLine, ScriptPhase, ScriptOutput, StepState } from '../types.js';

export interface ReducerState extends PipelineState {
  // Internal tracking
  activeStepIndex: number; // The step currently running/receiving output
  isUserSelected: boolean; // If true, don't auto-follow active step
  currentPhase: ScriptPhase; // Current execution phase
}

export type Action =
  | { type: 'SELECT_STEP'; index: number }
  | { type: 'EVENT'; event: PipelineEvent };

export const INITIAL_STATE: ReducerState = {
  pipelineName: '',
  status: 'idle',
  steps: [],
  selectedStepIndex: 0,
  globalOutput: [],
  activeStepIndex: -1,
  isUserSelected: false,
  currentPhase: 'setup',
};

/**
 * Helper to add output to current step or global
 */
function addOutput(state: ReducerState, line: OutputLine): ReducerState {
  const { activeStepIndex } = state;

  if (activeStepIndex >= 0 && activeStepIndex < state.steps.length) {
    // Add to current step's output and current script
    const newSteps = state.steps.map((step, i) => {
      if (i !== activeStepIndex) return step;

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
    return { ...state, steps: newSteps };
  } else {
    // Add to global output (before any step starts)
    return { ...state, globalOutput: [...state.globalOutput, line] };
  }
}

/**
 * Helper to start a new script in current step
 */
function startScript(
  state: ReducerState,
  command: string,
  phaseOverride?: ScriptPhase,
): ReducerState {
  const { activeStepIndex, currentPhase } = state;
  const scriptPhase = phaseOverride ?? currentPhase;

  if (activeStepIndex >= 0 && activeStepIndex < state.steps.length) {
    const newSteps = state.steps.map((step, i) => {
      if (i !== activeStepIndex) return step;

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
    return { ...state, steps: newSteps };
  }
  return state;
}

/**
 * Helper to complete the current script
 */
function completeScript(state: ReducerState, success: boolean): ReducerState {
  const { activeStepIndex } = state;

  if (activeStepIndex >= 0 && activeStepIndex < state.steps.length) {
    const newSteps = state.steps.map((step, i) => {
      if (i !== activeStepIndex) return step;

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
    return { ...state, steps: newSteps };
  }
  return state;
}

/**
 * Handles incoming pipeline events
 */
function handlePipelineEvent(state: ReducerState, event: PipelineEvent): ReducerState {
  switch (event.type) {
    case 'pipeline:start':
      return {
        ...state,
        status: 'running',
        steps: [],
        selectedStepIndex: 0,
        globalOutput: [],
        activeStepIndex: -1,
        isUserSelected: false,
        currentPhase: 'setup',
      };

    case 'pipeline:steps':
      if (event.data?.steps) {
        const stepNames = event.data.steps as string[];
        return {
          ...state,
          steps: stepNames.map((name) => ({
            name,
            status: 'pending' as const,
            output: [],
            scripts: [],
          })),
        };
      }
      return state;

    case 'pipeline:complete':
      return addOutput(
        { ...state, status: 'success' },
        { text: 'Pipeline completed successfully', type: 'success' },
      );

    case 'pipeline:error': {
      let newState: ReducerState = { ...state, status: 'failed' };
      if (event.message) {
        newState = addOutput(newState, { text: `Error: ${event.message}`, type: 'error' });
      }
      return newState;
    }

    case 'step:start':
      if (event.data?.stepName) {
        const stepName = event.data.stepName as string;
        const existingIndex = state.steps.findIndex((s) => s.name === stepName);

        let activeStepIndex: number;
        let newSteps: StepState[];

        if (existingIndex !== -1) {
          activeStepIndex = existingIndex;
          newSteps = state.steps.map((s, i) =>
            i === existingIndex ? { ...s, status: 'running' as const, startTime: Date.now() } : s,
          );
        } else {
          // Fallback
          const newStep: StepState = {
            name: stepName,
            status: 'running',
            output: [],
            scripts: [],
            startTime: Date.now(),
          };
          newSteps = [...state.steps, newStep];
          activeStepIndex = newSteps.length - 1;
        }

        const selectedStepIndex = state.isUserSelected ? state.selectedStepIndex : activeStepIndex;

        return {
          ...state,
          steps: newSteps,
          activeStepIndex,
          selectedStepIndex,
        };
      }
      return state;

    case 'step:complete':
      if (event.data?.stepName) {
        const stepName = event.data.stepName as string;
        const completedIndex = state.steps.findIndex((s) => s.name === stepName);
        const newSteps = state.steps.map((s) =>
          s.name === stepName ? { ...s, status: 'success' as const, endTime: Date.now() } : s,
        );

        let newSelectedIndex = state.selectedStepIndex;
        let isUserSelected = state.isUserSelected;

        // Auto-focus next step if user was viewing the completed step
        if (
          completedIndex !== -1 &&
          completedIndex === state.selectedStepIndex &&
          completedIndex < state.steps.length - 1
        ) {
          newSelectedIndex = completedIndex + 1;
          isUserSelected = false; // Reset to auto-follow
        }

        return {
          ...state,
          steps: newSteps,
          selectedStepIndex: newSelectedIndex,
          isUserSelected,
        };
      }
      return state;

    case 'step:error':
      if (event.data?.stepName) {
        const stepName = event.data.stepName as string;
        let newState = {
          ...state,
          steps: state.steps.map((s) =>
            s.name === stepName ? { ...s, status: 'failed' as const, endTime: Date.now() } : s,
          ),
        };
        if (event.message) {
          newState = addOutput(newState, { text: `Error: ${event.message}`, type: 'error' });
        }
        return newState;
      }
      return state;

    case 'script:start':
      if (event.message) {
        // Update phase and start script
        return startScript({ ...state, currentPhase: 'script' }, event.message, 'script');
      }
      return state;

    case 'script:output': {
      const isStderr = event.data?.stderr === true;
      if (event.message) {
        return addOutput(state, { text: event.message, type: isStderr ? 'stderr' : 'stdout' });
      }
      return state;
    }

    case 'script:complete':
      return completeScript(state, true);

    case 'script:error': {
      let newState = completeScript(state, false);
      if (event.message) {
        newState = addOutput(newState, { text: event.message, type: 'error' });
      }
      // Fail current step and pipeline
      const { activeStepIndex } = newState;
      if (activeStepIndex >= 0) {
        const newSteps = newState.steps.map((s, i) =>
          i === activeStepIndex ? { ...s, status: 'failed' as const, endTime: Date.now() } : s,
        );
        newState = { ...newState, status: 'failed', steps: newSteps };
      }
      return newState;
    }

    case 'docker:checking': {
      let newState = state;
      // Check if setup already started for this step
      const step = state.steps[state.activeStepIndex];
      const setupStarted = step?.scripts.some((s) => s.phase === 'setup');

      if (!setupStarted) {
        newState = startScript(
          { ...state, currentPhase: 'setup' },
          'Setting up container',
          'setup',
        );
      }
      return addOutput(newState, { text: 'Checking Docker availability...', type: 'info' });
    }

    case 'docker:available':
      return addOutput(state, { text: 'Docker is available', type: 'success' });

    case 'docker:unavailable': {
      let newState = addOutput(state, { text: 'Docker is not available', type: 'error' });
      newState = completeScript(newState, false);
      // Fail current step and pipeline
      const { activeStepIndex } = newState;
      if (activeStepIndex >= 0) {
        const newSteps = newState.steps.map((s, i) =>
          i === activeStepIndex ? { ...s, status: 'failed' as const, endTime: Date.now() } : s,
        );
        newState = { ...newState, status: 'failed', steps: newSteps };
      }
      return newState;
    }

    case 'image:pulling':
      if (event.message) {
        return addOutput(state, { text: `Pulling image: ${event.message}`, type: 'info' });
      }
      return state;

    case 'image:pulled':
      if (event.message) {
        return addOutput(state, { text: `Image ready: ${event.message}`, type: 'success' });
      }
      return state;

    case 'instance:creating': {
      let newState = state;
      const step = state.steps[state.activeStepIndex];
      const setupStarted = step?.scripts.some((s) => s.phase === 'setup');

      if (!setupStarted) {
        newState = startScript(
          { ...state, currentPhase: 'setup' },
          'Setting up container',
          'setup',
        );
      }
      if (event.message) {
        newState = addOutput(newState, { text: event.message, type: 'info' });
      }
      return newState;
    }

    case 'instance:created':
      if (event.message) {
        return addOutput(state, { text: `Container created: ${event.message}`, type: 'info' });
      }
      return state;

    case 'instance:copying':
      if (event.message) {
        return addOutput(state, { text: event.message, type: 'info' });
      }
      return state;

    case 'instance:started':
      return completeScript(addOutput(state, { text: 'Container started', type: 'success' }), true);

    case 'instance:stopping': {
      let newState: ReducerState = { ...state, currentPhase: 'cleanup' };
      newState = startScript(newState, 'Cleaning up', 'cleanup');
      if (event.message) {
        newState = addOutput(newState, { text: event.message, type: 'info' });
      }
      return newState;
    }

    case 'instance:stopped':
      return completeScript(addOutput(state, { text: 'Container stopped', type: 'info' }), true);

    case 'artifacts:uploading': {
      let newState = startScript(state, 'Uploading artifacts', 'artifacts-upload');
      if (event.message) {
        newState = addOutput(newState, { text: event.message, type: 'info' });
      }
      return newState;
    }

    case 'artifacts:uploaded': {
      let newState = state;
      if (event.message) {
        newState = addOutput(newState, { text: event.message, type: 'success' });
      }
      return completeScript(newState, true);
    }

    case 'artifacts:generating': {
      let newState = startScript(state, 'Downloading artifacts', 'artifacts-download');
      if (event.message) {
        newState = addOutput(newState, { text: event.message, type: 'info' });
      }
      return newState;
    }

    case 'artifacts:generated': {
      let newState = state;
      if (event.message) {
        newState = addOutput(newState, { text: event.message, type: 'success' });
      }
      return completeScript(newState, true);
    }

    case 'info':
      if (event.message) {
        return addOutput(state, { text: event.message, type: 'info' });
      }
      return state;

    case 'error':
      if (event.message) {
        return addOutput(state, { text: event.message, type: 'error' });
      }
      return state;

    default:
      if (event.message) {
        return addOutput(state, { text: event.message, type: 'info' });
      }
      return state;
  }
}

export function pipelineReducer(state: ReducerState, action: Action): ReducerState {
  switch (action.type) {
    case 'SELECT_STEP':
      return {
        ...state,
        selectedStepIndex: Math.max(0, Math.min(action.index, state.steps.length - 1)),
        isUserSelected: true,
      };
    case 'EVENT':
      return handlePipelineEvent(state, action.event);
    default:
      return state;
  }
}
