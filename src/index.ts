import { Command } from 'commander';

import { setupRunCommand } from './commands/index.js';

const program = new Command();

program
  .name('buckety')
  .description('A simple CLI for running Bitbucket Pipelines locally')
  .version('1.0.0');

setupRunCommand(program);

program.parse(process.argv);
