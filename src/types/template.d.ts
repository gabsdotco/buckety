import type { IDefinitions } from './definitions';
import type { IPipelines } from './pipeline';

export interface Template {
  options: any;
  clone: any;
  definitions: IDefinitions;
  pipelines: IPipelines;
}
