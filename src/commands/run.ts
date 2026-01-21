import { Command } from 'commander';

import { Runner } from '@/modules/runner.js';
import { Environment } from '@/modules/environment.js';
import { Configuration } from '@/modules/configuration.js';

const DEFAULT_PIPELINE_NAME = 'default';
const DEFAULT_TEMPLATE_PATH = './bitbucket-pipelines.yml';

type RunOptions = {
  template: string;
  variables: string;
};

export const setupRunCommand = (program: Command) =>
  program
    .command('run')
    .argument('[pipeline]', 'Name of the Bitbucket Pipeline to run', DEFAULT_PIPELINE_NAME)
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
    .action(async (name: string, options: RunOptions) => {
      const { template: path, variables } = options;

      const environment = new Environment({ variables });
      const configuration = new Configuration({ path });

      const runner = new Runner({
        name,
        environment,
        configuration,
      });

      await runner.runPipelineSteps();
    });
