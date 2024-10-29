import Docker from 'dockerode';

import fs from 'fs';
import path from 'path';

import * as tar from 'tar';

import * as ui from '@/lib/ui';

export class Container {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  public async checkDockerAvailability() {
    try {
      await this.docker.ping();
    } catch {
      ui.text('Docker is not running, or you do not have permission to access it', { fg: 'red' });
      ui.text('Exiting...');

      process.exit();
    }
  }

  private async checkImageAvailability(image: string): Promise<boolean> {
    const availableImages = await this.docker.listImages();
    return availableImages.some((img) => img.RepoTags?.includes(image));
  }

  private async createDirectoryBundle(): Promise<string> {
    const currentDir = process.cwd();

    const bundleDir = path.join(currentDir, '.buckety');
    const tarBallPath = path.join(bundleDir, 'project.tar');

    if (!fs.existsSync(bundleDir)) {
      fs.mkdirSync(bundleDir, {
        recursive: true,
      });
    }

    try {
      const fullPath = path.join(currentDir, 'example');
      await tar.c({ gzip: true, file: tarBallPath, cwd: fullPath }, ['.']);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error creating bundle: "${error.message.trim()}"`);
      }

      throw new Error(`Error creating bundle: "${error}"`);
    }

    return tarBallPath;
  }

  private async createContainerImage(image: string) {
    ui.text(`Checking if image "${image}" is available`);

    const isImageAvailable = await this.checkImageAvailability(image);

    if (isImageAvailable) {
      ui.text('Image already exists, skipping pull');
      return;
    }

    ui.text('Image not found, pulling it from the registry...');

    try {
      const stream = await this.docker.pull(image, {});

      return new Promise<void>((resolve) => {
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

  public async createAndSetupContainer(image: string): Promise<Docker.Container> {
    try {
      await this.createContainerImage(image);

      const container = await this.docker.createContainer({
        Image: image,
        WorkingDir: '/runner',
        Tty: true,
      });

      ui.text(`Created container "${container.id.substring(0, 4)}..${container.id.slice(-4)}"`);

      const tarBallPath = await this.createDirectoryBundle();
      const tarStream = fs.createReadStream(tarBallPath);

      await container.putArchive(tarStream, { path: '/runner' });

      ui.text('Project files copied to container');

      fs.unlinkSync(tarBallPath);
      fs.rmdirSync(path.join(process.cwd(), '.buckety'));

      return container;
    } catch (error) {
      if (error instanceof Error) {
        ui.text(`Error creating container: "${error.message.trim()}"`, { fg: 'red' });
      } else {
        ui.text(`Error creating container: "${error}"`, { fg: 'red' });
      }

      ui.text('Exiting...');

      process.exit();
    }
  }

  public async stopAndRemoveContainer(container: Docker.Container) {
    ui.box('Cleanup');
    ui.text('Stopping and removing container...');

    await container.stop();
    await container.remove();

    ui.text('Container stopped and removed');
  }

  public async runContainerScript(
    container: Docker.Container,
    script: string,
    scriptIndex: number,
    totalScripts: number,
  ) {
    const sanitizedScript = script.replace(/\n/g, '; ');

    if (scriptIndex > 1 && scriptIndex <= totalScripts) ui.divider();

    ui.text(`(${scriptIndex}/${totalScripts}) Running Script: "${sanitizedScript}"`);

    const exec = await container.exec({
      Cmd: ['bash', '-c', script],
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    return new Promise<void>((resolve) => {
      this.docker.modem.demuxStream(stream, process.stdout, process.stderr);

      stream.on('error', async (err) => {
        ui.text(`❌Script failed with error: "${err.message}"`, { fg: 'red' });

        await this.stopAndRemoveContainer(container);

        process.exit();
      });

      stream.on('end', async () => {
        const result = await exec.inspect();

        if (result.ExitCode !== 0) {
          ui.text(`❌Script failed with code "${result.ExitCode}"`, { fg: 'red' });

          await this.stopAndRemoveContainer(container);

          process.exit();
        } else {
          ui.text('✔️ Script executed successfully', { fg: 'green' });

          resolve();
        }
      });
    });
  }
}
