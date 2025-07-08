import type { Step } from '@/types';

import * as ui from '@/lib/ui';

import { Instance } from './instance';
import { Environment } from './environment';
import { Configuration } from './configuration';

type RunnerOptions = {
  name: string;
  environment: Environment;
  configuration: Configuration;
};

export class Runner {
  private name: string;

  private instance: Instance;
  private environment: Environment;
  private configuration: Configuration;

  constructor(options: RunnerOptions) {
    this.name = options.name;
    this.environment = options.environment;
    this.configuration = options.configuration;

    this.instance = new Instance();
  }

  private async runPipelineStep(step: Step) {
    ui.text(`\n[Running Step: "${step.name || 'Unknown'}"]`, { bold: true });

    if (!step.script.length) {
      ui.text('Step script is empty');
      ui.text('Exiting...');

      process.exit();
    }

    ui.box('Setup');

    const defaultImage = this.configuration.getDefaultImage();

    if (!step.image) ui.text(`No image found for this step, using default: "${defaultImage}"`);

    const image = step.image || defaultImage;
    const variables = this.environment.getContainerFormatVariables();

    const stepInstance = await this.instance.createInstance(image, variables);

    await stepInstance.start();

    ui.text('Container started');
    ui.box('Scripts');

    for (const [index, script] of step.script.entries()) {
      await this.instance.runInstanceScript(stepInstance, script, index + 1, step.script.length);
    }

    await this.instance.removeInstance(stepInstance);
  }

  public async runPipelineSteps() {
    const pipeline = this.configuration.getPipelineByName(this.name);

    ui.text(`[Starting Pipeline: "${this.name}"]`, { bold: true });

    await this.instance.checkAvailability();

    ui.text('Starting steps...');

    for (const { step } of pipeline) {
      if (!step) {
        ui.text('No step found');
        ui.text('Exiting...');

        process.exit();
      }

      await this.runPipelineStep(step);
    }
  }
}
