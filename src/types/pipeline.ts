import { IImage } from './image';
import { IStep } from './step';

export interface IPipelineStepConfig {
  step: IStep;
  image: IImage;
}

export interface IPipelinesConfig {
  default?: IPipelineStepConfig[];
  tags?: Record<string, IPipelineStepConfig[]>;
  custom?: Record<string, IPipelineStepConfig[]>;
  branches?: Record<string, IPipelineStepConfig[]>;
  'pull-requests'?: Record<string, IPipelineStepConfig[]>;
}
