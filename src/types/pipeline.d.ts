import { IStep } from './step';

interface IPipelineConfig {
  step: IStep;
}

export interface IPipelines {
  default?: IPipelineConfig[];
  tags?: Record<string, IPipelineConfig[]>;
  custom?: Record<string, IPipelineConfig[]>;
  branches?: Record<string, IPipelineConfig[]>;
  'pull-requests'?: Record<string, IPipelineConfig[]>;
}
