export interface Step {
  name?: string;
  image?: string;
  script: string[];
  artifacts?: string[];
}
