import { Configuration } from './modules/configuration';
import { Runner } from './modules/runner';

const DEFAULT_TEMPLATE_PATH = 'bitbucket-pipelines.yml';

const configuration = new Configuration({ path: DEFAULT_TEMPLATE_PATH });

const pipeline = configuration.getPipelineByName('default');
const defaultImage = configuration.getDefaultImage();

const runner = new Runner({ pipeline, defaultImage });

(async () => {
  await runner.checkDockerAvailability();
  await runner.runPipelineSteps();

  // console.log(JSON.stringify(pipeline, null, 2));
})();

// [usage]
// - create a new instance of the Configuration class
// - create a new instance of the Runner class passing the selected Pipeline by the user
// - check if Docker is available, if not, exit the process
// - run the Pipeline steps, which will be a series of Docker commands
// - each step will be executed in the same container, so we need to keep the container running
// - we need to pass the variables to the container, so we need to create a volume for that
