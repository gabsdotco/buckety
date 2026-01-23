import fs from 'fs';
import yaml from 'js-yaml';

import lodash from 'lodash';

import type { Template, Pipeline } from '@/types/index.js';

const DEFAULT_BITBUCKET_IMAGE = 'atlassian/default-image:4';

interface ConfigurationOptions {
  path: string;
}

export class Configuration {
  private configuration: Template;

  constructor(options: ConfigurationOptions) {
    if (!fs.existsSync(options.path)) {
      throw new Error(`Template file "${options.path}" does not exist`);
    }

    try {
      this.configuration = yaml.load(fs.readFileSync(options.path, 'utf8')) as Template;
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        throw new Error(`Template file "${options.path}" is not valid YAML: ${error.message}`);
      }

      throw new Error(`Failed to load template file "${options.path}"`);
    }
  }

  public getDefaultImage() {
    return this.configuration.image || DEFAULT_BITBUCKET_IMAGE;
  }

  public getPipelineByName(name: string) {
    const pipelinePath = name.replace(':', '.');
    const pipelineConfig = lodash.get(this.configuration.pipelines, pipelinePath) as Pipeline;

    if (!pipelineConfig) {
      throw new Error(`Pipeline "${name}" does not exist`);
    }

    return pipelineConfig;
  }

  public getPipelineStepNames(name: string): string[] {
    const pipeline = this.getPipelineByName(name);
    return pipeline.map(({ step }) => step?.name || 'Unknown').filter(Boolean);
  }

  public getAvailablePipelines(): string[] {
    const pipelines: string[] = [];
    const pipelinesConfig = this.configuration.pipelines;

    if (pipelinesConfig.default) {
      pipelines.push('default');
    }

    if (pipelinesConfig.branches) {
      for (const branch of Object.keys(pipelinesConfig.branches)) {
        pipelines.push(`branches:${branch}`);
      }
    }

    if (pipelinesConfig.tags) {
      for (const tag of Object.keys(pipelinesConfig.tags)) {
        pipelines.push(`tags:${tag}`);
      }
    }

    if (pipelinesConfig.custom) {
      for (const custom of Object.keys(pipelinesConfig.custom)) {
        pipelines.push(`custom:${custom}`);
      }
    }

    if (pipelinesConfig['pull-requests']) {
      for (const pr of Object.keys(pipelinesConfig['pull-requests'])) {
        pipelines.push(`pull-requests:${pr}`);
      }
    }

    return pipelines;
  }
}
