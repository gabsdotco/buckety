import { EventEmitter } from 'events';

export type PipelineEvent =
  | { type: 'pipeline:start' }
  | { type: 'pipeline:steps'; data: { steps: string[] } }
  | { type: 'pipeline:complete' }
  | { type: 'pipeline:error'; error: unknown }
  | { type: 'step:start'; data: { stepName: string } }
  | { type: 'step:complete'; data: { stepName: string } }
  | { type: 'step:error'; data: { stepName: string }; error: unknown }
  | {
      type: 'script:start';
      data: { script: string; index: number; total: number; sanitizedScript: string };
    }
  | { type: 'script:output'; data: { text: string; stderr: boolean } }
  | { type: 'script:complete' }
  | { type: 'script:error'; error: unknown }
  | { type: 'docker:checking' }
  | { type: 'docker:available' }
  | { type: 'docker:unavailable'; error: unknown }
  | { type: 'image:pulling'; data: { image: string } }
  | { type: 'image:pulled'; data: { image: string; cached?: boolean } }
  | { type: 'instance:creating'; data: { image: string } }
  | { type: 'instance:created'; data: { id: string; shortId: string } }
  | { type: 'instance:copying' }
  | { type: 'instance:copied' }
  | { type: 'instance:started' }
  | { type: 'instance:stopping' }
  | { type: 'instance:stopped' }
  | { type: 'artifacts:uploading' }
  | { type: 'artifacts:uploaded'; data: { count?: number; path?: string } }
  | { type: 'artifacts:generating'; data: { patterns: string[] } }
  | { type: 'artifacts:generated'; data: { count: number; path: string } }
  | { type: 'info'; message: string }
  | { type: 'error'; error: unknown };

export type CommandEventType = 'rerun:pipeline' | 'rerun:step' | 'cancel:pipeline';

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

/**
 * @deprecated Use Reporter.emit instead (Dependency Injection)
 */
export function emitPipelineEvent(event: PipelineEvent) {
  pipelineEvents.emitPipeline(event);
}

export function emitCommand(type: CommandEventType, data?: Record<string, unknown>) {
  pipelineEvents.emitCommand({ type, data });
}
