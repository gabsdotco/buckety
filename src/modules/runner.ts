import Docker from 'dockerode';
import path from 'path';

import fs from 'fs';

import * as tar from 'tar';

import * as logger from '@/lib/logger';

import type { Pipeline, Step } from '@/types';

interface RunnerOptions {
  pipeline: Pipeline;
  defaultImage: string;
}

export class Runner {
  private docker: Docker;
  private pipeline: Pipeline;
  private defaultImage: string;

  constructor(options: RunnerOptions) {
    this.pipeline = options.pipeline;
    this.defaultImage = options.defaultImage;

    this.docker = new Docker();
  }

  public async checkDockerAvailability() {
    try {
      await this.docker.ping();
    } catch {
      logger.error('Docker is not running, or you do not have permission to access it');
      process.exit();
    }
  }

  private async checkImageAvailability(image: string) {
    const availableImages = await this.docker.listImages();
    const imageInfo = availableImages.find((availableImage) => availableImage.RepoTags?.includes(image));

    return !!imageInfo;
  }

  private async createDirectoryBundle() {
    const currentDirectory = process.cwd();
    const tarBallPath = path.join(currentDirectory, '/.buckety/project.tar');

    // create .buckety directory if it doesn't exist
    if (!fs.existsSync(path.join(currentDirectory, '/.buckety'))) {
      fs.mkdirSync(path.join(currentDirectory, '/.buckety'));
    }

    await tar.c(
      {
        gzip: true,
        file: tarBallPath,
        cwd: path.join(currentDirectory, '/example'),
      },
      ['.'],
    );

    return tarBallPath;
  }

  private async createStepImage(step: Step) {
    const image = step.image || this.defaultImage;

    const isImageAvailable = await this.checkImageAvailability(image);

    if (!isImageAvailable) {
      logger.warning(`Image not found, pulling it from the registry: ${image}`);

      await new Promise<void>((resolve) => {
        this.docker.pull(image, {}, (error, stream) => {
          if (error || !stream) {
            logger.error('Something went wrong trying to pull the image');
            process.exit();
          }

          this.docker.modem.followProgress(stream, (error) => {
            if (error) {
              logger.error('Something went wrong trying to pull the image');
              process.exit();
            }

            resolve();
          });
        });
      });

      logger.success('Image pulled successfully');
    } else {
      logger.info('Image already exists on the system, skipping pull');
    }
  }

  private async createStepContainer(step: Step) {
    const image = step.image || this.defaultImage;

    logger.debug('Creating step container');

    if (!step.script.length) {
      logger.error('Step script is empty');
      process.exit;
    }

    try {
      const container = await this.docker.createContainer({
        Image: image,
        WorkingDir: '/runner',
        Tty: true,
      });

      logger.debug(`Created container with ID: ${container.id}`);
      logger.debug('Cloning the project to the container');

      const tarBallPath = await this.createDirectoryBundle();
      const tarStream = fs.createReadStream(tarBallPath);

      await container.putArchive(tarStream, {
        path: '/runner',
      });

      logger.debug('Project successfully cloned to the container');

      fs.unlinkSync(tarBallPath);
      fs.rmdirSync(path.join(process.cwd(), '/.buckety'));

      logger.debug('Starting the container');

      await container.start();

      for (const script of step.script) {
        logger.info(`Running script: ${script}`);

        // if (script.startsWith('export')) {
        //   logger.warning('Export command detected. Currently not supported by Buckety, the command will be skipped');
        //   continue;
        // }

        await new Promise<void>((resolve) => {
          container.exec(
            {
              Cmd: ['bash', '-c', script],
              AttachStdout: true,
              AttachStderr: true,
              Tty: true,
            },
            (error, exec) => {
              if (error || !exec) {
                logger.error('Something went wrong trying to run the step');
                process.exit();
              }

              exec.start({}, (error, stream) => {
                if (error || !stream) {
                  logger.error('Something went wrong trying to run the step');
                  process.exit();
                }

                this.docker.modem.demuxStream(stream, process.stdout, process.stderr);

                stream.on('end', () => {
                  logger.success('Script executed successfully');
                  resolve();
                });
              });
            },
          );
        });
      }

      logger.debug('Container started');
      logger.debug('Attaching to the container');

      logger.debug('Waiting for the container to stop');

      await container.stop();

      logger.debug('Container stopped');
      logger.debug('Removing the container');

      await container.remove();

      logger.debug('Container removed');
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Something went wrong trying to run the step: ${error.message} `);
      } else {
        logger.error('Something went wrong trying to run the step');
      }

      process.exit();
    }
  }

  public async runPipelineSteps() {
    for (const { step } of this.pipeline) {
      logger.log(JSON.stringify({ step }));

      if (!step) {
        logger.error('Step is not defined');
        process.exit();
      }

      logger.info(`Running step with name: ${step.name || 'Unknown'} `);

      await this.createStepImage(step);
      await this.createStepContainer(step);
    }
  }
}
