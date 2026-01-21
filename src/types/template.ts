import type { Definitions } from './definitions.js';
import type { Pipelines } from './pipeline.js';
import type { Image } from './image.js';

export interface Template {
  options?: any;
  clone?: any;
  image?: Image;
  definitions?: Definitions;
  pipelines: Pipelines;
}
