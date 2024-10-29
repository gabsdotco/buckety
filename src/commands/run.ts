import { Command } from 'commander';

import { Runner } from '@/modules/runner';
import { Configuration } from '@/modules/configuration';

const DEFAULT_PIPELINE_NAME = 'default';
const DEFAULT_TEMPLATE_PATH = './bitbucket-pipelines.yml';

type RunOptions = {
  template: string;
};

export const setupRunCommand = (program: Command) =>
  program
    .command('run')
    .argument('[pipeline]', 'Name of the Bitbucket Pipeline to run', DEFAULT_PIPELINE_NAME)
    .description('Run a Bitbucket Pipeline locally')
    .option(
      '-t, --template [path]',
      'Path to the Bitbucket Pipelines template file',
      DEFAULT_TEMPLATE_PATH,
    )
    .action((pipelineName: string, options: RunOptions) => {
      const { template } = options;

      const configuration = new Configuration({ path: template });

      const pipeline = configuration.getPipelineByName(pipelineName);
      const defaultImage = configuration.getDefaultImage();

      const runner = new Runner({ pipeline, pipelineName, defaultImage });

      (async () => await runner.runPipelineSteps())();
    });