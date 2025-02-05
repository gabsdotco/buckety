import { Command } from 'commander';

import { Runner } from '@/modules/runner';
import { Configuration } from '@/modules/configuration';
import { Environment } from '@/modules/environment';

const DEFAULT_PIPELINE_NAME = 'default';
const DEFAULT_TEMPLATE_PATH = './example/bitbucket-pipelines.yml';

type RunOptions = {
  template: string;
  variables: string;
};

export const setupRunCommand = (program: Command) =>
  program
    .command('run')
    .argument('[pipeline]', 'Name of the Bitbucket Pipeline to run', DEFAULT_PIPELINE_NAME)
    .description('Run a Bitbucket Pipeline locally')
    .option('-v, --variables [values]', 'Comma-separated variables to be injected on the Pipeline')
    .option(
      '-t, --template [path]',
      'Path to the Bitbucket Pipelines template file',
      DEFAULT_TEMPLATE_PATH,
    )
    .action(async (pipelineName: string, options: RunOptions) => {
      const { template, variables } = options;

      if (variables) {
        console.log({ variables });

        const env = new Environment({
          variables,
        });
      }

      return;

      const configuration = new Configuration({ path: template });

      const pipeline = configuration.getPipelineByName(pipelineName);
      const defaultImage = configuration.getDefaultImage();

      const runner = new Runner({ pipeline, pipelineName, defaultImage });

      // (async () => await runner.runPipelineSteps())();
      await runner.runPipelineSteps();
    });
