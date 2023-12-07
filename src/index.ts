import { Command } from 'commander';

import Docker from 'dockerode';
import crypto from 'crypto';

import fs from 'fs';
import get from 'lodash/get';
import yaml from 'js-yaml';
import chalk from 'chalk';

import { version } from '../package.json';

import { IPipelineStepConfig, IRunOptions, ITemplate } from '@/types';

const program = new Command();

const error = (message: string) => {
  const level = chalk.bgRed(chalk.black(' ERROR '));
  const error = chalk.redBright(message);
  program.error(`\n${level} ${error}\n`);
};

program.name('Buckety').version(version).description('A simple CLI for managing your Bitbucket Pipelines');

program
  .command('run')
  .description('Run a pipeline or step')
  .argument('<type>', 'The type of trigger [step|pipeline]')
  .argument('<name>', 'The step or pipeline name to run')
  .option('-t, --template <template>', 'The template file to use', 'bitbucket-pipelines.yml')
  .option('-e, --env <variables>', 'Environment variables to pass, comma separated (e.g. KEY1=VALUE1,KEY2=VALUE2)')
  .option('-ef, --env-file <env-file>', 'Environment variables to pass to the pipeline from a file')
  .option('-dr, --dry-run', 'Dry run the pipeline', false)
  .action(async (type: 'step' | 'pipeline', name: string, options: IRunOptions) => {
    const { template, env, envFile, dryRun } = options;

    if (!fs.existsSync(template)) error(`Template file ${chalk.underline(template)} does not exist`);

    try {
      const { pipelines } = yaml.load(fs.readFileSync(template, 'utf8')) as ITemplate;

      if (type === 'pipeline') {
        if (!pipelines) error(`Template file ${chalk.underline(template)} does not contain any pipelines to run`);

        const pipelinePath = name.replace(':', '.');
        const pipelineSteps = get(pipelines, pipelinePath) as IPipelineStepConfig[];

        if (!pipelineSteps) error(`Pipeline ${chalk.underline(name)} does not exist`);

        const docker = new Docker();

        console.log(chalk.green(`Running Pipeline: ${chalk.bold(name)}\n`));
        console.log(chalk.grey(`──────────────────────────────\n`));

        for (const { step } of pipelineSteps) {
          const stepID = crypto.randomBytes(4).toString('hex');

          const { name, script, image } = step;

          if (name) console.log(chalk.blue(`Step 1: ${name}\n`));

          console.log(chalk.blue(`╭──────────────────────────────╮`));
          console.log(chalk.blue(`│ Build Setup                  │`));
          console.log(chalk.blue(`╰──────────────────────────────╯\n`));

          if (image) {
            console.log(`> Pulling image: ${image}`);

            docker.pull(image, {}, (err, stream) => {
              if (err) error(err.message);

              docker.modem.followProgress(stream, async (err) => {
                if (err) error(err.message);

                console.log(`> Pulled image: ${image}\n`);
                console.log(`> Creating container`);

                try {
                  const isAlpineImage = image.includes('alpine');

                  const container = await docker.createContainer({
                    Image: image,
                    name: `buckety.${stepID}`,
                    Tty: true,
                    OpenStdin: true,
                    StdinOnce: true,
                    Cmd: isAlpineImage ? ['/bin/sh'] : ['/bin/bash'],
                    // Env: env ? env.split(',') : undefined, @todo: add support for env vars
                  });

                  console.log(`> Created container: ${container.id}\n`);
                  console.log(`> Starting container: ${container.id}`);

                  await container.start();

                  console.log(`> Started container: ${container.id}\n`);

                  console.log(chalk.blue(`╭──────────────────────────────╮`));
                  console.log(chalk.blue(`│ Build Script                 │`));
                  console.log(chalk.blue(`╰──────────────────────────────╯\n`));

                  if (script.length) {
                    for (const line of script) {
                      const exec = await container.exec({
                        Cmd: [line.trim()],
                        AttachStdout: true,
                        AttachStderr: true,
                      });
                    }
                  }

                  // const exec = await container.exec({
                  //   Cmd: script,
                  //   AttachStdout: true,
                  //   AttachStderr: true,
                  // });

                  await container.stop();
                  await container.remove();
                } catch (err: any) {
                  error(err.message);
                  // console.log(chalk.blue(`╭──────────────────────────────╮`));
                  // console.log(chalk.blue(`│ Build Script                 │`));
                  // console.log(chalk.blue(`╰──────────────────────────────╯\n`));
                  // if (script) {
                  //   console.log(`> Running script: ${script}\n`);
                  //   docker.run(image, script, process.stdout, {}, {}, (err, data) => {
                  //     if (err) error(err.message);
                  //     console.log(data.StatusCode);
                  //     console.log(data);
                  //   });
                  // }
                  // });
                }
              });
            });
          }
        }
      } else {
        error('Step execution is not yet supported');
      }
    } catch (err) {
      if (err instanceof yaml.YAMLException) error(err.message);
      error(err as string);
    }
  });

program.parse();
