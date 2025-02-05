import * as env from 'dotenv';

import { FILE_PATH_REGEX, VARIABLES_LIST_REGEX } from '@/lib/regex';

type EnvironmentOptions = {
  variables: string;
};

export class Environment {
  // private variables: Record<string, string>;

  constructor(options: EnvironmentOptions) {
    if (options.variables) {
      this.setupVariables(options.variables);
    }
  }

  private setupVariables(variables: string) {
    const isFilePath = FILE_PATH_REGEX.test(variables);
    const isManualVariables = VARIABLES_LIST_REGEX.test(variables);

    console.log({ isFilePath, isManualVariables });

    if (isFilePath) {
      const vars = this.loadVariablesFromFile(variables);

      console.log({ vars });
    }

    if (!isManualVariables) {
      // Throw error
    }

    // const vars = this.parseManualVariables(variables);

    // this.variables = vars;
  }

  private loadVariablesFromFile(path: string) {
    const vars = env.parse(path);
    return vars;
  }

  // private parseManualVariables(variables: string) {}
}
