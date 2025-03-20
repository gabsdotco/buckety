import fs from 'fs';
import path from 'path';

import * as tar from 'tar';

import * as ui from '@/lib/ui';

const DEFAULT_ARTIFACTS_PATH = '.buckety';

export class Artifacts {
  private id: string;
  private path: string = DEFAULT_ARTIFACTS_PATH;

  constructor() {
    this.id = Math.random().toString(36).substr(2, 9);
  }

  private getArtifactsDirectory() {
    const currentDir = process.cwd();
    const artifactsDirPath = path.join(currentDir, this.path, this.id, 'artifacts');

    if (!fs.existsSync(artifactsDirPath)) {
      fs.mkdirSync(artifactsDirPath, { recursive: true });
    }

    return artifactsDirPath;
  }

  // public getArtifact(path: string) {}
  // public deleteArtifact(path: string) {}

  public async storeArtifact(target: string, name: string) {
    const currentDir = process.cwd();

    const artifactsDirPath = this.getArtifactsDirectory();
    const targetTarballPath = path.join(artifactsDirPath, `${name}.tar`);

    ui.text(`Saving "${target}" into "${artifactsDirPath}"`);

    try {
      const targetDirectoryPath = path.join(currentDir, target);

      await tar.c(
        {
          gzip: true,
          cwd: targetDirectoryPath,
          file: targetTarballPath,
        },
        ['.'],
      );

      ui.text(`Saved "${target}" into the artifacts folder`);

      return targetTarballPath;
    } catch (error) {
      if (error instanceof Error) throw new Error(`Error creating artifact: "${error.message}"`);
      throw new Error(`Error creating artifact: "${error}"`);
    }
  }
}
