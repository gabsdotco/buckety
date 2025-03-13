import Docker from 'dockerode';

import * as ui from '@/lib/ui';

export class Image {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  private async isImageAvailable(image: string): Promise<boolean> {
    const localImages = await this.docker.listImages();
    return localImages.some((img) => img.RepoTags?.includes(image));
  }

  public async pullImage(name: string) {
    ui.text(`Checking if image "${name}" is available`);

    const isImageAvailable = await this.isImageAvailable(name);

    if (isImageAvailable) {
      ui.text('Image already exists, skipping pull');
      return;
    }

    ui.text('Image not found, pulling it from the registry...');

    try {
      const stream = await this.docker.pull(name, {});

      await new Promise<void>((resolve) => {
        this.docker.modem.followProgress(stream, (error) => {
          if (error) {
            ui.text(`Error pulling image: "${error.message.trim()}"`, { fg: 'red' });
            ui.text('Exiting...');

            process.exit();
          }

          ui.text('Image pulled successfully');

          resolve();
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        ui.text(`Error pulling image: "${error.message.trim()}"`, { fg: 'red' });
      } else {
        ui.text(`Error pulling image: "${error}"`, { fg: 'red' });
      }

      ui.text('Exiting...');

      process.exit();
    }
  }
}
