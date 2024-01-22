import { Step } from './step';

export interface PipelineStepConfig {
  step: Step;
}

export interface PipelinesConfig {
  default?: PipelineStepConfig[];
  tags?: Record<string, PipelineStepConfig[]>;
  custom?: Record<string, PipelineStepConfig[]>;
  branches?: Record<string, PipelineStepConfig[]>;
  'pull-requests'?: Record<string, PipelineStepConfig[]>;
}
