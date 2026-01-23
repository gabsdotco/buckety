import { Reporter } from '@/types/reporter.js';
import { pipelineEvents, PipelineEvent } from '@/lib/events.js';

export class EventEmitterReporter implements Reporter {
  emit(event: PipelineEvent): void {
    pipelineEvents.emitPipeline(event);
  }
}
