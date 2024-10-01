import Docker from 'dockerode';

import fs from 'fs';
import path from 'path';

import * as tar from 'tar';

import * as logger from '@/lib/logger';
import chalk from 'chalk';
import { Stream } from 'stream';

export class Container {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  public async checkDockerAvailability() {
    try {
      await this.docker.ping();
    } catch {
      throw new Error('Docker is not running, or you do not have permission to access it');
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
      await tar.c(
        {
          gzip: true,
          file: tarBallPath,
          cwd: path.join(currentDir, 'example'),
        },
        ['.'],
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error creating tarball: "${error.message.trim()}"`);
      }

      throw new Error(`Error creating tarball: "${error}"`);
    }

    return tarBallPath;
  }

  private async createContainerImage(image: string) {
    // logger.info(`Checking if image "${image}" is available`);
    console.log(chalk.blue(`┆ Checking if image "${image}" is available`));

    const isImageAvailable = await this.checkImageAvailability(image);

    if (isImageAvailable) {
      // logger.info('Image already exists, skipping pull');
      console.log(chalk.blue(`┆ Image already exists, skipping pull`));
      return;
    }

    // logger.warning('Image not found, pulling it from the registry');
    console.log(chalk.blue(`┆ Image not found, pulling it from the registry`));

    try {
      const stream = await this.docker.pull(image, {});

      return new Promise<void>((resolve) => {
        this.docker.modem.followProgress(stream, (error) => {
          if (error) {
            // logger.error(`Error pulling image: "${error.message.trim()}"`);
            console.log(chalk.red(`┆ Error pulling image: "${error.message.trim()}"`));
            process.exit();
          }

          // logger.success('Image pulled successfully');
          console.log(chalk.green(`┆ Image pulled successfully`));

          resolve();
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        // logger.error(`Error pulling image: "${error.message.trim()}"`);
        console.log(chalk.red(`┆ Error pulling image: "${error.message.trim()}"`));
      } else {
        // logger.error(`Error pulling image: "${error}"`);
        console.log(chalk.red(`┆ Error pulling image: "${error}"`));
      }

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

      // logger.debug(`Created container with ID: ${container.id.substring(0, 6)}...${container.id.slice(-6)}`);
      console.log(chalk.blue(`┆ Created container with ID: ${container.id.substring(0, 6)}...${container.id.slice(-6)}`));

      const tarBallPath = await this.createDirectoryBundle();
      const tarStream = fs.createReadStream(tarBallPath);

      await container.putArchive(tarStream, { path: '/runner' });

      // logger.debug('Project files copied to container');
      console.log(chalk.blue(`┆ Project files copied to container`));

      fs.unlinkSync(tarBallPath);
      fs.rmdirSync(path.join(process.cwd(), '.buckety'));

      return container;
    } catch (error) {
      if (error instanceof Error) {
        // logger.error(`Error creating container: "${error.message.trim()}"`);
        console.log(chalk.red(`┆ Error creating container: "${error.message.trim()}"`));
      } else {
        // logger.error(`Error creating container: "${error}"`);
        console.log(chalk.red(`┆ Error creating container: "${error}"`));
      }

      process.exit();
    }
  }

  public async stopAndRemoveContainer(container: Docker.Container) {
    console.log(chalk.blue(`┆ ┌──────────────────────────────┐`));
    console.log(chalk.blue(`┆ │ Cleanup                      │`));
    console.log(chalk.blue(`┆ └──────────────────────────────┘`));

    // logger.debug('Stopping and removing container');
    console.log(chalk.blue(`┆ Stopping and removing container`));

    await container.stop();
    await container.remove();

    // logger.debug('Container stopped and removed');
    console.log(chalk.blue(`┆ Container stopped and removed`));
    console.log(chalk.blue(`◉`));
  }

  public async runContainerScript(container: Docker.Container, script: string): Promise<void> {
    const sanitizedScript = script.replace(/\n/g, '; ');

    // logger.info(`Running script: "${sanitizedScript}"`);
    console.log(chalk.blue(`┆ ┌ Running script: "${sanitizedScript}"`));

    const exec = await container.exec({
      Cmd: ['bash', '-c', script],
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    });

    // console.log(chalk.blue(`┆ ◈`));

    const stream = await exec.start({});

    return new Promise<void>((resolve) => {
      const writeStream = new Stream.Writable();

      writeStream._write = (chunk, _encoding, callback) => {
        const output = chunk.toString().trim().replace(/\n/g, chalk.blue(`\n┆ │ `));

        if (output) {
          // logger.info(output);
          console.log(chalk.blue(`┆ │ ${chalk.green(output)}`));
        }

        callback();
      };

      this.docker.modem.demuxStream(stream, writeStream, writeStream);

      stream.on('error', async (err) => {
        console.log(chalk.blue(`┆ ◈`));

        // logger.error(`Error executing script: \n\n${err.message}`);
        console.log(chalk.red(`┆ Error executing script: \n\n${err.message}`));

        await this.stopAndRemoveContainer(container);

        process.exit();
      });

      stream.on('end', async () => {
        const result = await exec.inspect();

        if (result.ExitCode !== 0) {
          console.log(chalk.blue(`┆ ◈`));

          // logger.error(`Script failed with exit code "${result.ExitCode}"`);
          console.log(chalk.blue(`┆ ${chalk.red(`Script failed with exit code "${result.ExitCode}"`)}`));

          await this.stopAndRemoveContainer(container);

          process.exit();
        } else {
          // console.log(chalk.blue(`┆ ◈`));
          // logger.success('Script executed successfully');
          console.log(chalk.blue(`┆ └ Script executed successfully`));

          resolve();
        }
      });
    });
  }
}
