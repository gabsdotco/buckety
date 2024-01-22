import type { DefinitionsConfig } from './definitions';
import type { PipelinesConfig } from './pipeline';
import type { Image } from './image';

export interface Template {
  options?: any;
  clone?: any;
  definitions?: DefinitionsConfig;
  image?: Image;
  pipelines: PipelinesConfig;
}
