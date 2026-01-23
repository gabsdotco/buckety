import type { Step } from '@/types/step.js';

import { pipelineEvents } from '@/lib/events.js';
import type { CommandEvent } from '@/lib/events.js';
import type { Reporter } from '@/types/reporter.js';

import { Instance } from './instance.js';
import { Artifacts } from './artifacts.js';
import { Environment } from './environment.js';
import { Configuration } from './configuration.js';

type RunnerOptions = {
  name: string;
  environment: Environment;
  configuration: Configuration;
  reporter: Reporter;
};

export class Runner {
  private name: string;

  private instance: Instance;
  private artifacts: Artifacts;
  private environment: Environment;
  private configuration: Configuration;
  private reporter: Reporter;
  private dockerChecked: boolean = false;
  private isRunning: boolean = false;

  constructor(options: RunnerOptions) {
    this.name = options.name;
    this.environment = options.environment;
    this.configuration = options.configuration;
    this.reporter = options.reporter;

    this.instance = new Instance(this.reporter);
    this.artifacts = new Artifacts(this.reporter);

    // Listen for rerun commands
    this.setupCommandListener();
  }

  private setupCommandListener() {
    const handleCommand = async (event: CommandEvent) => {
      if (this.isRunning) {
        this.reporter.emit({ type: 'info', message: 'Pipeline is already running' });
        return;
      }

      if (event.type === 'rerun:pipeline') {
        await this.rerunPipeline();
      } else if (event.type === 'rerun:step') {
        const stepName = event.data?.stepName as string | undefined;
        if (stepName) {
          await this.rerunStep(stepName);
        }
      }
    };

    pipelineEvents.onCommand(handleCommand);
  }

  private reset() {
    this.dockerChecked = false;
    this.isRunning = false;
  }

  private async rerunPipeline() {
    this.reset();
    try {
      await this.runPipelineSteps();
    } catch {
      // Error is emitted through events
    }
  }

  private async rerunStep(stepName: string) {
    this.reset();
    const pipeline = this.configuration.getPipelineByName(this.name);
    const stepConfig = pipeline.find(({ step }) => step?.name === stepName);

    if (!stepConfig?.step) {
      this.reporter.emit({
        type: 'error',
        error: new Error(`Step "${stepName}" not found`),
      });
      return;
    }

    // Emit pipeline start for UI reset
    const stepNames = this.configuration.getPipelineStepNames(this.name);
    this.reporter.emit({ type: 'pipeline:start' });
    this.reporter.emit({ type: 'pipeline:steps', data: { steps: stepNames } });

    try {
      await this.runPipelineStep(stepConfig.step);
      this.reporter.emit({ type: 'pipeline:complete' });
    } catch {
      // Error is emitted through events
    }
  }

  private async runPipelineStep(step: Step) {
    const stepName = step.name || 'Unknown';
    this.reporter.emit({ type: 'step:start', data: { stepName } });

    if (!step.script.length) {
      const error = new Error(`Step "${stepName}" has no scripts to run`);
      this.reporter.emit({ type: 'step:error', data: { stepName }, error });
      throw error;
    }

    this.reporter.emit({ type: 'info', message: 'Setting up step...' });

    // Check Docker availability on first step (part of setup)
    if (!this.dockerChecked) {
      await this.instance.checkAvailability();
      this.dockerChecked = true;
    }

    const defaultImage = this.configuration.getDefaultImage();

    if (!step.image) {
      this.reporter.emit({
        type: 'info',
        message: `No image found for this step, using default: "${defaultImage}"`,
      });
    }

    const image = step.image || defaultImage;
    const artifacts = step.artifacts || [];

    const variables = this.environment.getContainerFormatVariables();

    const stepInstance = await this.instance.createInstance(image, variables);

    await stepInstance.start();

    this.reporter.emit({ type: 'instance:started' });

    await this.artifacts.uploadArtifacts(stepInstance);

    this.reporter.emit({ type: 'info', message: 'Running scripts...' });

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

    this.reporter.emit({ type: 'step:complete', data: { stepName } });
  }

  public async runPipelineSteps() {
    this.isRunning = true;

    try {
      const pipeline = this.configuration.getPipelineByName(this.name);
      const stepNames = this.configuration.getPipelineStepNames(this.name);

      this.reporter.emit({ type: 'pipeline:start' });
      this.reporter.emit({ type: 'pipeline:steps', data: { steps: stepNames } });

      for (const { step } of pipeline) {
        if (!step) {
          const error = new Error('No step found in the pipeline');
          this.reporter.emit({ type: 'error', error });
          throw error;
        }

        await this.runPipelineStep(step);
      }

      this.reporter.emit({ type: 'pipeline:complete' });
    } finally {
      this.isRunning = false;
    }
  }
}
