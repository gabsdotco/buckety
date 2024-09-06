import fs from 'fs';
import get from 'lodash/get';
import yaml from 'js-yaml';
import chalk from 'chalk';

import * as logger from '@/lib/logger';

import type { Template, Pipeline } from '@/types';

const DEFAULT_BITBUCKET_IMAGE = 'atlassian/default-image';

interface ConfigurationOptions {
  path: string;
}

export class Configuration {
  private configuration: Template;

  constructor(options: ConfigurationOptions) {
    if (!fs.existsSync(options.path)) {
      logger.error(`Template file ${chalk.underline(options.path)} does not exist`);
      process.exit();
    }

    try {
      this.configuration = yaml.load(fs.readFileSync(options.path, 'utf8')) as Template;
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
    return this.configuration.image || DEFAULT_BITBUCKET_IMAGE;
  }

  public getPipelineByName(name: string) {
    const pipelinePath = name.replace(':', '.');
    const pipelineConfig = get(this.configuration.pipelines, pipelinePath) as Pipeline;

    if (!pipelineConfig) {
      logger.error(`Pipeline ${chalk.underline(name)} does not exist`);
      process.exit();
    }

    return pipelineConfig;
  }
}
