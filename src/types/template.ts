import type { IDefinitionsConfig } from './definitions';
import type { IPipelinesConfig } from './pipeline';
import type { IImage } from './image';

export interface ITemplate {
  options?: any;
  clone?: any;
  definitions?: IDefinitionsConfig;
  image?: IImage;
  pipelines: IPipelinesConfig;
}
