import type { Pipeline, Step } from '@/types';

import * as ui from '@/lib/ui';

import { Container } from './container';

type RunnerOptions = {
  pipeline: Pipeline;
  pipelineName: string;
  defaultImage: string;
};

export class Runner {
  private pipeline: Pipeline;
  private pipelineName: string;
  private defaultImage: string;

  private container: Container;

  constructor(options: RunnerOptions) {
    this.pipeline = options.pipeline;
    this.pipelineName = options.pipelineName;
    this.defaultImage = options.defaultImage;

    this.container = new Container();
  }

  private async executeStep(step: Step) {
    ui.text(`\n[Running Step: "${step.name || 'Unknown'}"]`, { bold: true });

    if (!step.script.length) {
      ui.text('Step script is empty');
      ui.text('Exiting...');

      process.exit();
    }

    ui.box('Setup');

    if (!step.image) {
      ui.text(`No image found, using default: "${this.defaultImage}"`);
    }

    const image = step.image || this.defaultImage;

    const container = await this.container.createAndSetupContainer(image);

    await container.start();

    ui.text('Container started');
    ui.box('Scripts');

    for (const [index, script] of step.script.entries()) {
      await this.container.runContainerScript(container, script, index + 1, step.script.length);
    }

    await this.container.stopAndRemoveContainer(container);
  }

  public async runPipelineSteps() {
    ui.text(`[Starting Pipeline: "${this.pipelineName}"]`, { bold: true });
    ui.text('Checking Docker availability...');

    await this.container.checkDockerAvailability();

    ui.text('Docker is available');
    ui.text('Starting steps...');

    for (const { step } of this.pipeline) {
      if (!step) {
        ui.text('No step found');
        ui.text('Exiting...');

        process.exit();
      }

      await this.executeStep(step);
    }
  }
}
