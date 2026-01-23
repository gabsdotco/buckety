import Docker from 'dockerode';

import { emitPipelineEvent } from '@/lib/events.js';
import { handleAndEmitError } from '@/lib/errors.js';
import { docker } from '@/lib/docker.js';

export class Image {
  private docker: Docker;

  constructor() {
    this.docker = docker;
  }

  private async isImageAvailable(image: string): Promise<boolean> {
    const localImages = await this.docker.listImages();
    return localImages.some((img) => img.RepoTags?.includes(image));
  }

  public async pullImage(name: string) {
    emitPipelineEvent('info', `Checking if image "${name}" is available`);

    const isImageAvailable = await this.isImageAvailable(name);

    if (isImageAvailable) {
      emitPipelineEvent('image:pulled', `Image "${name}" already exists, skipping pull`);
      return;
    }

    emitPipelineEvent('image:pulling', `Pulling image "${name}" from registry...`);

    try {
      const stream = await this.docker.pull(name, {});

      await new Promise<void>((resolve, reject) => {
        this.docker.modem.followProgress(stream, (error) => {
          if (error) {
            emitPipelineEvent('error', `Error pulling image: "${error.message.trim()}"`);
            reject(error);
            return;
          }

          emitPipelineEvent('image:pulled', `Image "${name}" pulled successfully`);
          resolve();
        });
      });
    } catch (error) {
      handleAndEmitError('pulling image', error);
    }
  }
}
