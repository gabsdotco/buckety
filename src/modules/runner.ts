import type { Step } from '@/types/step.js';

import * as ui from '@/lib/ui.js';

import { Instance } from './instance.js';
import { Artifacts } from './artifacts.js';
import { Environment } from './environment.js';
import { Configuration } from './configuration.js';

type RunnerOptions = {
  name: string;
  environment: Environment;
  configuration: Configuration;
};

export class Runner {
  private name: string;

  private instance: Instance;
  private artifacts: Artifacts;
  private environment: Environment;
  private configuration: Configuration;

  constructor(options: RunnerOptions) {
    this.name = options.name;
    this.environment = options.environment;
    this.configuration = options.configuration;

    this.instance = new Instance();
    this.artifacts = new Artifacts();
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

    if (!step.image) {
      ui.text(`- No image found for this step, using default: "${defaultImage}"`);
    }

    const image = step.image || defaultImage;
    const artifacts = step.artifacts || [];

    const variables = this.environment.getContainerFormatVariables();

    const stepInstance = await this.instance.createInstance(image, variables);

    await stepInstance.start();

    ui.text('- Container started');

    await this.artifacts.uploadArtifacts(stepInstance);

    ui.box('Scripts');

    for (const [stepScriptIndex, stepScript] of step.script.entries()) {
      await this.instance.runInstanceScript(
        stepInstance,
        stepScript,
        stepScriptIndex + 1,
        step.script.length,
      );
    }

    await this.artifacts.generateArtifacts(stepInstance, artifacts);
    await this.instance.removeInstance(stepInstance);
  }

  public async runPipelineSteps() {
    const pipeline = this.configuration.getPipelineByName(this.name);

    ui.text(`[Starting Pipeline: "${this.name}"]`, { bold: true });

    await this.instance.checkAvailability();

    ui.text('- Starting pipeline steps...');

    for (const { step } of pipeline) {
      if (!step) {
        ui.text('- No step found in the pipeline', { fg: 'red' });
        ui.text('- Exiting from the application...');

        process.exit();
      }

      await this.runPipelineStep(step);
    }
  }
}
