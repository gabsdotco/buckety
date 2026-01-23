import fs from 'fs';
import tar from 'tar-fs';
import path from 'path';
import Docker from 'dockerode';

import { globby } from 'globby';

import { Reporter } from '@/types/reporter.js';
import { BUCKETY_DIR, TEMP_DIR, ARTIFACTS_DIR, CONTAINER_WORKDIR } from '@/lib/paths.js';

export class Artifacts {
  private tempOutputPath = TEMP_DIR;
  private artifactsOutputPath = ARTIFACTS_DIR;
  private reporter: Reporter;

  constructor(reporter: Reporter) {
    this.reporter = reporter;
    if (fs.existsSync(BUCKETY_DIR)) {
      fs.rmSync(BUCKETY_DIR, {
        recursive: true,
        force: true,
      });
    }
  }

  public async generateArtifacts(instance: Docker.Container, artifacts: string[]) {
    this.reporter.emit({ type: 'artifacts:generating', data: { patterns: artifacts } });

    if (!artifacts.length) {
      this.reporter.emit({
        type: 'artifacts:generated',
        data: { count: 0, path: this.artifactsOutputPath },
      });
      return;
    }

    await this.extractInstanceArchives(instance);
    await this.extractArtifactsFiles(artifacts);
  }

  public async uploadArtifacts(instance: Docker.Container) {
    this.reporter.emit({ type: 'artifacts:uploading' });

    const artifactBundle = await this.createArtifactsBundle();

    if (!artifactBundle) {
      this.reporter.emit({
        type: 'artifacts:uploaded',
        data: { count: 0 },
      });
      return;
    }

    await this.uploadArtifactsBundle(instance, artifactBundle);
  }

  private async createArtifactsBundle() {
    if (!fs.existsSync(this.artifactsOutputPath)) {
      this.reporter.emit({
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
      this.reporter.emit({
        type: 'info',
        message: 'No artifacts found to upload, skipping...',
      });
      return;
    }

    this.reporter.emit({
      type: 'info',
      message: `Uploading ${artifactFiles.length} artifact(s) to instance...`,
    });

    const pack = tar.pack(this.artifactsOutputPath);

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
          this.reporter.emit({ type: 'error', error });
          reject(error);
          return;
        }

        this.reporter.emit({
          type: 'artifacts:uploaded',
          data: { count: bundleResult.count, path: CONTAINER_WORKDIR },
        });
        resolve(true);
      });
    });
  }

  private async extractInstanceArchives(instance: Docker.Container) {
    const instanceArchivesStream = await instance.getArchive({ path: CONTAINER_WORKDIR });

    this.reporter.emit({
      type: 'info',
      message: `Extracting instance archives to "${this.tempOutputPath}"`,
    });

    await new Promise((resolve, reject) => {
      instanceArchivesStream
        .pipe(tar.extract(this.tempOutputPath))
        .on('finish', () => {
          this.reporter.emit({
            type: 'info',
            message: `Instance archives extracted to "${this.tempOutputPath}"`,
          });
          resolve(true);
        })
        .on('error', (err) => {
          const error = new Error(`Error extracting instance archives: "${err.message}"`);
          this.reporter.emit({ type: 'error', error });
          reject(error);
        });
    });
  }

  private async extractArtifactsFiles(artifacts: string[]) {
    this.reporter.emit({
      type: 'info',
      message: `Processing artifacts with patterns: ${artifacts.join(', ')}`,
    });

    const files = await globby(artifacts, {
      cwd: path.join(this.tempOutputPath, CONTAINER_WORKDIR),
      dot: true,
    });

    if (!files.length) {
      this.reporter.emit({
        type: 'info',
        message: 'No artifacts found for the given patterns',
      });
      return;
    }

    this.reporter.emit({ type: 'info', message: `Found ${files.length} artifact(s)` });

    this.reporter.emit({
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

    this.reporter.emit({
      type: 'artifacts:generated',
      data: { count: files.length, path: this.artifactsOutputPath },
    });

    fs.rmSync(this.tempOutputPath, {
      recursive: true,
      force: true,
    });
  }
}
