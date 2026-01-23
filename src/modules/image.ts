import Docker from 'dockerode';

import { Reporter } from '@/types/reporter.js';
import { handleAndEmitError } from '@/lib/errors.js';
import { docker } from '@/lib/docker.js';

export class Image {
  private docker: Docker;
  private reporter: Reporter;

  constructor(reporter: Reporter) {
    this.docker = docker;
    this.reporter = reporter;
  }

  private async isImageAvailable(image: string): Promise<boolean> {
    const localImages = await this.docker.listImages();
    return localImages.some((img) => img.RepoTags?.includes(image));
  }

  public async pullImage(name: string) {
    this.reporter.emit({ type: 'info', message: `Checking if image "${name}" is available` });

    const isImageAvailable = await this.isImageAvailable(name);

    if (isImageAvailable) {
      this.reporter.emit({ type: 'image:pulled', data: { image: name, cached: true } });
      return;
    }

    this.reporter.emit({ type: 'image:pulling', data: { image: name } });

    try {
      const stream = await this.docker.pull(name, {});

      await new Promise<void>((resolve, reject) => {
        this.docker.modem.followProgress(stream, (error) => {
          if (error) {
            const err = new Error(`Error pulling image: "${error.message.trim()}"`);
            this.reporter.emit({ type: 'error', error: err });
            reject(err);
            return;
          }

          this.reporter.emit({ type: 'image:pulled', data: { image: name, cached: false } });
          resolve();
        });
      });
    } catch (error) {
      handleAndEmitError('pulling image', error, this.reporter);
    }
  }
}
