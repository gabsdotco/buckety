import fs from 'fs';
import get from 'lodash/get';
import yaml from 'js-yaml';
import chalk from 'chalk';

import * as logger from '@/lib/logger';

import { IPipelineStepConfig, ITemplate } from '@/types';

interface ITemplateOptions {
  path: string;
}

export class Template {
  private definitions!: ITemplate;

  constructor(options: ITemplateOptions) {
    if (!fs.existsSync(options.path)) {
      logger.error(`Template file ${chalk.underline(options.path)} does not exist`);
      process.exit();
    }

    try {
      this.definitions = yaml.load(fs.readFileSync(options.path, 'utf8')) as ITemplate;
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        logger.error(`Template file ${chalk.underline(options.path)} is not valid YAML: ${error.message}\n`);
        process.exit();
      }

      logger.error(`Failed to load template file ${chalk.underline(options.path)}`);
      process.exit();
    }
  }

  public getDefaultImage() {
    return this.definitions.image;
  }

  public getPipelineByName(name: string) {
    const pipelinePath = name.replace(':', '.');
    const pipelineConfig = get(this.definitions.pipelines, pipelinePath) as IPipelineStepConfig[];

    if (!pipelineConfig) {
      logger.error(`Pipeline ${chalk.underline(name)} does not exist`);
      process.exit();
    }

    return pipelineConfig;
  }
}
