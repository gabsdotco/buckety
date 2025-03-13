import Docker from 'dockerode';

import fs from 'fs';
import path from 'path';

import * as tar from 'tar';

import * as ui from '@/lib/ui';

import { Image } from './image';

export class Instance {
  private image: Image;
  private docker: Docker;

  constructor() {
    this.image = new Image();
    this.docker = new Docker();
  }

  public async checkAvailability() {
    try {
      await this.docker.ping();
    } catch {
      ui.text('Docker is not running, or you do not have permission to access it', { fg: 'red' });
      ui.text('Exiting...');

      process.exit();
    }
  }

  private async createDirectoryBundle(): Promise<string> {
    const currentDir = process.cwd();

    const artifactsDirectoryPath = path.join(currentDir, '.buckety');
    const targetTarballPath = path.join(artifactsDirectoryPath, 'project.tar');

    if (!fs.existsSync(artifactsDirectoryPath)) {
      fs.mkdirSync(artifactsDirectoryPath, {
        recursive: true,
      });
    }

    try {
      const targetDirectoryPath = path.join(currentDir, 'example');

      await tar.c(
        {
          gzip: true,
          cwd: targetDirectoryPath,
          file: targetTarballPath,
        },
        ['.'],
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error creating bundle: "${error.message.trim()}"`);
      }

      throw new Error(`Error creating bundle: "${error}"`);
    }

    return targetTarballPath;
  }

  public async createInstance(image: string, variables: string[]): Promise<Docker.Container> {
    try {
      await this.image.pullImage(image);

      if (variables.length) {
        ui.text(`Initializing container with variables:`);
        variables.map((variable) => ui.text(`- ${variable}`));
      }

      const container = await this.docker.createContainer({
        Tty: true,
        Env: variables,
        Image: image,
        WorkingDir: '/runner',
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

  public async removeInstance(container: Docker.Container) {
    ui.box('Cleanup');
    ui.text('Stopping and removing container...');

    await container.stop();
    await container.remove();

    ui.text('Container stopped and removed');
  }

  public async runInstanceScript(
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
        ui.text(`Script failed with error: "${err.message}"`, { fg: 'red' });

        await this.removeInstance(container);

        process.exit();
      });

      stream.on('end', async () => {
        const result = await exec.inspect();

        if (result.ExitCode !== 0) {
          ui.text(`Script failed with code "${result.ExitCode}"`, { fg: 'red' });

          await this.removeInstance(container);

          process.exit();
        } else {
          ui.text('Script executed successfully', { fg: 'green' });

          resolve();
        }
      });
    });
  }
}
