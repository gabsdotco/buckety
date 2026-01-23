import { PipelineEvent } from '@/lib/events.js';

export interface Reporter {
  emit(event: PipelineEvent): void;
}
