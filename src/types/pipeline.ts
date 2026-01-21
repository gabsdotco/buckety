import { Step } from './step.js';

export interface PipelineStep {
  step: Step;
}

export type Pipeline = Array<PipelineStep>;

export interface Pipelines {
  default?: Pipeline;
  tags?: Record<string, Pipeline>;
  custom?: Record<string, Pipeline>;
  branches?: Record<string, Pipeline>;
  'pull-requests'?: Record<string, Pipeline>;
}
