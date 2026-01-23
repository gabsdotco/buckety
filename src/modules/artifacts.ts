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
    emitPipelineEvent({ type: 'artifacts:generating', data: { patterns: artifacts } });

    if (!artifacts.length) {
      emitPipelineEvent({
        type: 'artifacts:generated',
        data: { count: 0, path: this.artifactsOutputPath },
      });
      return;
    }

    await this.extractInstanceArchives(instance);
    await this.extractArtifactsFiles(artifacts);
  }

  public async uploadArtifacts(instance: Docker.Container) {
    emitPipelineEvent({ type: 'artifacts:uploading' });

    const artifactBundle = await this.createArtifactsBundle();

    if (!artifactBundle) {
      emitPipelineEvent({
        type: 'artifacts:uploaded',
        data: { count: 0 },
      });
      return;
    }

    // Need to count files again? createArtifactsBundle returns pack stream.
    // I should probably count files before packing in createArtifactsBundle.
    // The previous implementation emitted "Uploading X artifact(s)" which implies counting inside createArtifactsBundle.
    // I'll return count from createArtifactsBundle or refactor.
    // For now I'll check createArtifactsBundle.

    // createArtifactsBundle now returns `pack` but I can modify it to return { pack, count }
    // Or I can modify createArtifactsBundle to emit the info event with count as it did.

    await this.uploadArtifactsBundle(instance, artifactBundle);
  }

  private async createArtifactsBundle() {
    if (!fs.existsSync(this.artifactsOutputPath)) {
      emitPipelineEvent({
        type: 'info',
        message: `No artifacts directory found at "${this.artifactsOutputPath}", skipping...`,
      });
      return;
    }

    const artifactFiles = await globby(['**/*'], {
      cwd: this.artifactsOutputPath,
      dot: true,
    });

    if (!artifactFiles.length) {
      emitPipelineEvent({
        type: 'info',
        message: 'No artifacts found to upload, skipping...',
      });
      return;
    }

    emitPipelineEvent({
      type: 'info',
      message: `Uploading ${artifactFiles.length} artifact(s) to instance...`,
    });

    // Pass count to uploadArtifacts by returning it?
    // Typescript: createArtifactsBundle returns pack.
    // I'll attach count to pack object? No, bad practice.
    // I'll return an object or tuple.
    const pack = tar.pack(this.artifactsOutputPath);

    // Hack: I can't easily change the return type without changing the caller which I am doing.
    // Let's modify createArtifactsBundle signature.
    return { pack, count: artifactFiles.length };
  }

  private async uploadArtifactsBundle(
    instance: Docker.Container,
    bundleResult: { pack: tar.Pack; count: number },
  ) {
    await new Promise((resolve, reject) => {
      instance.putArchive(bundleResult.pack, { path: CONTAINER_WORKDIR }, (err) => {
        if (err) {
          const error = new Error(`Error uploading artifacts: "${err.message}"`);
          emitPipelineEvent({ type: 'error', error });
          reject(error);
          return;
        }

        emitPipelineEvent({
          type: 'artifacts:uploaded',
          data: { count: bundleResult.count, path: CONTAINER_WORKDIR },
        });
        resolve(true);
      });
    });
  }

  private async extractInstanceArchives(instance: Docker.Container) {
    const instanceArchivesStream = await instance.getArchive({ path: CONTAINER_WORKDIR });

    emitPipelineEvent({
      type: 'info',
      message: `Extracting instance archives to "${this.tempOutputPath}"`,
    });

    await new Promise((resolve, reject) => {
      instanceArchivesStream
        .pipe(tar.extract(this.tempOutputPath))
        .on('finish', () => {
          emitPipelineEvent({
            type: 'info',
            message: `Instance archives extracted to "${this.tempOutputPath}"`,
          });
          resolve(true);
        })
        .on('error', (err) => {
          const error = new Error(`Error extracting instance archives: "${err.message}"`);
          emitPipelineEvent({ type: 'error', error });
          reject(error);
        });
    });
  }

  private async extractArtifactsFiles(artifacts: string[]) {
    emitPipelineEvent({
      type: 'info',
      message: `Processing artifacts with patterns: ${artifacts.join(', ')}`,
    });

    const files = await globby(artifacts, {
      cwd: path.join(this.tempOutputPath, CONTAINER_WORKDIR),
      dot: true,
    });

    if (!files.length) {
      emitPipelineEvent({
        type: 'info',
        message: 'No artifacts found for the given patterns',
      });
      return;
    }

    emitPipelineEvent({ type: 'info', message: `Found ${files.length} artifact(s)` });

    emitPipelineEvent({
      type: 'info',
      message: `Copying artifacts to "${this.artifactsOutputPath}"`,
    });

    files.map((file) => {
      const sourcePath = path.join(this.tempOutputPath, CONTAINER_WORKDIR, file);

      const destinationPath = path.join(this.artifactsOutputPath, file);
      const destinationDir = path.dirname(destinationPath);

      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }

      fs.copyFileSync(sourcePath, destinationPath);
    });

    emitPipelineEvent({
      type: 'artifacts:generated',
      data: { count: files.length, path: this.artifactsOutputPath },
    });

    fs.rmSync(this.tempOutputPath, {
      recursive: true,
      force: true,
    });
  }
}
