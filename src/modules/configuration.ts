import fs from 'fs';
import yaml from 'js-yaml';
import { z } from 'zod';
import lodash from 'lodash';

import type { Template, Pipeline } from '@/types/index.js';

const DEFAULT_BITBUCKET_IMAGE = 'atlassian/default-image:4';

// Zod Schemas
const StepSchema = z.object({
  name: z.string().optional(),
  image: z.string().optional(),
  script: z.array(z.string()),
  artifacts: z.array(z.string()).optional(),
});

const PipelineStepSchema = z.object({
  step: StepSchema,
});

const PipelineSchema = z.array(PipelineStepSchema);

const PipelinesSchema = z.object({
  default: PipelineSchema.optional(),
  tags: z.record(z.string(), PipelineSchema).optional(),
  custom: z.record(z.string(), PipelineSchema).optional(),
  branches: z.record(z.string(), PipelineSchema).optional(),
  'pull-requests': z.record(z.string(), PipelineSchema).optional(),
});

const TemplateSchema = z.object({
  image: z.string().optional(),
  pipelines: PipelinesSchema,
  options: z.any().optional(),
  clone: z.any().optional(),
  definitions: z.any().optional(),
});

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
      const rawConfig = yaml.load(fs.readFileSync(options.path, 'utf8'));
      this.configuration = TemplateSchema.parse(rawConfig) as Template;
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        throw new Error(`Template file "${options.path}" is not valid YAML: ${error.message}`);
      }
      if (error instanceof z.ZodError) {
        const issues = error.issues
          .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
          .join('\n');
        throw new Error(`Template file "${options.path}" is invalid:\n${issues}`);
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
