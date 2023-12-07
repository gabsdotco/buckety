import type { IDefinitions } from './definitions';
import type { IPipelines } from './pipeline';

export interface ITemplate {
  options: any;
  clone: any;
  definitions: IDefinitions;
  pipelines: IPipelines;
}
