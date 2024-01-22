import { Template } from './template';
import { Runner } from './runner';

const template = new Template({
  path: 'bitbucket-pipelines.yml',
});

const pipeline = template.getPipelineByName('default');

console.log(pipeline);
