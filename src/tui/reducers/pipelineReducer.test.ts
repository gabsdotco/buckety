import { describe, it, expect } from 'vitest';
import { pipelineReducer, INITIAL_STATE } from './pipelineReducer.js';

describe('pipelineReducer', () => {
  it('should return initial state', () => {
    // We pass an unknown action or just check initial state directly
    expect(INITIAL_STATE).toEqual(
      expect.objectContaining({
        status: 'idle',
        steps: [],
        selectedStepIndex: 0,
        activeStepIndex: -1,
      }),
    );
  });

  it('should handle pipeline:start', () => {
    const action = { type: 'EVENT', event: { type: 'pipeline:start' } } as const;
    const state = pipelineReducer(INITIAL_STATE, action);
    expect(state.status).toBe('running');
    expect(state.steps).toEqual([]);
    expect(state.activeStepIndex).toBe(-1);
  });

  it('should handle pipeline:steps', () => {
    const action = {
      type: 'EVENT',
      event: { type: 'pipeline:steps', data: { steps: ['step1', 'step2'] } },
    } as const;
    // Cast strict action to any to bypass readonly array issues in test
    const state = pipelineReducer(INITIAL_STATE, action as any);
    expect(state.steps).toHaveLength(2);
    expect(state.steps[0].name).toBe('step1');
    expect(state.steps[0].status).toBe('pending');
    expect(state.steps[1].name).toBe('step2');
  });

  it('should handle step:start for new step', () => {
    const action = {
      type: 'EVENT',
      event: { type: 'step:start', data: { stepName: 'step1' } },
    } as const;
    const state = pipelineReducer(INITIAL_STATE, action);

    expect(state.steps).toHaveLength(1);
    expect(state.steps[0].name).toBe('step1');
    expect(state.steps[0].status).toBe('running');
    expect(state.activeStepIndex).toBe(0);
  });

  it('should handle step:start for existing step', () => {
    // Setup initial state with steps
    const initialState = {
      ...INITIAL_STATE,
      steps: [
        { name: 'step1', status: 'pending', output: [], scripts: [] },
        { name: 'step2', status: 'pending', output: [], scripts: [] },
      ],
    } as any; // Cast to avoid TS issues with missing optional fields in test mock

    const action = {
      type: 'EVENT',
      event: { type: 'step:start', data: { stepName: 'step2' } },
    } as const;
    const state = pipelineReducer(initialState, action);

    expect(state.activeStepIndex).toBe(1);
    expect(state.steps[1].status).toBe('running');
    expect(state.steps[0].status).toBe('pending');
  });

  it('should handle SELECT_STEP action', () => {
    const initialState = {
      ...INITIAL_STATE,
      steps: [
        { name: 'step1', status: 'pending', output: [], scripts: [] },
        { name: 'step2', status: 'pending', output: [], scripts: [] },
      ],
    } as any;

    const action = { type: 'SELECT_STEP', index: 1 } as const;
    const state = pipelineReducer(initialState, action);

    expect(state.selectedStepIndex).toBe(1);
    expect(state.isUserSelected).toBe(true);
  });
});
