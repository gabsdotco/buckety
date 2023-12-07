import { IStep } from './step';

export interface IPipelineStepConfig {
  step: IStep;
}

export interface IPipelines {
  default?: IPipelineStepConfig[];
  tags?: Record<string, IPipelineStepConfig[]>;
  custom?: Record<string, IPipelineStepConfig[]>;
  branches?: Record<string, IPipelineStepConfig[]>;
  'pull-requests'?: Record<string, IPipelineStepConfig[]>;
}
