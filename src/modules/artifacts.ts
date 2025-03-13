import fs from 'fs';
import path from 'path';

import * as tar from 'tar';

const DEFAULT_ARTIFACTS_PATH = '.buckety';

export class Artifacts {
  private artifacts: string[] = [];
  private artifactsPath: string = DEFAULT_ARTIFACTS_PATH;

  public getArtifact(path: string) {}
  public storeArtifact(path: string) {}
  public deleteArtifact(path: string) {}
}
