import type { Definitions } from './definitions';
import type { Pipelines } from './pipeline';
import type { Image } from './image';

export interface Template {
  options?: any;
  clone?: any;
  image?: Image;
  definitions?: Definitions;
  pipelines: Pipelines;
}
