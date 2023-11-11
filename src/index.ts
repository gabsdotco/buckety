import { Command } from 'commander';

import fs from 'fs';
import yaml from 'js-yaml';
import chalk from 'chalk';

import { version } from '../package.json';

import { Template } from '@/types';

const program = new Command();

const error = (message: string) => {
  const level = chalk.bgRed(chalk.black(' ERROR '));
  const error = chalk.redBright(message);
  program.error(`${level} ${error}\n`);
};

program.name('Buckety').version(version).description('A simple CLI for managing your Bitbucket Pipelines');

program
  .command('run')
  .description('Run a pipeline or step')
  .argument('<type>', 'The type of trigger [step|pipeline]')
  .argument('<name>', 'The step or pipeline name to run')
  .option('-t, --template <template>', 'The template to use', 'bitbucket-pipelines.yml')
  .option('-e, --env <variables>', 'Environment variables to pass, comma separated (e.g. KEY1=VALUE1,KEY2=VALUE2)')
  .option('-ef, --env-file <env-file>', 'Environment variables to pass to the pipeline from a file')
  .option('-dr, --dry-run', 'Dry run the pipeline', false)
  .action((type: 'step' | 'pipeline', name: string, options) => {
    const { template, env, envFile, dryRun } = options;

    console.log({ type, name, template, env, envFile, dryRun });

    if (!fs.existsSync(template)) error(`Template (--template) file ${chalk.underline(template)} does not exist`);

    try {
      const { pipelines, definitions } = yaml.load(fs.readFileSync(template, 'utf8')) as Template;
      console.log({ pipelines, definitions });
    } catch (err) {
      if (err instanceof yaml.YAMLException) error(err.message);
      error(err as string);
    }
  });

program.parse();
