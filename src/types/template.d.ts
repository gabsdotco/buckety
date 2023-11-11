import { IPipelines } from './pipeline';

export interface Template {
  options: any;
  clone: any;
  definitions: any;
  pipelines: IPipelines;
}
