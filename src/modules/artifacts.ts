import fs from 'fs';
import tar from 'tar-fs';
import path from 'path';
import Docker from 'dockerode';

import { globby } from 'globby';

import { emitPipelineEvent } from '@/lib/events.js';
import { BUCKETY_DIR, TEMP_DIR, ARTIFACTS_DIR, CONTAINER_WORKDIR } from '@/lib/paths.js';

export class Artifacts {
  private tempOutputPath = TEMP_DIR;
  private artifactsOutputPath = ARTIFACTS_DIR;

  constructor() {
    if (fs.existsSync(BUCKETY_DIR)) {
      fs.rmSync(BUCKETY_DIR, {
        recursive: true,
        force: true,
      });
    }
  }

  public async generateArtifacts(instance: Docker.Container, artifacts: string[]) {
    emitPipelineEvent('artifacts:generating', 'Processing artifacts...');

    if (!artifacts.length) {
      emitPipelineEvent('artifacts:generated', 'No artifacts defined for this step');
      return;
    }

    await this.extractInstanceArchives(instance);
    await this.extractArtifactsFiles(artifacts);
  }

  public async uploadArtifacts(instance: Docker.Container) {
    emitPipelineEvent('artifacts:uploading', 'Checking for artifacts to upload...');

    const artifactBundle = await this.createArtifactsBundle();

    if (!artifactBundle) {
      emitPipelineEvent('artifacts:uploaded', 'No artifacts to upload');
      return;
    }

    await this.uploadArtifactsBundle(instance, artifactBundle);
  }

  private async createArtifactsBundle() {
    if (!fs.existsSync(this.artifactsOutputPath)) {
      emitPipelineEvent(
        'info',
        `No artifacts directory found at "${this.artifactsOutputPath}", skipping...`,
      );
      return;
    }

    const artifactFiles = await globby(['**/*'], {
      cwd: this.artifactsOutputPath,
      dot: true,
    });

    if (!artifactFiles.length) {
      emitPipelineEvent('info', 'No artifacts found to upload, skipping...');
      return;
    }

    emitPipelineEvent('info', `Uploading ${artifactFiles.length} artifact(s) to instance...`);

    const pack = tar.pack(this.artifactsOutputPath);

    return pack;
  }

  private async uploadArtifactsBundle(instance: Docker.Container, bundle: tar.Pack) {
    await new Promise((resolve, reject) => {
      instance.putArchive(bundle, { path: CONTAINER_WORKDIR }, (err) => {
        if (err) {
          emitPipelineEvent('error', `Error uploading artifacts: "${err.message}"`);
          reject(err);
          return;
        }

        emitPipelineEvent(
          'artifacts:uploaded',
          `Artifacts uploaded to instance at "${CONTAINER_WORKDIR}" directory`,
        );
        resolve(true);
      });
    });
  }

  private async extractInstanceArchives(instance: Docker.Container) {
    const instanceArchivesStream = await instance.getArchive({ path: CONTAINER_WORKDIR });

    emitPipelineEvent('info', `Extracting instance archives to "${this.tempOutputPath}"`);

    await new Promise((resolve, reject) => {
      instanceArchivesStream
        .pipe(tar.extract(this.tempOutputPath))
        .on('finish', () => {
          emitPipelineEvent('info', `Instance archives extracted to "${this.tempOutputPath}"`);
          resolve(true);
        })
        .on('error', (err) => {
          emitPipelineEvent('error', `Error extracting instance archives: "${err.message}"`);
          reject(err);
        });
    });
  }

  private async extractArtifactsFiles(artifacts: string[]) {
    emitPipelineEvent('info', `Processing artifacts with patterns: ${artifacts.join(', ')}`);

    const files = await globby(artifacts, {
      cwd: path.join(this.tempOutputPath, CONTAINER_WORKDIR),
      dot: true,
    });

    if (!files.length) {
      emitPipelineEvent('info', 'No artifacts found for the given patterns');
      return;
    }

    emitPipelineEvent('info', `Found ${files.length} artifact(s)`);

    emitPipelineEvent('info', `Copying artifacts to "${this.artifactsOutputPath}"`);

    files.map((file) => {
      const sourcePath = path.join(this.tempOutputPath, CONTAINER_WORKDIR, file);

      const destinationPath = path.join(this.artifactsOutputPath, file);
      const destinationDir = path.dirname(destinationPath);

      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }

      fs.copyFileSync(sourcePath, destinationPath);
    });

    emitPipelineEvent('artifacts:generated', `Artifacts copied to "${this.artifactsOutputPath}"`);

    fs.rmSync(this.tempOutputPath, {
      recursive: true,
      force: true,
    });
  }
}
