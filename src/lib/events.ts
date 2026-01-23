import { EventEmitter } from 'events';

export type PipelineEventType =
  | 'pipeline:start'
  | 'pipeline:steps'
  | 'pipeline:complete'
  | 'pipeline:error'
  | 'step:start'
  | 'step:complete'
  | 'step:error'
  | 'script:start'
  | 'script:output'
  | 'script:complete'
  | 'script:error'
  | 'docker:checking'
  | 'docker:available'
  | 'docker:unavailable'
  | 'image:pulling'
  | 'image:pulled'
  | 'instance:creating'
  | 'instance:created'
  | 'instance:copying'
  | 'instance:copied'
  | 'instance:started'
  | 'instance:stopping'
  | 'instance:stopped'
  | 'artifacts:uploading'
  | 'artifacts:uploaded'
  | 'artifacts:generating'
  | 'artifacts:generated'
  | 'info'
  | 'error';

export type PipelineEvent = {
  type: PipelineEventType;
  message?: string;
  data?: Record<string, unknown>;
};

export type CommandEventType = 'rerun:pipeline' | 'rerun:step';

export type CommandEvent = {
  type: CommandEventType;
  data?: Record<string, unknown>;
};

class PipelineEventEmitter extends EventEmitter {
  emitPipeline(payload: PipelineEvent): boolean {
    return super.emit('pipeline', payload);
  }

  onPipeline(listener: (payload: PipelineEvent) => void): this {
    return super.on('pipeline', listener);
  }

  offPipeline(listener: (payload: PipelineEvent) => void): this {
    return super.off('pipeline', listener);
  }

  emitCommand(payload: CommandEvent): boolean {
    return super.emit('command', payload);
  }

  onCommand(listener: (payload: CommandEvent) => void): this {
    return super.on('command', listener);
  }

  offCommand(listener: (payload: CommandEvent) => void): this {
    return super.off('command', listener);
  }
}

export const pipelineEvents = new PipelineEventEmitter();

export function emitPipelineEvent(
  type: PipelineEventType,
  message?: string,
  data?: Record<string, unknown>,
) {
  pipelineEvents.emitPipeline({ type, message, data });
}

export function emitCommand(type: CommandEventType, data?: Record<string, unknown>) {
  pipelineEvents.emitCommand({ type, data });
}
