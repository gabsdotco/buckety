import { Command } from 'commander';

import { Runner } from '@/modules/runner.js';
import { Environment } from '@/modules/environment.js';
import { Configuration } from '@/modules/configuration.js';
import { EventEmitterReporter } from '@/lib/reporter.js';
import { pipelineEvents, CommandEvent } from '@/lib/events.js';
import { startTUI, showPipelinePicker } from '@/tui/index.js';

const DEFAULT_TEMPLATE_PATH = './bitbucket-pipelines.yml';

type RunOptions = {
  template: string;
  variables: string;
};

export const setupRunCommand = (program: Command) =>
  program
    .command('run')
    .argument('[pipeline]', 'Name of the Bitbucket Pipeline to run')
    .description('Run a Bitbucket Pipeline locally')
    .option(
      '-v, --variables [values|path]',
      'Comma-separated variables to be injected on the Pipeline',
    )
    .option(
      '-t, --template [path]',
      'Path to the Bitbucket Pipelines template file',
      DEFAULT_TEMPLATE_PATH,
    )
    .action(async (pipelineArg: string | undefined, options: RunOptions) => {
      const { template: path, variables } = options;

      // Load configuration to get available pipelines
      const configuration = new Configuration({ path });

      let pipelineName = pipelineArg;

      // If no pipeline specified, show picker
      if (!pipelineName) {
        const availablePipelines = configuration.getAvailablePipelines();

        if (availablePipelines.length === 0) {
          console.error('No pipelines found in the configuration file');
          process.exit(1);
        }

        if (availablePipelines.length === 1) {
          // Only one pipeline, use it directly
          pipelineName = availablePipelines[0];
        } else {
          // Show picker
          const selected = await showPipelinePicker(availablePipelines);

          if (!selected) {
            // User cancelled
            process.exit(0);
          }

          pipelineName = selected;
        }
      }

      // Start the TUI
      const { waitUntilExit } = await startTUI(pipelineName);

      const environment = new Environment({ variables });
      const reporter = new EventEmitterReporter();
      const controller = new AbortController();

      const cancelListener = (event: CommandEvent) => {
        if (event.type === 'cancel:pipeline') {
          controller.abort();
        }
      };
      pipelineEvents.onCommand(cancelListener);

      const runner = new Runner({
        name: pipelineName,
        environment,
        configuration,
        reporter,
      });

      try {
        await runner.runPipelineSteps(controller.signal);
      } catch {
        // TUI will show the error through events
        // Keep TUI running so user can see the error
      } finally {
        pipelineEvents.offCommand(cancelListener);
      }

      // Wait for user to quit TUI (press 'q')
      await waitUntilExit();
    });
