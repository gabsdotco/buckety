import { Command } from 'commander';

import { version } from '../package.json';

import { setupRunCommand } from './commands';

const program = new Command();

program
  .name('buckety')
  .description('A simple CLI for running Bitbucket Pipelines locally')
  .version(version);

setupRunCommand(program);

program.parse(process.argv);
