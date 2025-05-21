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
    const currentPath = process.cwd();
    const artifactsPath = path.join(currentPath, this.path, this.id, 'artifacts');

    if (!fs.existsSync(artifactsPath)) {
      fs.mkdirSync(artifactsPath, { recursive: true });
    }

    return artifactsPath;
  }

  // public getArtifact(path: string) {}
  // public deleteArtifact(path: string) {}

  public async storeArtifact(origin: string, name: string) {
    const currentPath = process.cwd();

    const artifactsPath = this.getArtifactsDirectory();
    const destinationPath = path.join(artifactsPath, `${name}.tar`);

    ui.text(`Saving "${origin}" into "${destinationPath}"`);

    try {
      const originPath = path.join(currentPath, origin);

      await tar.c({ cwd: originPath, file: destinationPath }, ['.']);

      ui.text(`Saved "${origin}" into the artifacts folder`);

      return destinationPath;
    } catch (error) {
      if (error instanceof Error) throw new Error(`Error creating artifact: "${error.message}"`);
      throw new Error(`Error creating artifact: "${error}"`);
    }
  }
}
