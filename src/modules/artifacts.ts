import fs from 'fs';
import tar from 'tar-fs';
import path from 'path';
import Docker from 'dockerode';

import { globby } from 'globby';

import * as ui from '@/lib/ui.js';

export class Artifacts {
  private tempOutputPath = path.join(`./.buckety/tmp`);
  private artifactsOutputPath = path.join(`./.buckety/artifacts`);

  constructor() {
    if (fs.existsSync(path.join('./.buckety'))) {
      fs.rmSync(path.join('./.buckety'), {
        recursive: true,
        force: true,
      });
    }
  }

  public async generateArtifacts(instance: Docker.Container, artifacts: string[]) {
    ui.box('Artifacts (Store)');

    if (!artifacts.length) {
      ui.text('- No artifacts defined for extraction in the step, skipping...');
      return;
    }

    await this.extractInstanceArchives(instance);
    await this.extractArtifactsFiles(artifacts);
  }

  public async uploadArtifacts(instance: Docker.Container) {
    ui.box('Artifacts (Upload)');

    const artifactBundle = await this.createArtifactsBundle();

    if (!artifactBundle) return;

    await this.uploadArtifactsBundle(instance, artifactBundle);
  }

  private async createArtifactsBundle() {
    if (!fs.existsSync(this.artifactsOutputPath)) {
      ui.text('- No artifacts directory found at "./.buckety/artifacts", skipping...');
      return;
    }

    const artifactFiles = await globby(['**/*'], {
      cwd: this.artifactsOutputPath,
      dot: true,
    });

    if (!artifactFiles.length) {
      ui.text('- No artifacts found to upload, skipping...');
      return;
    }

    ui.text(`- Uploading ${artifactFiles.length} artifact(s) to instance...`);

    const pack = tar.pack(this.artifactsOutputPath);

    return pack;
  }

  private async uploadArtifactsBundle(instance: Docker.Container, bundle: tar.Pack) {
    await new Promise((resolve, reject) => {
      instance.putArchive(bundle, { path: '/runner' }, (err) => {
        if (err) {
          ui.text(`- Error uploading artifacts: "${err.message}"`, { fg: 'red' });
          reject(err);

          return;
        }

        ui.text(`- Artifacts uploaded to instance at "/runner" directory`);
        resolve(true);
      });
    });
  }

  private async extractInstanceArchives(instance: Docker.Container) {
    const instanceArchivesStream = await instance.getArchive({ path: '/runner' });

    ui.text(`- Extracting instance archives to "${this.tempOutputPath}"`);

    await new Promise((resolve, reject) => {
      instanceArchivesStream
        .pipe(tar.extract(this.tempOutputPath))
        .on('finish', () => {
          ui.text(`- Instance archives extracted to "${this.tempOutputPath}"`);
          resolve(true);
        })
        .on('error', (err) => {
          ui.text(`- Error extracting instance archives: "${err.message}"`, { fg: 'red' });
          reject(err);
        });
    });
  }

  private async extractArtifactsFiles(artifacts: string[]) {
    ui.text(`- Processing artifacts with patterns: ${artifacts.join(', ')}`);

    const files = await globby(artifacts, {
      cwd: this.tempOutputPath + '/runner',
      dot: true,
    });

    if (!files.length) {
      ui.text('- No artifacts found for the given patterns', { fg: 'yellow' });
      return;
    }

    ui.text(`- Found ${files.length} artifact(s):`);

    files.map((file) => ui.text(`  - ${file}`));

    ui.text(`- Copying artifacts to "${this.artifactsOutputPath}"`);

    files.map((file) => {
      const sourcePath = path.join(this.tempOutputPath, '/runner', file);

      const destinationPath = path.join(this.artifactsOutputPath, file);
      const destinationDir = path.dirname(destinationPath);

      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }

      fs.copyFileSync(sourcePath, destinationPath);
    });

    ui.text(`- Artifacts copied to "${this.artifactsOutputPath}"`);

    fs.rmSync(this.tempOutputPath, {
      recursive: true,
      force: true,
    });
  }
}
