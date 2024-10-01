import * as logger from '@/lib/logger';

import type { Pipeline, Step } from '@/types';

import { Container } from './container';

import chalk from 'chalk';

interface RunnerOptions {
  pipeline: Pipeline;
  defaultImage: string;
}

export class Runner {
  private pipeline: Pipeline;
  private container: Container;
  private defaultImage: string;

  constructor(options: RunnerOptions) {
    this.pipeline = options.pipeline;
    this.defaultImage = options.defaultImage;

    this.container = new Container();
  }

  private async executeStep(step: Step) {
    // logger.info(`Running step: ${step.name || 'Unknown'}`);
    console.log(chalk.blue(`◉ Running step: ${step.name || 'Unknown'}`));

    if (!step.script.length) {
      logger.error('Step script is empty');
      process.exit(1);
    }

    console.log(chalk.blue(`┆ ┌──────────────────────────────┐`));
    console.log(chalk.blue(`┆ │ Setup                        │`));
    console.log(chalk.blue(`┆ └──────────────────────────────┘`));

    const image = step.image || this.defaultImage;

    const container = await this.container.createAndSetupContainer(image);

    await container.start();

    // logger.debug('Container started');
    console.log(chalk.blue(`┆ Container started`));

    console.log(chalk.blue(`┆ ┌──────────────────────────────┐`));
    console.log(chalk.blue(`┆ │ Scripts                      │`));
    console.log(chalk.blue(`┆ └──────────────────────────────┘`));

    for (const script of step.script) {
      await this.container.runContainerScript(container, script);
    }

    await this.container.stopAndRemoveContainer(container);
  }

  public async runPipelineSteps() {
    await this.container.checkDockerAvailability();

    for (const { step } of this.pipeline) {
      if (!step) {
        // logger.error('Step is undefined');
        console.log(chalk.red(`┆ Step is undefined`));
        process.exit(1);
      }

      await this.executeStep(step);
    }
  }
}
