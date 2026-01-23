import fs from 'node:fs';

import * as env from 'dotenv';

import { FILE_PATH_REGEX, VARIABLES_LIST_REGEX } from '@/lib/regex.js';

type EnvironmentOptions = {
  variables: string;
};

export class Environment {
  public variables: Record<string, string> = {};

  constructor(options: EnvironmentOptions) {
    if (options.variables) {
      this.setupVariables(options.variables);
    }
  }

  public getContainerFormatVariables() {
    const varsKeys = Object.keys(this.variables);

    if (varsKeys.length) {
      const varsEntries = Object.entries(this.variables);
      return varsEntries.map(([key, value]) => `${key}=${value}`);
    }

    return [];
  }

  private setupVariables(variables: string) {
    const isFilePath = FILE_PATH_REGEX.test(variables);
    const isManualVariables = VARIABLES_LIST_REGEX.test(variables);

    if (!isFilePath && !isManualVariables) {
      throw new Error(
        'The "--variables" parameter must be a valid path or comma separated key-value',
      );
    }

    if (isFilePath) {
      const vars = this.loadVariablesFromFile(variables);
      this.variables = vars;
    }

    if (isManualVariables) {
      const vars = this.parseManualVariables(variables);
      this.variables = vars;
    }
  }

  private loadVariablesFromFile(filePath: string) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Variables file not found: ${filePath}`);
    }

    const file = fs.readFileSync(filePath);
    const vars = env.parse(file);

    return vars;
  }

  private parseManualVariables(variables: string) {
    const parsedVars: Record<string, string> = {};

    variables.split(',').forEach((pair) => {
      const trimmed = pair.trim();

      if (!trimmed) return;

      const [rawKey, ...rawValueParts] = trimmed.split('=');

      const key = rawKey?.trim();
      const value = rawValueParts.join('=').trim();

      parsedVars[key] = value;
    });

    return parsedVars;
  }
}
