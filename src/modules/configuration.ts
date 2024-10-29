import fs from 'fs';
import get from 'lodash/get';
import yaml from 'js-yaml';

import * as ui from '@/lib/ui';

import type { Template, Pipeline } from '@/types';

const DEFAULT_BITBUCKET_IMAGE = 'atlassian/default-image:4';

interface ConfigurationOptions {
  path: string;
}

export class Configuration {
  private configuration: Template;

  constructor(options: ConfigurationOptions) {
    if (!fs.existsSync(options.path)) {
      ui.text(`Template file "${options.path}" does not exist`, { fg: 'red' });
      ui.text('Exiting...');

      process.exit();
    }

    try {
      this.configuration = yaml.load(fs.readFileSync(options.path, 'utf8')) as Template;
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        ui.text(`Template file "${options.path}" is not valid YAML: ${error.message}\n`, {
          fg: 'red',
        });

        ui.text('Exiting...');

        process.exit();
      }

      ui.text(`Failed to load template file "${options.path}"`, { fg: 'red' });
      ui.text('Exiting...');

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
      ui.text(`Pipeline "${name}" does not exist`, { fg: 'red' });
      ui.text('Exiting...');

      process.exit();
    }

    return pipelineConfig;
  }
}
