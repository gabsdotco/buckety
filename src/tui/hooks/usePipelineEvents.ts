import { useEffect, useReducer, useCallback } from 'react';

import type { PipelineState } from '../types.js';
import type { PipelineEvent } from '@/lib/events.js';

import { pipelineEvents } from '@/lib/events.js';
import { pipelineReducer, INITIAL_STATE } from '../reducers/pipelineReducer.js';

type UsePipelineEventsResult = {
  state: PipelineState;
  selectStep: (index: number) => void;
};

export function usePipelineEvents(pipelineName: string): UsePipelineEventsResult {
  const [state, dispatch] = useReducer(pipelineReducer, {
    ...INITIAL_STATE,
    pipelineName,
  });

  const selectStep = useCallback((index: number) => {
    dispatch({ type: 'SELECT_STEP', index });
  }, []);

  useEffect(() => {
    const listener = (event: PipelineEvent) => {
      dispatch({ type: 'EVENT', event });
    };

    pipelineEvents.onPipeline(listener);
    return () => {
      pipelineEvents.offPipeline(listener);
    };
  }, []);

  return { state, selectStep };
}
