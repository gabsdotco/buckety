import { IDefinitions } from './definitions';
import { IPipelines } from './pipeline';

export interface Template {
  options: any;
  clone: any;
  definitions: IDefinitions;
  pipelines: IPipelines;
}
