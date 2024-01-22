interface RunnerOptions {
  image?: string;
  variables?: string[];
  defaultImage?: string;
}

export class Runner {
  private image: string;
  private variables: string[];

  constructor(options: RunnerOptions) {
    this.image = options.image;
    this.variables = options.variables || [];
  }
}
